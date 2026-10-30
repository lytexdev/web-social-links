import { blockCreateSchema } from '../../../../shared/schemas/content'
import { createBlock } from '../../../services/blocks'
import { parseBody, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  const body = await parseBody(event, blockCreateSchema)
  return createBlock(body, user.id)
})
