import { cacheIcons, iconIndex } from '../../../services/icons'

export default defineEventHandler(async (event) => {
  if (await cacheIcons(event)) return null
  return iconIndex()
})
