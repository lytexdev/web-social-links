import { totpCodeSchema } from '../../../../shared/schemas/auth'
import { confirmTotpEnrollment, requireSudo } from '../../../services/account'
import { parseBody, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user, session } = requireUser(event)
  requireSudo(session)
  const body = await parseBody(event, totpCodeSchema)
  return { recoveryCodes: confirmTotpEnrollment(event, user, session, body.code) }
})
