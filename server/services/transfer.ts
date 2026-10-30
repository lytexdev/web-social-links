import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate'
import { exportSchema, type ExportData } from '../../shared/schemas/export'
import { draftBlockData, type BlockType } from '../../shared/schemas/content'
import { SETTING_KEYS, settingsSchemas } from '../../shared/schemas/settings'
import { useDb } from '../db/client'
import { media as mediaTable, slugs, sources } from '../db/schema'
import { useEnv } from '../utils/env'
import { apiError } from '../utils/http'
import { recordAudit } from './audit'
import { activeRows, replaceAllBlocks } from './blocks'
import { markDraftChanged } from './kv'
import { listMedia, mediaFileName, storeUpload, variantsOf } from './media'
import { listPages, replaceAllPages } from './pages'
import { getAllSettings, writeSetting } from './settings'
import { listSlugs, listSources } from './sources'

const MAX_UNZIPPED = 200 * 1024 * 1024
const PLACEHOLDER = /^https?:\/\/example\.(com|org|net)\/replace/i

export async function exportArchive(): Promise<Buffer> {
  const files: Zippable = {}
  const mediaEntries: ExportData['media'] = []
  for (const row of listMedia()) {
    const variants = variantsOf(row)
    const width = variants.widths.at(-1) ?? row.width
    const name = mediaFileName(row.id, variants.hash, width, 'webp')
    const data = await readFile(join(useEnv().dataDir, 'media', name)).catch(() => null)
    if (!data) continue
    files[`media/${row.id}.webp`] = new Uint8Array(data)
    mediaEntries.push({
      id: row.id,
      alt: row.alt,
      decorative: row.decorative,
      file: `media/${row.id}.webp`,
    })
  }
  const data: ExportData = {
    format: 'web-social-links',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: getAllSettings(),
    blocks: activeRows().map((row) => ({
      id: row.id,
      parentId: row.parentId,
      type: row.type as BlockType,
      position: row.position,
      data: row.data as Record<string, unknown>,
      visible: row.visible,
      visibleFrom: row.visibleFrom,
      visibleUntil: row.visibleUntil,
    })),
    pages: listPages().map(({ id, slug, title, kind, markdown }) => ({
      id,
      slug,
      title,
      kind: kind as 'legal',
      markdown,
    })),
    sources: listSources().map(({ key, label, icon, preset }) => ({ key, label, icon, preset })),
    slugs: listSlugs().map(({ slug, kind, sourceKey, linkId, label }) => ({
      slug,
      kind: kind as 'source',
      sourceKey,
      linkId,
      label,
    })),
    media: mediaEntries,
  }
  files['export.json'] = strToU8(JSON.stringify(data, null, 2))
  return Buffer.from(zipSync(files, { level: 6 }))
}

interface ParsedImport {
  data: ExportData
  files: Map<string, Uint8Array>
}

export function parseImport(buffer: Buffer): ParsedImport {
  const files = new Map<string, Uint8Array>()
  let json: string
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    let total = 0
    let entries: Record<string, Uint8Array>
    try {
      entries = unzipSync(new Uint8Array(buffer), {
        filter: (file) => {
          total += file.originalSize
          if (total > MAX_UNZIPPED) throw new Error('archive too large')
          return file.name === 'export.json' || /^media\/[A-Za-z0-9_-]{12}\.webp$/.test(file.name)
        },
      })
    } catch {
      throw apiError(422, 'import_invalid', 'The archive could not be read')
    }
    for (const [name, data] of Object.entries(entries)) files.set(name, data)
    const manifest = files.get('export.json')
    if (!manifest) throw apiError(422, 'import_invalid', 'export.json is missing')
    json = strFromU8(manifest)
  } else {
    json = buffer.toString('utf8')
  }
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw apiError(422, 'import_invalid', 'The file is not valid JSON')
  }
  const result = exportSchema.safeParse(raw)
  if (!result.success) {
    throw apiError(422, 'import_invalid', 'The file does not match the export format', {
      issues: result.error.issues
        .slice(0, 20)
        .map((issue) => ({ path: issue.path.join('.'), code: issue.message })),
    })
  }
  return { data: result.data, files }
}

export interface ImportWarning {
  code: string
  target: string
}

export function previewImport(parsed: ParsedImport): {
  counts: Record<string, number>
  warnings: ImportWarning[]
} {
  const warnings: ImportWarning[] = []
  const { data } = parsed
  for (const block of data.blocks) {
    const result = draftBlockData[block.type].safeParse(block.data)
    if (!result.success) warnings.push({ code: 'block_invalid', target: block.id })
    const url = block.data.url
    if (typeof url === 'string' && PLACEHOLDER.test(url)) {
      warnings.push({
        code: 'placeholder_url',
        target: String(block.data.title ?? block.data.label ?? block.id),
      })
    }
  }
  for (const key of Object.keys(data.settings)) {
    if (!SETTING_KEYS.includes(key as never))
      warnings.push({ code: 'setting_unknown', target: key })
  }
  for (const entry of data.media) {
    if (!parsed.files.has(entry.file)) warnings.push({ code: 'media_missing', target: entry.id })
  }
  const ids = new Set(data.blocks.map((block) => block.id))
  for (const block of data.blocks) {
    if (block.parentId && !ids.has(block.parentId))
      warnings.push({ code: 'parent_missing', target: block.id })
  }
  return {
    counts: {
      blocks: data.blocks.length,
      pages: data.pages.length,
      sources: data.sources.length,
      slugs: data.slugs.length,
      media: data.media.length,
    },
    warnings,
  }
}

export async function applyImport(parsed: ParsedImport, userId: string): Promise<void> {
  const remap = new Map<string, string>()
  for (const entry of parsed.data.media) {
    const file = parsed.files.get(entry.file)
    if (!file) continue
    const { row } = await storeUpload(Buffer.from(file), 'image/webp', {
      allowAnimation: false,
      userId,
    })
    useDb()
      .update(mediaTable)
      .set({ alt: entry.alt, decorative: entry.decorative })
      .where(eq(mediaTable.id, row.id))
      .run()
    remap.set(entry.id, row.id)
  }
  let serialized = JSON.stringify({ settings: parsed.data.settings, blocks: parsed.data.blocks })
  for (const [from, to] of remap) serialized = serialized.split(from).join(to)
  const { settings, blocks } = JSON.parse(serialized) as Pick<ExportData, 'settings' | 'blocks'>
  const ids = new Set(blocks.map((block) => block.id))
  const validBlocks = blocks
    .filter((block) => !block.parentId || ids.has(block.parentId))
    .map((block) => {
      const result = draftBlockData[block.type].safeParse(block.data)
      return {
        ...block,
        data: (result.success ? result.data : draftBlockData[block.type].parse({})) as Record<
          string,
          unknown
        >,
      }
    })
  const db = useDb()
  db.transaction(() => {
    replaceAllBlocks(validBlocks)
    if (parsed.data.pages.length > 0) replaceAllPages(parsed.data.pages)
    for (const key of SETTING_KEYS) {
      if (!(key in settings)) continue
      const result = settingsSchemas[key].safeParse(settings[key])
      if (result.success) writeSetting(key, result.data as never)
    }
    if (parsed.data.sources.length > 0) {
      const now = Date.now()
      db.delete(slugs).run()
      db.delete(sources).run()
      for (const source of parsed.data.sources)
        db.insert(sources)
          .values({ ...source, createdAt: now })
          .run()
      const known = new Set(parsed.data.sources.map((source) => source.key))
      for (const slug of parsed.data.slugs) {
        if (slug.kind === 'source' && (!slug.sourceKey || !known.has(slug.sourceKey))) continue
        db.insert(slugs)
          .values({ ...slug, createdAt: now })
          .onConflictDoNothing()
          .run()
      }
    }
  })
  markDraftChanged()
  recordAudit(userId, 'import', 'content', null, `${validBlocks.length} blocks`)
}
