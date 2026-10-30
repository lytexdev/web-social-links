import { requireSudo, startTotpEnrollment } from '../../../services/account'
import { requireUser } from '../../../utils/http'

export default defineEventHandler((event) => {
  const { user, session } = requireUser(event)
  requireSudo(session)
  return startTotpEnrollment(user)
})
