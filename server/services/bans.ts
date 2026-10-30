import { eq, lt } from 'drizzle-orm'
import { useDb } from '../db/client'
import { bans } from '../db/schema'
import { SlidingWindowLimiter } from './ratelimit'
import { recordSecurityEvent } from './security-events'

export type BanScope = 'admin' | 'all'

interface BanEntry {
  scope: BanScope
  expiresAt: number
}

const BAN_DURATION_MS = 24 * 3_600_000
const cache = new Map<string, BanEntry>()
const trapHits = new SlidingWindowLimiter(1, 10 * 60_000)

export function loadBans(now = Date.now()): void {
  cache.clear()
  for (const row of useDb().select().from(bans).all()) {
    if (row.expiresAt > now)
      cache.set(row.ip, { scope: row.scope as BanScope, expiresAt: row.expiresAt })
  }
}

export function activeBan(ip: string, now = Date.now()): BanEntry | null {
  const entry = cache.get(ip)
  if (!entry) return null
  if (entry.expiresAt <= now) {
    cache.delete(ip)
    return null
  }
  return entry
}

export function createBan(ip: string, reason: string, scope: BanScope, now = Date.now()): void {
  const expiresAt = now + BAN_DURATION_MS
  useDb()
    .insert(bans)
    .values({ ip, reason, scope, expiresAt, createdAt: now })
    .onConflictDoUpdate({ target: bans.ip, set: { reason, scope, expiresAt } })
    .run()
  cache.set(ip, { scope, expiresAt })
  recordSecurityEvent('ban_created', {
    ip,
    meta: { reason, scope, until: new Date(expiresAt).toISOString() },
  })
}

export function removeBan(ip: string, actor: string): boolean {
  const removed = useDb().delete(bans).where(eq(bans.ip, ip)).run().changes > 0
  cache.delete(ip)
  if (removed) recordSecurityEvent('ban_removed', { ip, meta: { by: actor } })
  return removed
}

export function listBans(now = Date.now()) {
  return useDb()
    .select()
    .from(bans)
    .all()
    .filter((row) => row.expiresAt > now)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function registerTrapHit(ip: string, path: string, scope: BanScope, now = Date.now()): void {
  recordSecurityEvent('trap_hit', { ip, meta: { path: path.slice(0, 200) } })
  const result = trapHits.hit(ip, now)
  if (!result.allowed && !activeBan(ip, now)) {
    trapHits.reset(ip)
    createBan(ip, 'trap paths', scope, now)
  }
}

export function purgeExpiredBans(now = Date.now()): number {
  for (const [ip, entry] of cache) if (entry.expiresAt <= now) cache.delete(ip)
  return useDb().delete(bans).where(lt(bans.expiresAt, now)).run().changes
}

export function resetTrapCounters(): void {
  trapHits.clear()
}
