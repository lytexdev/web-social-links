import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { useEnv } from '../../utils/env'

const FILE = /^[A-Za-z0-9_-]{12}-[0-9a-f]{8}-(\d{1,4}|og)\.(avif|webp|jpg)$/
const TYPES: Record<string, string> = { avif: 'image/avif', webp: 'image/webp', jpg: 'image/jpeg' }

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'file') ?? ''
  const match = FILE.exec(name)
  if (!match) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  const path = join(useEnv().dataDir, 'media', name)
  const info = await stat(path).catch(() => null)
  if (!info?.isFile()) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  setResponseHeaders(event, {
    'Content-Type': TYPES[match[2] ?? 'webp'] ?? 'application/octet-stream',
    'Content-Length': String(info.size),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Cross-Origin-Resource-Policy': match[1] === 'og' ? 'cross-origin' : 'same-origin',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  })
  if (event.method === 'HEAD') return null
  return sendStream(event, createReadStream(path))
})
