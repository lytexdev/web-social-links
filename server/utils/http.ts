import type { H3Event } from 'h3'
import type { z } from 'zod'
import type { SessionRow } from '../services/sessions'
import type { UserRow } from '../services/users'

declare module 'h3' {
  interface H3EventContext {
    clientIp?: string
    viaCloudflare?: boolean
    session?: SessionRow
    sessionToken?: string
    user?: UserRow
    redirectClick?: { linkId: string; blockId?: string; slug: string | null; source: string }
  }
}

export interface ApiErrorBody {
  code: string
  message: string
  fields?: Record<string, string>
  retryAfter?: number
  issues?: unknown[]
}

export function apiError(
  statusCode: number,
  code: string,
  message: string,
  extra: Omit<ApiErrorBody, 'code' | 'message'> = {},
): Error {
  return createError({ statusCode, statusMessage: code, data: { code, message, ...extra } })
}

function issueFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    fields[key] ??= issue.message
  }
  return fields
}

export async function parseBody<T extends z.ZodType>(
  event: H3Event,
  schema: T,
): Promise<z.output<T>> {
  let raw: unknown
  try {
    raw = await readBody(event)
  } catch {
    throw apiError(400, 'invalid_json', 'Request body is not valid JSON')
  }
  const result = schema.safeParse(raw ?? {})
  if (!result.success) {
    throw apiError(422, 'validation_failed', 'Some fields are invalid', {
      fields: issueFields(result.error),
    })
  }
  return result.data
}

export function parseQuery<T extends z.ZodType>(event: H3Event, schema: T): z.output<T> {
  const result = schema.safeParse(getQuery(event))
  if (!result.success) {
    throw apiError(400, 'invalid_query', 'Query parameters are invalid', {
      fields: issueFields(result.error),
    })
  }
  return result.data
}

export function parseParams<T extends z.ZodType>(event: H3Event, schema: T): z.output<T> {
  const result = schema.safeParse(event.context.params ?? {})
  if (!result.success) throw apiError(404, 'not_found', 'Not found')
  return result.data
}

export function clientIp(event: H3Event): string {
  return event.context.clientIp ?? '0.0.0.0'
}

export function requireUser(event: H3Event): { user: UserRow; session: SessionRow; token: string } {
  const { user, session, sessionToken } = event.context
  if (!user || !session || !sessionToken) throw apiError(401, 'unauthenticated', 'Log in first')
  return { user, session, token: sessionToken }
}

export function setNoStore(event: H3Event): void {
  setResponseHeader(event, 'Cache-Control', 'no-store')
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
