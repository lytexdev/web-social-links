import { requireSudo } from '../../../services/account'
import { exportArchive } from '../../../services/transfer'
import { requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { session } = requireUser(event)
  requireSudo(session)
  const archive = await exportArchive()
  const date = new Date().toISOString().slice(0, 10)
  setResponseHeaders(event, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="web-social-links-${date}.zip"`,
  })
  return archive
})
