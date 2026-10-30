import { updateUser } from '../../../services/users'
import { apiError, requireUser } from '../../../utils/http'

export default defineEventHandler((event) => {
  const { user } = requireUser(event)
  if (user.mustChangePassword) throw apiError(409, 'password_first', 'Change the password first')
  if (!user.setupCompletedAt)
    updateUser(user.id, { setupCompletedAt: Date.now(), totpPendingEnc: null })
  return { ok: true }
})
