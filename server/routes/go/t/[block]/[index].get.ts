import { DIRECT_SOURCE } from '../../../../../shared/constants/platforms'
import { latestSnapshot } from '../../../../services/publish'
import { resolveTextLink } from '../../../../services/render'
import { sourceKeys } from '../../../../services/sources'

export default defineEventHandler((event) => {
  const block = getRouterParam(event, 'block') ?? ''
  const index = getRouterParam(event, 'index') ?? ''
  const snapshot = latestSnapshot()
  if (!/^[A-Za-z0-9_-]{12}$/.test(block) || !/^\d{1,3}$/.test(index) || !snapshot) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  const url = resolveTextLink(snapshot, block, Number(index), Date.now())
  if (!url) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  const requested = getQuery(event).s
  const source =
    typeof requested === 'string' && sourceKeys().has(requested) ? requested : DIRECT_SOURCE
  event.context.redirectClick = { linkId: block, blockId: block, slug: null, source }
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return sendRedirect(event, url, 302)
})
