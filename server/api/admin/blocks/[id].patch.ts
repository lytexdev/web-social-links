import { z } from 'zod'
import { blockUpdateSchema, idField } from '../../../../shared/schemas/content'
import { updateBlock } from '../../../services/blocks'
import { parseBody, parseParams, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  const { id } = parseParams(event, z.object({ id: idField }))
  const body = await parseBody(event, blockUpdateSchema)
  updateBlock(id, body, user.id)
  return { ok: true }
})
