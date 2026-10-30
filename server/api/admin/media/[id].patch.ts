import { z } from 'zod'
import { mediaIdField } from '../../../../shared/schemas/content'
import { presentMedia } from '../../../services/media-api'
import { updateMediaText } from '../../../services/media'
import { mediaUsages } from '../../../services/usage'
import { parseBody, parseParams, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  const { id } = parseParams(event, z.object({ id: mediaIdField }))
  const body = await parseBody(
    event,
    z.object({ alt: z.string().trim().max(200).optional(), decorative: z.boolean().optional() }),
  )
  return presentMedia(updateMediaText(id, body, user.id), mediaUsages().get(id))
})
