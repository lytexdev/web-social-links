import { z } from 'zod'
import { idField } from '../../../../../shared/schemas/content'
import { duplicateBlock } from '../../../../services/blocks'
import { parseParams, requireUser } from '../../../../utils/http'

export default defineEventHandler((event) => {
  const { user } = requireUser(event)
  const { id } = parseParams(event, z.object({ id: idField }))
  return { id: duplicateBlock(id, user.id) }
})
