import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileTypeFromBuffer } from 'file-type'
import sharp, { type Metadata, type Stats } from 'sharp'
import { desc, eq } from 'drizzle-orm'
import { useDb } from '../db/client'
import { media } from '../db/schema'
import { useEnv } from '../utils/env'
import { apiError } from '../utils/http'
import { recordAudit } from './audit'
import { randomId } from './crypto'

sharp.cache(false)
sharp.concurrency(1)

export const MEDIA_WIDTHS = [48, 96, 144, 192, 288, 480, 960, 1440] as const
const MAX_PIXELS = 40_000_000
const MAX_FRAMES = 100
const MAX_SVG_BYTES = 1_048_576
const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
])
const ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
}

export interface MediaVariants {
  hash: string
  widths: number[]
  formats: Array<'avif' | 'webp'>
  og: boolean
}

export type MediaRow = typeof media.$inferSelect

function mediaDir(): string {
  return join(useEnv().dataDir, 'media')
}

export function variantsOf(row: Pick<MediaRow, 'variants'>): MediaVariants {
  return row.variants as MediaVariants
}

export function mediaFileName(
  id: string,
  hash: string,
  size: number | 'og',
  format: string,
): string {
  return `${id}-${hash}-${size}.${format}`
}

function looksLikeSvg(buffer: Buffer): boolean {
  const head = buffer
    .subarray(0, 1024)
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .trimStart()
  return /^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head)
}

const SVG_FORBIDDEN = [
  /<!DOCTYPE/i,
  /<!ENTITY/i,
  /<script/i,
  /<foreignObject/i,
  /<(iframe|embed|object|audio|video|use)\b/i,
  /\son[a-z]+\s*=/i,
  /(?:xlink:)?href\s*=\s*["']\s*(?!#|data:image\/(png|jpeg|gif|webp);base64,)/i,
  /url\(\s*["']?\s*(?!#|data:image\/(png|jpeg|gif|webp);base64,)/i,
  /@import/i,
]

export function svgIsSafe(source: string): boolean {
  return !SVG_FORBIDDEN.some((pattern) => pattern.test(source))
}

export async function detectImageType(
  buffer: Buffer,
  declared: string | undefined,
): Promise<string> {
  const detected =
    (await fileTypeFromBuffer(buffer))?.mime ?? (looksLikeSvg(buffer) ? 'image/svg+xml' : null)
  if (!detected || !ALLOWED.has(detected)) {
    throw apiError(
      415,
      'unsupported_type',
      'Only JPEG, PNG, WebP, AVIF, GIF and SVG images are accepted',
    )
  }
  const normalized = declared ? (ALIASES[declared.toLowerCase()] ?? declared.toLowerCase()) : null
  if (normalized && normalized !== 'application/octet-stream' && normalized !== detected) {
    throw apiError(415, 'type_mismatch', 'The file content does not match its type')
  }
  return detected
}

interface Processed {
  hash: string
  width: number
  height: number
  bytes: number
  animated: boolean
  dominantColor: string | null
  files: Array<{ name: string; data: Buffer }>
  variants: MediaVariants
}

function hex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0')
}

export async function processImage(
  buffer: Buffer,
  mime: string,
  allowAnimation: boolean,
): Promise<Processed> {
  if (mime === 'image/svg+xml') {
    if (buffer.length > MAX_SVG_BYTES || !svgIsSafe(buffer.toString('utf8'))) {
      throw apiError(
        422,
        'svg_rejected',
        'The SVG contains scripts, external references or entities',
      )
    }
  }
  const base = { limitInputPixels: MAX_PIXELS, failOn: 'warning' as const, sequentialRead: true }
  let probe: Metadata
  try {
    probe = await sharp(buffer, {
      ...base,
      density: mime === 'image/svg+xml' ? 192 : undefined,
    }).metadata()
  } catch {
    throw apiError(422, 'image_invalid', 'The image could not be read or is too large')
  }
  const frames = probe.pages ?? 1
  const animated =
    allowAnimation &&
    frames > 1 &&
    frames <= MAX_FRAMES &&
    (mime === 'image/gif' || mime === 'image/webp')
  const input = () =>
    sharp(buffer, {
      ...base,
      animated,
      density: mime === 'image/svg+xml' ? 192 : undefined,
    }).rotate()

  let oriented: { width: number; height: number }
  let stats: Stats
  try {
    const normalized = await input().toBuffer({ resolveWithObject: true })
    oriented = {
      width: normalized.info.width,
      height: animated
        ? (normalized.info.pageHeight ?? normalized.info.height)
        : normalized.info.height,
    }
    stats = await sharp(normalized.data, { animated: false, limitInputPixels: MAX_PIXELS }).stats()
  } catch {
    throw apiError(422, 'image_invalid', 'The image could not be read or is too large')
  }

  const widths = MEDIA_WIDTHS.filter((width) => width <= oriented.width)
  if (widths.length === 0) widths.push(oriented.width as (typeof MEDIA_WIDTHS)[number])
  const formats: Array<'avif' | 'webp'> = animated ? ['webp'] : ['avif', 'webp']
  const outputs: Array<{ width: number; format: 'avif' | 'webp'; data: Buffer }> = []
  for (const width of widths) {
    for (const format of formats) {
      const pipeline = input().resize({ width, withoutEnlargement: true })
      const data =
        format === 'avif'
          ? await pipeline.avif({ quality: 55, effort: 4 }).toBuffer()
          : await pipeline
              .webp({ quality: 80, effort: 4, ...(animated ? { loop: 0 } : {}) })
              .toBuffer()
      outputs.push({ width, format, data })
    }
  }
  const master =
    outputs.filter((output) => output.format === 'webp').at(-1)?.data ?? Buffer.alloc(0)
  const hash = createHash('sha256').update(master).digest('hex')
  const short = hash.slice(0, 8)
  const og = await sharp(buffer, {
    ...base,
    animated: false,
    density: mime === 'image/svg+xml' ? 192 : undefined,
  })
    .rotate()
    .resize({ width: 1200, height: 630, fit: 'cover' })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()

  return {
    hash,
    width: oriented.width,
    height: oriented.height,
    bytes: outputs.reduce((sum, output) => sum + output.data.length, 0) + og.length,
    animated,
    dominantColor: `#${hex(stats.dominant.r)}${hex(stats.dominant.g)}${hex(stats.dominant.b)}`,
    files: [
      ...outputs.map((output) => ({
        name: mediaFileName('{id}', short, output.width, output.format),
        data: output.data,
      })),
      { name: mediaFileName('{id}', short, 'og', 'jpg'), data: og },
    ],
    variants: { hash: short, widths: [...widths], formats, og: true },
  }
}

async function writeFiles(id: string, processed: Processed): Promise<void> {
  await mkdir(mediaDir(), { recursive: true })
  for (const file of processed.files) {
    await writeFile(join(mediaDir(), file.name.replace('{id}', id)), file.data, { mode: 0o640 })
  }
}

async function removeFiles(row: MediaRow): Promise<void> {
  const variants = variantsOf(row)
  const names = [
    ...variants.widths.flatMap((width) =>
      variants.formats.map((format) => mediaFileName(row.id, variants.hash, width, format)),
    ),
    ...(variants.og ? [mediaFileName(row.id, variants.hash, 'og', 'jpg')] : []),
  ]
  for (const name of names) await rm(join(mediaDir(), name), { force: true })
}

export async function storeUpload(
  buffer: Buffer,
  declared: string | undefined,
  options: { allowAnimation: boolean; userId: string | null },
): Promise<{ row: MediaRow; duplicate: boolean }> {
  const mime = await detectImageType(buffer, declared)
  const processed = await processImage(buffer, mime, options.allowAnimation)
  const db = useDb()
  const existing = db.select().from(media).where(eq(media.sha256, processed.hash)).get()
  if (existing) return { row: existing, duplicate: true }
  const id = randomId()
  await writeFiles(id, processed)
  const row: MediaRow = {
    id,
    sha256: processed.hash,
    width: processed.width,
    height: processed.height,
    bytes: processed.bytes,
    variants: processed.variants,
    alt: '',
    decorative: false,
    dominantColor: processed.dominantColor,
    animated: processed.animated,
    createdAt: Date.now(),
  }
  db.insert(media).values(row).run()
  recordAudit(options.userId, 'upload', 'media', id)
  return { row, duplicate: false }
}

export async function replaceMedia(
  id: string,
  buffer: Buffer,
  declared: string | undefined,
  options: { allowAnimation: boolean; userId: string | null },
): Promise<MediaRow> {
  getMedia(id)
  const mime = await detectImageType(buffer, declared)
  const processed = await processImage(buffer, mime, options.allowAnimation)
  const duplicate = useDb().select().from(media).where(eq(media.sha256, processed.hash)).get()
  if (duplicate && duplicate.id !== id)
    throw apiError(409, 'media_duplicate', 'This image already exists in the library')
  await writeFiles(id, processed)
  useDb()
    .update(media)
    .set({
      sha256: processed.hash,
      width: processed.width,
      height: processed.height,
      bytes: processed.bytes,
      variants: processed.variants,
      dominantColor: processed.dominantColor,
      animated: processed.animated,
    })
    .where(eq(media.id, id))
    .run()
  recordAudit(options.userId, 'replace', 'media', id)
  return getMedia(id)
}

export function getMedia(id: string): MediaRow {
  const row = useDb().select().from(media).where(eq(media.id, id)).get()
  if (!row) throw apiError(404, 'not_found', 'Media not found')
  return row
}

export function listMedia(): MediaRow[] {
  return useDb().select().from(media).orderBy(desc(media.createdAt)).all()
}

export function updateMediaText(
  id: string,
  patch: { alt?: string; decorative?: boolean },
  userId: string,
): MediaRow {
  getMedia(id)
  useDb().update(media).set(patch).where(eq(media.id, id)).run()
  recordAudit(userId, 'update', 'media', id)
  return getMedia(id)
}

export async function deleteMediaRow(id: string, userId: string): Promise<void> {
  const row = getMedia(id)
  useDb().delete(media).where(eq(media.id, id)).run()
  await removeFiles(row)
  recordAudit(userId, 'delete', 'media', id)
}

export async function purgeOrphanedFiles(keep: ReadonlySet<string>): Promise<void> {
  const { readdir } = await import('node:fs/promises')
  for (const name of await readdir(mediaDir())) {
    if (!keep.has(name)) await rm(join(mediaDir(), name), { force: true })
  }
}

export function expectedFileNames(): Set<string> {
  const names = new Set<string>()
  for (const row of listMedia()) {
    const variants = variantsOf(row)
    for (const width of variants.widths)
      for (const format of variants.formats)
        names.add(mediaFileName(row.id, variants.hash, width, format))
    if (variants.og) names.add(mediaFileName(row.id, variants.hash, 'og', 'jpg'))
  }
  return names
}
