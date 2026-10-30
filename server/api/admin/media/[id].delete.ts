import { z } from 'zod'
import { mediaIdField } from '../../../../shared/schemas/content'
import { deleteMediaRow } from '../../../services/media'
import { mediaUsages } from '../../../services/usage'
import { apiError, parseParams, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  const { id } = parseParams(event, z.object({ id: mediaIdField }))
  const usages = mediaUsages().get(id) ?? []
  if (usages.length > 0)
    throw apiError(409, 'media_in_use', 'The image is still in use', { issues: usages })
  await deleteMediaRow(id, user.id)
  return { ok: true }
})
