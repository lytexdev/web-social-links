import { newPasswordSchema } from '../../../../shared/schemas/auth'
import { changePassword, requireSudo } from '../../../services/account'
import { parseBody, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user, session } = requireUser(event)
  requireSudo(session)
  const body = await parseBody(event, newPasswordSchema)
  await changePassword(event, user, session, body.password)
  return { ok: true }
})
