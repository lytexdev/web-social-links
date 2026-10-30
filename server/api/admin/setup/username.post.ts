import { usernameSchema } from '../../../../shared/schemas/auth'
import { changeUsername } from '../../../services/account'
import { apiError, parseBody, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user, session } = requireUser(event)
  if (user.setupCompletedAt) throw apiError(409, 'setup_done', 'Setup is already complete')
  if (user.mustChangePassword) throw apiError(409, 'password_first', 'Change the password first')
  const body = await parseBody(event, usernameSchema)
  changeUsername(event, user, session, body.username)
  return { username: body.username }
})
