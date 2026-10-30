import { DIRECT_SOURCE } from '../../../shared/constants/platforms'
import { latestSnapshot } from '../../services/publish'
import { resolveLinkTarget, withUtm } from '../../services/render'
import { sourceKeys } from '../../services/sources'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const snapshot = latestSnapshot()
  if (!/^[A-Za-z0-9_-]{12}$/.test(id) || !snapshot)
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  const target = resolveLinkTarget(snapshot, id, Date.now())
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  const requested = getQuery(event).s
  const source =
    typeof requested === 'string' && sourceKeys().has(requested) ? requested : DIRECT_SOURCE
  event.context.redirectClick = { linkId: id, slug: null, source }
  const url = target.appendUtm
    ? withUtm(target.url, {
        source: snapshot.settings.analytics.utmSource,
        medium: snapshot.settings.analytics.utmMedium,
        fallbackSource: source,
      })
    : target.url
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return sendRedirect(event, url, 302)
})
