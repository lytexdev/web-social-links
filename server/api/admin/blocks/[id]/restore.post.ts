import { z } from 'zod'
import { idField } from '../../../../../shared/schemas/content'
import { restoreBlock } from '../../../../services/blocks'
import { parseParams, requireUser } from '../../../../utils/http'

export default defineEventHandler((event) => {
  const { user } = requireUser(event)
  const { id } = parseParams(event, z.object({ id: idField }))
  restoreBlock(id, user.id)
  return { ok: true }
})
