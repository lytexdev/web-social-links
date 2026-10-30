import { z } from 'zod'
import { idField } from '../../../../shared/schemas/content'
import { deletePage } from '../../../services/pages'
import { parseParams, requireUser } from '../../../utils/http'

export default defineEventHandler((event) => {
  const { user } = requireUser(event)
  const { id } = parseParams(event, z.object({ id: idField }))
  deletePage(id, user.id)
  return { ok: true }
})
