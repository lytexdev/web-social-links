import { z } from 'zod'
import { publish } from '../../../services/publish'
import { parseBody, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  const body = await parseBody(event, z.object({ note: z.string().trim().max(200).default('') }))
  return publish(body.note, user.id)
})
