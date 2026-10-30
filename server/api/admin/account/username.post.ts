import { usernameSchema } from '../../../../shared/schemas/auth'
import { changeUsername, requireSudo } from '../../../services/account'
import { parseBody, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user, session } = requireUser(event)
  requireSudo(session)
  const body = await parseBody(event, usernameSchema)
  changeUsername(event, user, session, body.username)
  return { username: body.username }
})
