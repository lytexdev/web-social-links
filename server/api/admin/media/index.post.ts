import { presentMedia, readUpload } from '../../../services/media-api'
import { storeUpload } from '../../../services/media'
import { requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  const upload = await readUpload(event, user.id)
  const { row, duplicate } = await storeUpload(upload.data, upload.type, {
    allowAnimation: upload.allowAnimation,
    userId: user.id,
  })
  return { media: presentMedia(row), duplicate }
})
