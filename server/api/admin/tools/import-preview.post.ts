import { parseImport, previewImport } from '../../../services/transfer'
import { apiError } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const file = parts?.find((part) => part.name === 'file')
  if (!file) throw apiError(422, 'file_missing', 'No file in the request')
  return previewImport(parseImport(file.data))
})
