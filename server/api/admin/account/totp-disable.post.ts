import { totpDisableSchema } from '../../../../shared/schemas/auth'
import { disableTotp, requireSudo } from '../../../services/account'
import { parseBody, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user, session } = requireUser(event)
  requireSudo(session)
  const body = await parseBody(event, totpDisableSchema)
  await disableTotp(event, user, session, body.password, body.code)
  return { ok: true }
})
