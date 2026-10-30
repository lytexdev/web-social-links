import { requireSudo } from '../../../services/account'
import { listSessions } from '../../../services/sessions'
import { requireUser } from '../../../utils/http'

export default defineEventHandler((event) => {
  const { user, session } = requireUser(event)
  requireSudo(session)
  return listSessions(user.id).map((row) => ({
    id: row.id.slice(0, 16),
    current: row.id === session.id,
    uaFamily: row.uaFamily,
    ip: row.ip,
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
  }))
})
