import { newPasswordSchema } from '../../../../shared/schemas/auth'
import { changePassword } from '../../../services/account'
import { apiError, parseBody, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user, session } = requireUser(event)
  if (user.setupCompletedAt) throw apiError(409, 'setup_done', 'Setup is already complete')
  const body = await parseBody(event, newPasswordSchema)
  await changePassword(event, user, session, body.password)
  return { ok: true }
})
