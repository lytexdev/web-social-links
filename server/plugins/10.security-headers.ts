import { buildDocumentCsp } from '../utils/csp'
import { routeKind } from '../utils/route-kind'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    if (typeof response.body !== 'string') return
    const path = event.path.split('?')[0] ?? ''
    const preview = path === '/admin/preview'
    const admin = routeKind(path) === 'admin-page'
    response.headers ??= {}
    response.headers['content-security-policy'] = buildDocumentCsp(response.body, {
      framable: preview,
      embeds: admin && !preview,
    })
    response.headers['x-frame-options'] = preview ? 'SAMEORIGIN' : 'DENY'
    if (admin) response.headers['cache-control'] = 'no-store'
    else response.headers['cache-control'] = 'no-cache'
  })
})
