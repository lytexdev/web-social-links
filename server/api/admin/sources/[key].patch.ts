import { z } from 'zod'
import { iconField, slugField } from '../../../../shared/schemas/content'
import { updateSource } from '../../../services/sources'
import { parseBody, parseParams, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  const { key } = parseParams(event, z.object({ key: slugField }))
  const body = await parseBody(
    event,
    z.object({
      label: z.string().trim().min(1).max(40).optional(),
      icon: iconField.nullable().optional(),
    }),
  )
  updateSource(key, body, user.id)
  return { ok: true }
})
