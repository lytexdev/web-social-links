import { z } from 'zod'
import { mediaIdField } from '../../../../../shared/schemas/content'
import { presentMedia, readUpload } from '../../../../services/media-api'
import { replaceMedia } from '../../../../services/media'
import { mediaUsages } from '../../../../services/usage'
import { parseParams, requireUser } from '../../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  const { id } = parseParams(event, z.object({ id: mediaIdField }))
  const upload = await readUpload(event, user.id)
  const row = await replaceMedia(id, upload.data, upload.type, {
    allowAnimation: upload.allowAnimation,
    userId: user.id,
  })
  return presentMedia(row, mediaUsages().get(id))
})
