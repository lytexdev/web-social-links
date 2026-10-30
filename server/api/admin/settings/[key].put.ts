import { z } from 'zod'
import { SETTING_KEYS } from '../../../../shared/schemas/settings'
import { recordSecurityEvent } from '../../../services/security-events'
import { saveSetting } from '../../../services/settings'
import { clientIp, parseParams, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  const { key } = parseParams(
    event,
    z.object({ key: z.enum(SETTING_KEYS as [string, ...string[]]) }),
  )
  const body = await readBody(event).catch(() => null)
  const result = saveSetting(key as (typeof SETTING_KEYS)[number], body, user.id)
  if (key === 'analytics' || key === 'legal') {
    recordSecurityEvent('settings_changed', {
      ip: clientIp(event),
      username: user.username,
      meta: { key },
    })
  }
  return result
})
