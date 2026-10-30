import { z } from 'zod'
import { restoreVersion } from '../../../../services/publish'
import { parseParams, requireUser } from '../../../../utils/http'

export default defineEventHandler((event) => {
  const { user } = requireUser(event)
  const { rev } = parseParams(event, z.object({ rev: z.coerce.number().int().positive() }))
  restoreVersion(rev, user.id)
  return { ok: true }
})
