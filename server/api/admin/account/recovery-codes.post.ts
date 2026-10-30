import { regenerateRecoveryCodes, requireSudo } from '../../../services/account'
import { requireUser } from '../../../utils/http'

export default defineEventHandler((event) => {
  const { user, session } = requireUser(event)
  requireSudo(session)
  return { recoveryCodes: regenerateRecoveryCodes(event, user) }
})
