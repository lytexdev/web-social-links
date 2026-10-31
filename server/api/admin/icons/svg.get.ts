import { z } from 'zod'
import { ICON_REF_PATTERN } from '../../../../shared/constants/icons'
import { cacheIcons, iconSvgs } from '../../../services/icons'
import { parseQuery } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { refs } = parseQuery(event, z.object({ refs: z.string().max(8000) }))
  const list = refs
    .split(',')
    .filter((ref) => ICON_REF_PATTERN.test(ref))
    .slice(0, 200)
  if (await cacheIcons(event)) return null
  return iconSvgs(list)
})
