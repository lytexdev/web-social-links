import { draftChanges } from '../../../services/kv'
import { buildSnapshot, latestSnapshot } from '../../../services/publish'

export default defineEventHandler(async () => {
  const { issues } = await buildSnapshot('publish')
  const latest = latestSnapshot()
  return {
    draftChanges: draftChanges(),
    revision: latest?.revision ?? 0,
    publishedAt: latest?.publishedAt ?? null,
    issues,
  }
})
