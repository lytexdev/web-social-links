import { and, eq, lt, ne } from 'drizzle-orm'
import { useDb } from '../db/client'
import { sessions } from '../db/schema'
import { useEnv } from '../utils/env'
import { deriveKey, hmacHex, randomToken, safeEqual, sha256Hex } from './crypto'

export const SESSION_COOKIE = '__Host-wsl_session'
export const REAUTH_WINDOW_MS = 10 * 60_000
const TOUCH_INTERVAL_MS = 60_000

export type SessionRow = typeof sessions.$inferSelect

export interface CreatedSession {
  token: string
  row: SessionRow
}

export function sessionIdFromToken(token: string): string {
  return sha256Hex(token)
}

export function createSession(
  userId: string,
  options: { mfaPassed: boolean; ip: string; uaFamily: string; reauth: boolean },
  now = Date.now(),
): CreatedSession {
  const env = useEnv()
  const token = randomToken(32)
  const row: SessionRow = {
    id: sessionIdFromToken(token),
    userId,
    mfaPassed: options.mfaPassed,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: now + env.sessionMaxMs,
    reauthAt: options.reauth ? now : null,
    ip: options.ip,
    uaFamily: options.uaFamily.slice(0, 80),
  }
  useDb().insert(sessions).values(row).run()
  return { token, row }
}

export function readSession(token: string | undefined, now = Date.now()): SessionRow | null {
  if (!token || token.length > 128) return null
  const env = useEnv()
  const id = sessionIdFromToken(token)
  const row = useDb().select().from(sessions).where(eq(sessions.id, id)).get()
  if (!row) return null
  if (row.expiresAt <= now || row.lastSeenAt + env.sessionIdleMs <= now) {
    useDb().delete(sessions).where(eq(sessions.id, id)).run()
    return null
  }
  if (now - row.lastSeenAt >= TOUCH_INTERVAL_MS) {
    useDb().update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, id)).run()
    row.lastSeenAt = now
  }
  return row
}

export function rotateSession(
  previous: SessionRow,
  changes: { mfaPassed?: boolean; reauth?: boolean; ip: string; uaFamily: string },
  now = Date.now(),
): CreatedSession {
  useDb().delete(sessions).where(eq(sessions.id, previous.id)).run()
  const created = createSession(
    previous.userId,
    {
      mfaPassed: changes.mfaPassed ?? previous.mfaPassed,
      ip: changes.ip,
      uaFamily: changes.uaFamily,
      reauth: changes.reauth ?? false,
    },
    now,
  )
  if (!changes.reauth && previous.reauthAt) {
    useDb()
      .update(sessions)
      .set({ reauthAt: previous.reauthAt })
      .where(eq(sessions.id, created.row.id))
      .run()
    created.row.reauthAt = previous.reauthAt
  }
  return created
}

export function markReauthenticated(sessionId: string, now = Date.now()): void {
  useDb().update(sessions).set({ reauthAt: now }).where(eq(sessions.id, sessionId)).run()
}

export function hasRecentReauth(row: SessionRow, now = Date.now()): boolean {
  return row.reauthAt !== null && now - row.reauthAt < REAUTH_WINDOW_MS
}

export function deleteSession(id: string): void {
  useDb().delete(sessions).where(eq(sessions.id, id)).run()
}

export function deleteOtherSessions(userId: string, keepId: string | null): number {
  const db = useDb()
  if (keepId === null) return db.delete(sessions).where(eq(sessions.userId, userId)).run().changes
  return db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, keepId)))
    .run().changes
}

export function listSessions(userId: string, now = Date.now()) {
  const env = useEnv()
  return useDb()
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .all()
    .filter((row) => row.expiresAt > now && row.lastSeenAt + env.sessionIdleMs > now)
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
}

export function purgeExpiredSessions(now = Date.now()): number {
  const env = useEnv()
  const db = useDb()
  const absolute = db.delete(sessions).where(lt(sessions.expiresAt, now)).run().changes
  const idle = db
    .delete(sessions)
    .where(lt(sessions.lastSeenAt, now - env.sessionIdleMs))
    .run().changes
  return absolute + idle
}

export function csrfTokenFor(sessionToken: string): string {
  return hmacHex(deriveKey(useEnv().encryptionKey, 'csrf'), sessionToken)
}

export function verifyCsrfToken(sessionToken: string, candidate: string | undefined): boolean {
  if (!candidate) return false
  return safeEqual(csrfTokenFor(sessionToken), candidate)
}
