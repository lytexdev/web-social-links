import { clearSessionCookie } from '../../../services/account'
import { deleteSession } from '../../../services/sessions'

export default defineEventHandler((event) => {
  const session = event.context.session
  if (session) deleteSession(session.id)
  clearSessionCookie(event)
  return { ok: true }
})
