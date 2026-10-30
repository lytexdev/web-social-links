import { z } from 'zod'
import { requireSudo } from '../../../services/account'
import { recordSecurityEvent } from '../../../services/security-events'
import { deleteSession, listSessions } from '../../../services/sessions'
import { apiError, clientIp, parseParams, requireUser } from '../../../utils/http'

export default defineEventHandler((event) => {
  const { user, session } = requireUser(event)
  requireSudo(session)
  const { id } = parseParams(event, z.object({ id: z.string().regex(/^[0-9a-f]{16}$/) }))
  const target = listSessions(user.id).find((row) => row.id.startsWith(id))
  if (!target) throw apiError(404, 'not_found', 'Session not found')
  if (target.id === session.id)
    throw apiError(409, 'current_session', 'Use log out for the current session')
  deleteSession(target.id)
  recordSecurityEvent('session_revoked', {
    ip: clientIp(event),
    username: user.username,
    meta: { session: id },
  })
  return { ok: true }
})
