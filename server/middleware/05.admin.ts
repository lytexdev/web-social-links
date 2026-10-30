import { API_BODY_LIMIT } from '../../shared/constants/limits'
import { blockListHas } from '../utils/cidr'
import { useEnv } from '../utils/env'
import { apiError, clientIp } from '../utils/http'
import { routeKind } from '../utils/route-kind'
import { SlidingWindowLimiter } from '../services/ratelimit'
import { recordSecurityEvent } from '../services/security-events'
import { SESSION_COOKIE, readSession, verifyCsrfToken } from '../services/sessions'
import { getUser } from '../services/users'

const ANONYMOUS = new Set([
  'GET /api/admin/auth/form-token',
  'POST /api/admin/auth/login',
  'POST /api/admin/auth/totp',
])
const OPTIONAL_SESSION = new Set(['GET /api/admin/auth/me', 'POST /api/admin/auth/logout'])
const LARGE_BODY_PREFIXES = ['/api/admin/media']
const apiLimiter = new SlidingWindowLimiter(300, 60_000)
const rejectedIpLog = new SlidingWindowLimiter(1, 60_000)

function originAllowed(origin: string | undefined, fetchSite: string | undefined): boolean {
  const env = useEnv()
  if (!origin) return fetchSite === 'same-origin'
  try {
    const url = new URL(origin)
    return env.adminHosts.has(url.host.toLowerCase())
  } catch {
    return false
  }
}

export default defineEventHandler((event) => {
  const kind = routeKind(event.path)
  if (kind !== 'admin-page' && kind !== 'admin-api') return
  const env = useEnv()
  const ip = clientIp(event)
  const host = (getRequestHeader(event, 'host') ?? '').toLowerCase()
  if (!env.adminHosts.has(host)) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  if (env.adminIpAllowlist && !blockListHas(env.adminIpAllowlist, ip)) {
    if (rejectedIpLog.hit(ip).allowed) recordSecurityEvent('admin_ip_rejected', { ip })
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  if (kind === 'admin-page') return

  const method = event.method.toUpperCase()
  const pathname = event.path.split('?')[0] ?? ''
  const route = `${method} ${pathname}`
  const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(method)

  if (mutating) {
    if (
      !originAllowed(getRequestHeader(event, 'origin'), getRequestHeader(event, 'sec-fetch-site'))
    ) {
      recordSecurityEvent('csrf_rejected', { ip, meta: { reason: 'origin', route } })
      throw apiError(403, 'origin_rejected', 'Request origin is not allowed')
    }
    const length = Number(getRequestHeader(event, 'content-length') ?? 'NaN')
    const limit = pathname.startsWith('/api/admin/tools/import')
      ? 64 * 1024 * 1024
      : LARGE_BODY_PREFIXES.some((prefix) => pathname.startsWith(prefix))
        ? env.uploadMaxBytes + 64 * 1024
        : API_BODY_LIMIT
    if (getRequestHeader(event, 'transfer-encoding') && Number.isNaN(length)) {
      throw apiError(411, 'length_required', 'Content-Length is required')
    }
    if (length > limit) throw apiError(413, 'payload_too_large', 'Request body is too large')
  }

  const token = getCookie(event, SESSION_COOKIE)
  const session = readSession(token)
  if (session && token) {
    const user = getUser(session.userId)
    if (user && session.mfaPassed) {
      event.context.session = session
      event.context.sessionToken = token
      event.context.user = user
    }
  }

  if (ANONYMOUS.has(route) || OPTIONAL_SESSION.has(route)) {
    if (mutating && event.context.sessionToken && !ANONYMOUS.has(route)) {
      if (!verifyCsrfToken(event.context.sessionToken, getRequestHeader(event, 'x-csrf-token'))) {
        throw apiError(403, 'csrf_invalid', 'Reload the page and try again')
      }
    }
    return
  }

  const user = event.context.user
  const current = event.context.session
  if (!user || !current || !event.context.sessionToken)
    throw apiError(401, 'unauthenticated', 'Log in first')

  const limit = apiLimiter.hit(current.id)
  if (!limit.allowed) {
    setResponseHeader(event, 'Retry-After', Math.ceil(limit.retryAfterMs / 1000))
    throw apiError(429, 'rate_limited', 'Too many requests', {
      retryAfter: Math.ceil(limit.retryAfterMs / 1000),
    })
  }

  if (
    mutating &&
    !verifyCsrfToken(event.context.sessionToken, getRequestHeader(event, 'x-csrf-token'))
  ) {
    recordSecurityEvent('csrf_rejected', {
      ip,
      username: user.username,
      meta: { reason: 'token', route },
    })
    throw apiError(403, 'csrf_invalid', 'Reload the page and try again')
  }

  const setupRoute =
    pathname.startsWith('/api/admin/setup/') || pathname.startsWith('/api/admin/auth/')
  if (!user.setupCompletedAt && !setupRoute) {
    throw apiError(403, 'setup_required', 'Finish the first login setup first')
  }
})
