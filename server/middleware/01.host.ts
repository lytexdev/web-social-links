import { useEnv } from '../utils/env'
import { isAdminKind, routeKind } from '../utils/route-kind'

export default defineEventHandler((event) => {
  const kind = routeKind(event.path)
  if (kind === 'health' || kind === 'internal') return
  const env = useEnv()
  const host = (getRequestHeader(event, 'host') ?? '').toLowerCase()
  if (host === env.publicHost) return
  if (env.aliasHosts.has(host)) {
    return sendRedirect(event, `${env.publicOrigin}${event.path}`, 301)
  }
  if (env.adminHosts.has(host)) {
    if (isAdminKind(kind) || kind === 'asset') return
    return sendRedirect(event, `${env.publicOrigin}${event.path}`, 301)
  }
  setResponseStatus(event, 421)
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return 'Misdirected request'
})
