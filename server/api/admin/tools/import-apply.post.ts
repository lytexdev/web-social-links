import { requireSudo } from '../../../services/account'
import { applyImport, parseImport } from '../../../services/transfer'
import { apiError, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user, session } = requireUser(event)
  requireSudo(session)
  const parts = await readMultipartFormData(event)
  const file = parts?.find((part) => part.name === 'file')
  if (!file) throw apiError(422, 'file_missing', 'No file in the request')
  await applyImport(parseImport(file.data), user.id)
  return { ok: true }
})
