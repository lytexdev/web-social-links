import { z } from 'zod'
import { SECURITY_EVENT_TYPES, listSecurityEvents } from '../../../services/security-events'
import { parseQuery } from '../../../utils/http'

const query = z.object({
  type: z.enum(SECURITY_EVENT_TYPES).optional(),
  before: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export default defineEventHandler((event) => {
  const options = parseQuery(event, query)
  const rows = listSecurityEvents(options)
  return {
    events: rows.map((row) => ({
      id: row.id,
      type: row.type,
      ip: row.ip,
      username: row.usernameAttempt,
      meta: row.meta,
      createdAt: row.createdAt,
    })),
    next: rows.length === options.limit ? rows.at(-1)?.id : null,
  }
})
