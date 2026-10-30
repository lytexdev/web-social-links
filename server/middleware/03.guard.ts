import { isTrapPath } from '../../shared/constants/routing'
import { activeBan, registerTrapHit } from '../services/bans'
import { useEnv } from '../utils/env'
import { clientIp } from '../utils/http'
import { isAdminKind, routeKind } from '../utils/route-kind'

export default defineEventHandler((event) => {
  const kind = routeKind(event.path)
  if (kind === 'health' || kind === 'internal') return
  const ip = clientIp(event)
  if (isTrapPath(event.path)) {
    registerTrapHit(ip, event.path, useEnv().banScope)
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  const ban = activeBan(ip)
  if (ban && (ban.scope === 'all' || isAdminKind(kind))) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
})
