import { z } from 'zod'
import { slugField } from '../../../../shared/schemas/content'
import { deleteSource } from '../../../services/sources'
import { parseParams, requireUser } from '../../../utils/http'

export default defineEventHandler((event) => {
  const { user } = requireUser(event)
  const { key } = parseParams(event, z.object({ key: slugField }))
  deleteSource(key, user.id)
  return { ok: true }
})
