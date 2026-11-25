import { createHash } from 'node:crypto'
import { desc, eq, notInArray } from 'drizzle-orm'
import { strFromU8, unzipSync } from 'fflate'
import { BRANCH_PATTERN, GITHUB_REPOSITORY } from '../../shared/schemas/settings'
import type { ReferenceDoc, ReferenceSyncStatus } from '../../shared/types/references'
import { useDb } from '../db/client'
import { referenceDocs } from '../db/schema'
import { useEnv } from '../utils/env'
import { logger } from '../utils/logger'
import { kvGet, kvSet } from './kv'
import { REFERENCE_PATH, parseReference } from './references-parse'
import { getSetting } from './settings'

const ARCHIVE_ORIGIN = 'https://codeload.github.com'
const MAX_ARCHIVE_BYTES = 25 * 1_048_576
const MAX_FILE_BYTES = 1_048_576
const MAX_TOTAL_BYTES = 60 * 1_048_576
const MAX_FILES = 3000
const STATUS_KEY = 'references_sync'
const DAY_MS = 86_400_000

export class ReferenceSyncError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'ReferenceSyncError'
  }
}

export interface ReferenceFile {
  path: string
  text: string
}

const EMPTY_STATUS: ReferenceSyncStatus = {
  at: null,
  ok: false,
  error: null,
  documents: 0,
  added: 0,
  updated: 0,
  removed: 0,
  skipped: 0,
}

let cache: ReferenceDoc[] | null = null
let running: Promise<ReferenceSyncStatus> | null = null

export function referenceDocsList(): ReferenceDoc[] {
  cache ??= useDb()
    .select({ doc: referenceDocs.doc })
    .from(referenceDocs)
    .orderBy(desc(referenceDocs.published), referenceDocs.slug)
    .all()
    .map((row) => row.doc as ReferenceDoc)
  return cache
}

export function findReference(slug: string): ReferenceDoc | undefined {
  return referenceDocsList().find((doc) => doc.slug === slug)
}

export function resetReferenceCache(): void {
  cache = null
}

export function referenceStatus(): ReferenceSyncStatus {
  const raw = kvGet(STATUS_KEY)
  if (!raw) return { ...EMPTY_STATUS, documents: referenceDocsList().length }
  try {
    return { ...EMPTY_STATUS, ...(JSON.parse(raw) as Partial<ReferenceSyncStatus>) }
  } catch {
    return { ...EMPTY_STATUS }
  }
}

export function archiveUrl(repository: string, branch: string, origin = ARCHIVE_ORIGIN): string {
  const match = GITHUB_REPOSITORY.exec(repository)
  if (!match?.[1] || !match[2] || !BRANCH_PATTERN.test(branch)) {
    throw new ReferenceSyncError('repository_invalid')
  }
  const ref = branch
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
  return `${origin}/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}/zip/refs/heads/${ref}`
}

function archiveOrigin(): string {
  const override = process.env.REFERENCES_ARCHIVE_ORIGIN
  return !useEnv().production && override ? override.replace(/\/+$/, '') : ARCHIVE_ORIGIN
}

async function download(url: string): Promise<Uint8Array> {
  let response: Response
  try {
    response = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: { 'user-agent': 'web-social-links', accept: 'application/zip' },
    })
  } catch {
    throw new ReferenceSyncError('download_failed')
  }
  if (response.status === 404) throw new ReferenceSyncError('repository_not_found')
  if (!response.ok || !response.body) throw new ReferenceSyncError('download_failed')
  if (Number(response.headers.get('content-length') ?? 0) > MAX_ARCHIVE_BYTES) {
    throw new ReferenceSyncError('archive_too_large')
  }
  const chunks: Uint8Array[] = []
  let size = 0
  const reader = response.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_ARCHIVE_BYTES) {
      await reader.cancel()
      throw new ReferenceSyncError('archive_too_large')
    }
    chunks.push(value)
  }
  const buffer = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.byteLength
  }
  return buffer
}

export function readArchive(archive: Uint8Array): ReferenceFile[] {
  let total = 0
  let count = 0
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(archive, {
      filter: (file) => {
        const path = file.name.slice(file.name.indexOf('/') + 1)
        if (!REFERENCE_PATH.test(path) || file.originalSize > MAX_FILE_BYTES) return false
        total += file.originalSize
        count++
        if (total > MAX_TOTAL_BYTES || count > MAX_FILES) {
          throw new ReferenceSyncError('archive_too_large')
        }
        return true
      },
    })
  } catch (error) {
    if (error instanceof ReferenceSyncError) throw error
    throw new ReferenceSyncError('archive_invalid')
  }
  return Object.entries(entries)
    .map(([name, data]) => ({ path: name.slice(name.indexOf('/') + 1), text: strFromU8(data) }))
    .sort((a, b) => a.path.localeCompare(b.path))
}

export function applyReferences(
  files: ReferenceFile[],
  now = Date.now(),
): Omit<ReferenceSyncStatus, 'at' | 'ok' | 'error'> {
  const db = useDb()
  const existing = new Map(
    db
      .select({ slug: referenceDocs.slug, hash: referenceDocs.hash })
      .from(referenceDocs)
      .all()
      .map((row) => [row.slug, row.hash]),
  )
  const parsed: Array<{ doc: ReferenceDoc; hash: string }> = []
  const slugs = new Set<string>()
  let skipped = 0
  for (const file of files) {
    const doc = parseReference(file.path, file.text)
    if (!doc) {
      skipped++
      continue
    }
    let slug = doc.slug
    for (let suffix = 2; slugs.has(slug); suffix++) slug = `${doc.slug}-${suffix}`
    slugs.add(slug)
    const hash = createHash('sha256').update(`${slug}\n${file.path}\n${file.text}`).digest('hex')
    parsed.push({ doc: { ...doc, slug }, hash })
  }
  if (parsed.length === 0) throw new ReferenceSyncError('no_documents')

  let added = 0
  let updated = 0
  const keep = parsed.map((item) => item.doc.slug)
  const removed = [...existing.keys()].filter((slug) => !slugs.has(slug)).length
  db.transaction((tx) => {
    for (const { doc, hash } of parsed) {
      const previous = existing.get(doc.slug)
      if (previous === hash) continue
      const row = {
        path: doc.path,
        kind: doc.kind,
        published: doc.published,
        hash,
        doc,
        updatedAt: now,
      }
      if (previous === undefined) {
        tx.insert(referenceDocs)
          .values({ slug: doc.slug, ...row })
          .run()
        added++
      } else {
        tx.update(referenceDocs).set(row).where(eq(referenceDocs.slug, doc.slug)).run()
        updated++
      }
    }
    tx.delete(referenceDocs).where(notInArray(referenceDocs.slug, keep)).run()
  })
  resetReferenceCache()
  return { documents: parsed.length, added, updated, removed, skipped }
}

function saveStatus(status: ReferenceSyncStatus): ReferenceSyncStatus {
  kvSet(STATUS_KEY, JSON.stringify(status))
  return status
}

async function run(now: number): Promise<ReferenceSyncStatus> {
  const settings = getSetting('references')
  try {
    if (!settings.repository) throw new ReferenceSyncError('repository_missing')
    const url = archiveUrl(settings.repository, settings.branch, archiveOrigin())
    const counts = applyReferences(readArchive(await download(url)), now)
    logger.info('references_synced', { ...counts })
    return saveStatus({ at: now, ok: true, error: null, ...counts })
  } catch (error) {
    const code = error instanceof ReferenceSyncError ? error.code : 'sync_failed'
    if (!(error instanceof ReferenceSyncError)) logger.error('references_sync_failed', { error })
    else logger.warn('references_sync_failed', { code })
    const previous = referenceStatus()
    return saveStatus({
      ...EMPTY_STATUS,
      at: now,
      ok: false,
      error: code,
      documents: referenceDocsList().length,
      skipped: previous.skipped,
    })
  }
}

export function syncReferences(now = Date.now()): Promise<ReferenceSyncStatus> {
  running ??= run(now).finally(() => {
    running = null
  })
  return running
}

export function referencesDue(now = Date.now()): boolean {
  if (!getSetting('references').repository) return false
  const status = referenceStatus()
  return status.at === null || now - status.at >= DAY_MS - 60_000
}
