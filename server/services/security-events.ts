import { and, desc, eq, lt, type SQL } from 'drizzle-orm'
import { useDb } from '../db/client'
import { securityEvents } from '../db/schema'
import { logger } from '../utils/logger'

export const SECURITY_EVENT_TYPES = [
  'auth_success',
  'auth_failed',
  'auth_locked',
  'auth_rate_limited',
  'honeypot',
  'totp_failed',
  'recovery_used',
  'trap_hit',
  'ban_created',
  'ban_removed',
  'password_changed',
  'username_changed',
  'totp_enabled',
  'totp_disabled',
  'recovery_regenerated',
  'session_revoked',
  'csrf_rejected',
  'admin_ip_rejected',
  'settings_changed',
  'admin_reset',
] as const

export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number]

const WARN_TYPES = new Set<SecurityEventType>([
  'auth_failed',
  'auth_locked',
  'auth_rate_limited',
  'honeypot',
  'totp_failed',
  'trap_hit',
  'ban_created',
  'csrf_rejected',
  'admin_ip_rejected',
])

export function recordSecurityEvent(
  type: SecurityEventType,
  details: { ip?: string | null; username?: string | null; meta?: Record<string, unknown> } = {},
): void {
  const createdAt = Date.now()
  useDb()
    .insert(securityEvents)
    .values({
      type,
      ip: details.ip ?? null,
      usernameAttempt: details.username?.slice(0, 64) ?? null,
      meta: details.meta ?? null,
      createdAt,
    })
    .run()
  const fields = {
    ip: details.ip ?? undefined,
    user: details.username ?? undefined,
    ...details.meta,
  }
  if (WARN_TYPES.has(type)) logger.warn(`security.${type}`, fields)
  else logger.info(`security.${type}`, fields)
}

export function listSecurityEvents(options: { type?: string; before?: number; limit: number }) {
  const conditions: SQL[] = []
  if (options.type) conditions.push(eq(securityEvents.type, options.type))
  if (options.before) conditions.push(lt(securityEvents.id, options.before))
  return useDb()
    .select()
    .from(securityEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(securityEvents.id))
    .limit(options.limit)
    .all()
}

export function purgeSecurityEvents(olderThan: number): number {
  return useDb().delete(securityEvents).where(lt(securityEvents.createdAt, olderThan)).run().changes
}
