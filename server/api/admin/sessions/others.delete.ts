import { requireSudo } from '../../../services/account'
import { recordSecurityEvent } from '../../../services/security-events'
import { deleteOtherSessions } from '../../../services/sessions'
import { clientIp, requireUser } from '../../../utils/http'

export default defineEventHandler((event) => {
  const { user, session } = requireUser(event)
  requireSudo(session)
  const removed = deleteOtherSessions(user.id, session.id)
  recordSecurityEvent('session_revoked', {
    ip: clientIp(event),
    username: user.username,
    meta: { count: removed },
  })
  return { removed }
})
