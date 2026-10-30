import { sourceInputSchema } from '../../../../shared/schemas/content'
import { createSource } from '../../../services/sources'
import { parseBody, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  return createSource(await parseBody(event, sourceInputSchema), user.id)
})
