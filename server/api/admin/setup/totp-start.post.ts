import { startTotpEnrollment } from '../../../services/account'
import { apiError, requireUser } from '../../../utils/http'

export default defineEventHandler((event) => {
  const { user } = requireUser(event)
  if (user.setupCompletedAt) throw apiError(409, 'setup_done', 'Setup is already complete')
  if (user.mustChangePassword) throw apiError(409, 'password_first', 'Change the password first')
  return startTotpEnrollment(user)
})
