import type { H3Event } from 'h3'
import { DIRECT_SOURCE } from '../../shared/constants/platforms'
import { RESERVED_SLUGS, SLUG_PATTERN } from '../../shared/constants/routing'
import { cachedPageModel } from '../services/public-cache'
import { buildDocumentModel, buildPageModel, resolveLinkTarget, withUtm } from '../services/render'
import { buildSnapshot, latestSnapshot, snapshotForRevision } from '../services/publish'
import { SESSION_COOKIE, readSession } from '../services/sessions'
import { findSlug } from '../services/sources'
import { useEnv } from '../utils/env'
import { routeKind } from '../utils/route-kind'

async function preview(event: H3Event): Promise<void> {
  const session = readSession(getCookie(event, SESSION_COOKIE))
  if (!session?.mfaPassed) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  const query = getQuery(event)
  const revision =
    typeof query.rev === 'string' && /^\d{1,6}$/.test(query.rev) ? Number(query.rev) : null
  const source =
    typeof query.source === 'string' && SLUG_PATTERN.test(query.source)
      ? query.source
      : DIRECT_SOURCE
  const snapshot = revision
    ? snapshotForRevision(revision)
    : (await buildSnapshot('preview')).snapshot
  if (!snapshot) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  event.context.publicModel = buildPageModel(snapshot, {
    source,
    now: Date.now(),
    origin: useEnv().publicOrigin,
    path: '/',
    preview: true,
  })
}

export default defineEventHandler(async (event) => {
  const method = event.method.toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') return
  const path = event.path.split('?')[0] ?? '/'
  if (path === '/admin/preview') return preview(event)
  if (routeKind(path) !== 'public-page') return

  const origin = useEnv().publicOrigin
  if (path === '/') {
    event.context.publicModel = cachedPageModel(DIRECT_SOURCE, origin, path) ?? undefined
    return
  }

  const snapshot = latestSnapshot()
  if (!snapshot) return

  if (path === '/impressum' || path === '/datenschutz') {
    const target = snapshot.settings.legal[path === '/impressum' ? 'impressum' : 'privacy']
    if (target.mode === 'url' && target.url) return sendRedirect(event, target.url, 302)
    event.context.publicModel =
      buildDocumentModel(snapshot, path.slice(1), { origin, path }) ?? undefined
    return
  }

  const custom = /^\/p\/([a-z0-9-]{1,32})$/.exec(path)
  if (custom?.[1]) {
    const model = buildDocumentModel(snapshot, custom[1], { origin, path })
    if (model && !['impressum', 'datenschutz'].includes(custom[1]))
      event.context.publicModel = model
    return
  }

  const slug = path.slice(1).toLowerCase()
  if (!SLUG_PATTERN.test(slug) || RESERVED_SLUGS.has(slug)) return
  const entry = findSlug(slug)
  if (!entry) return
  if (entry.kind === 'source' && entry.sourceKey) {
    event.context.viewSource = entry.sourceKey
    event.context.viewSlug = slug
    event.context.publicModel = cachedPageModel(entry.sourceKey, origin, path) ?? undefined
    return
  }
  if (entry.kind === 'redirect' && entry.linkId) {
    const target = resolveLinkTarget(snapshot, entry.linkId, Date.now())
    if (!target) return
    event.context.redirectClick = { linkId: entry.linkId, slug, source: DIRECT_SOURCE }
    const url = target.appendUtm
      ? withUtm(target.url, {
          source: snapshot.settings.analytics.utmSource,
          medium: snapshot.settings.analytics.utmMedium,
          fallbackSource: DIRECT_SOURCE,
        })
      : target.url
    setResponseHeader(event, 'Cache-Control', 'no-store')
    return sendRedirect(event, url, 302)
  }
})
