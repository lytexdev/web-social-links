import { secondFactorSchema } from '../../../../shared/schemas/auth'
import { completeSecondFactor } from '../../../services/auth'
import { setSessionCookie } from '../../../services/account'
import { uaFamily } from '../../../services/user-agent'
import { apiError, clientIp, parseBody } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const body = await parseBody(event, secondFactorSchema)
  const outcome = completeSecondFactor(body.challenge, body.code, {
    ip: clientIp(event),
    uaFamily: uaFamily(getRequestHeader(event, 'user-agent')),
  })
  if (outcome.kind === 'expired') throw apiError(410, 'challenge_expired', 'Log in again')
  if (outcome.kind === 'invalid') {
    throw apiError(401, 'code_invalid', 'The code is not valid', {
      fields: { code: String(outcome.remaining) },
    })
  }
  setSessionCookie(event, outcome.session.token)
  return { next: outcome.user.setupCompletedAt ? 'app' : 'setup' }
})
