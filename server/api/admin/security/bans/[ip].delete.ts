import { z } from 'zod'
import { removeBan } from '../../../../services/bans'
import { normalizeIp } from '../../../../utils/cidr'
import { apiError, parseParams, requireUser } from '../../../../utils/http'

export default defineEventHandler((event) => {
  const { user } = requireUser(event)
  const { ip } = parseParams(event, z.object({ ip: z.string().max(64) }))
  const normalized = normalizeIp(decodeURIComponent(ip))
  if (!normalized || !removeBan(normalized, user.username))
    throw apiError(404, 'not_found', 'Ban not found')
  return { ok: true }
})
