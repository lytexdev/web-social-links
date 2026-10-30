import { z } from 'zod'
import { slugField } from '../../../../shared/schemas/content'
import { deleteSlug } from '../../../services/sources'
import { parseParams, requireUser } from '../../../utils/http'

export default defineEventHandler((event) => {
  const { user } = requireUser(event)
  const { slug } = parseParams(event, z.object({ slug: slugField }))
  deleteSlug(slug, user.id)
  return { ok: true }
})
