import { presentMedia } from '../../../services/media-api'
import { listMedia } from '../../../services/media'
import { mediaUsages } from '../../../services/usage'

export default defineEventHandler(() => {
  const usages = mediaUsages()
  return listMedia().map((row) => presentMedia(row, usages.get(row.id)))
})
