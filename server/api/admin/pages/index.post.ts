import { pageInputSchema } from '../../../../shared/schemas/content'
import { createPage } from '../../../services/pages'
import { parseBody, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  return createPage(await parseBody(event, pageInputSchema), user.id)
})
