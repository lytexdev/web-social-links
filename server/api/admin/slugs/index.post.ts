import { slugInputSchema } from '../../../../shared/schemas/content'
import { createSlug } from '../../../services/sources'
import { parseBody, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  return createSlug(await parseBody(event, slugInputSchema), user.id)
})
