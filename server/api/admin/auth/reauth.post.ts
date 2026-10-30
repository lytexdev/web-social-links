import { reauthSchema } from '../../../../shared/schemas/auth'
import { loginLimits, verifySecondFactor } from '../../../services/auth'
import { verifyPassword } from '../../../services/password'
import { recordSecurityEvent } from '../../../services/security-events'
import { REAUTH_WINDOW_MS, markReauthenticated } from '../../../services/sessions'
import { apiError, clientIp, parseBody, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user, session } = requireUser(event)
  const ip = clientIp(event)
  const check = loginLimits.ip.peek(ip)
  if (!check.allowed)
    throw apiError(429, 'rate_limited', 'Too many attempts', {
      retryAfter: Math.ceil(check.retryAfterMs / 1000),
    })
  const body = await parseBody(event, reauthSchema)
  const result = await verifyPassword(user.passwordHash, body.password)
  const factorOk =
    !user.totpEnabled ||
    (result.valid &&
      body.code !== undefined &&
      verifySecondFactor(user, body.code, Date.now()) !== null)
  if (!result.valid || !factorOk) {
    loginLimits.ip.hit(ip)
    recordSecurityEvent('auth_failed', { ip, username: user.username, meta: { action: 'reauth' } })
    throw apiError(
      401,
      'credentials_invalid',
      user.totpEnabled ? 'Password or code is wrong' : 'Password is wrong',
    )
  }
  const now = Date.now()
  markReauthenticated(session.id, now)
  return { reauthUntil: now + REAUTH_WINDOW_MS }
})
