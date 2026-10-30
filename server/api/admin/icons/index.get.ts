import { iconIndex } from '../../../services/icons'

export default defineEventHandler(async (event) => {
  const index = await iconIndex()
  setResponseHeader(event, 'Cache-Control', 'private, max-age=86400')
  return index
})
