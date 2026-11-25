import { recordAudit } from '../../../services/audit'
import { syncReferences } from '../../../services/references'
import { requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  const status = await syncReferences()
  recordAudit(user.id, 'sync', 'references', null, status.ok ? 'ok' : (status.error ?? 'failed'))
  return status
})
