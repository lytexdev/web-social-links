import type { H3Event } from 'h3'
import { SlidingWindowLimiter } from './ratelimit'
import { getSetting } from './settings'
import { mediaFileName, variantsOf, type MediaRow } from './media'
import { apiError } from '../utils/http'
import type { Usage } from './usage'

const uploads = new SlidingWindowLimiter(30, 60 * 60_000)

export function presentMedia(row: MediaRow, usages: Usage[] = []) {
  const variants = variantsOf(row)
  const preview = variants.widths.find((width) => width >= 192) ?? variants.widths.at(-1) ?? 48
  const icon = variants.widths.find((width) => width >= 48) ?? variants.widths.at(-1) ?? 48
  return {
    id: row.id,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    alt: row.alt,
    decorative: row.decorative,
    animated: row.animated,
    dominantColor: row.dominantColor,
    createdAt: row.createdAt,
    preview: `/media/${mediaFileName(row.id, variants.hash, preview, 'webp')}`,
    icon: `/media/${mediaFileName(row.id, variants.hash, icon, 'webp')}`,
    usages: usages.filter((usage) => usage.kind !== 'published'),
    published: usages.some((usage) => usage.kind === 'published'),
  }
}

export async function readUpload(
  event: H3Event,
  userId: string,
): Promise<{ data: Buffer; type: string | undefined; allowAnimation: boolean }> {
  const limit = uploads.hit(userId)
  if (!limit.allowed) {
    throw apiError(429, 'rate_limited', 'Too many uploads', {
      retryAfter: Math.ceil(limit.retryAfterMs / 1000),
    })
  }
  const parts = await readMultipartFormData(event)
  const file = parts?.find((part) => part.name === 'file' && part.data.length > 0)
  if (!file) throw apiError(422, 'file_missing', 'No file in the request')
  return { data: file.data, type: file.type, allowAnimation: getSetting('site').animatedImages }
}
