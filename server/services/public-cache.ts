import type { PageModel } from '../../shared/types/public'
import { buildPageModel, nextBoundary } from './render'
import { latestSnapshot, onPublish } from './publish'

interface Entry {
  model: PageModel
  expiresAt: number
}

const cache = new Map<string, Entry>()
onPublish(() => cache.clear())

export function cachedPageModel(
  source: string,
  origin: string,
  path: string,
  now = Date.now(),
): PageModel | null {
  const snapshot = latestSnapshot()
  if (!snapshot) return null
  const key = `${snapshot.revision}|${source}|${path}`
  const hit = cache.get(key)
  if (hit && hit.expiresAt > now) return hit.model
  const model = buildPageModel(snapshot, { source, now, origin, path, preview: false })
  if (cache.size > 500) cache.clear()
  cache.set(key, { model, expiresAt: nextBoundary(snapshot, now) })
  return model
}
