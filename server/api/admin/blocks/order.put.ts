import { blockOrderSchema } from '../../../../shared/schemas/content'
import { listBlocks, reorderBlocks } from '../../../services/blocks'
import { parseBody, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  const body = await parseBody(event, blockOrderSchema)
  reorderBlocks(body.order, user.id)
  return listBlocks()
})
