import { loginSchema } from '../../../../shared/schemas/auth'
import { attemptLogin } from '../../../services/auth'
import { setSessionCookie } from '../../../services/account'
import { uaFamily } from '../../../services/user-agent'
import { apiError, clientIp, parseBody, sleep } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const body = await parseBody(event, loginSchema)
  const outcome = await attemptLogin(
    {
      username: body.username,
      password: body.password,
      honeypot: body.website,
      formToken: body.formToken,
    },
    { ip: clientIp(event), uaFamily: uaFamily(getRequestHeader(event, 'user-agent')) },
  )
  switch (outcome.kind) {
    case 'rate_limited': {
      const seconds = Math.max(1, Math.ceil(outcome.retryAfterMs / 1000))
      setResponseHeader(event, 'Retry-After', seconds)
      throw apiError(429, 'rate_limited', 'Too many attempts', { retryAfter: seconds })
    }
    case 'invalid':
      if (outcome.delayMs > 0) await sleep(outcome.delayMs)
      throw apiError(401, 'invalid_credentials', 'Username or password is wrong')
    case 'totp':
      return { next: 'totp', challenge: outcome.challenge }
    case 'session':
      setSessionCookie(event, outcome.session.token)
      return { next: outcome.user.setupCompletedAt ? 'app' : 'setup' }
  }
})
