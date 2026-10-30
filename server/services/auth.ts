import { and, eq, isNull, lt, or } from 'drizzle-orm'
import { useDb } from '../db/client'
import { recoveryCodes, users } from '../db/schema'
import { useEnv } from '../utils/env'
import { decryptSecret, deriveKey, hmacHex, randomToken, safeEqual } from './crypto'
import { verifyPassword, hashPassword } from './password'
import { SlidingWindowLimiter } from './ratelimit'
import { hashRecoveryCode } from './recovery-codes'
import { recordSecurityEvent } from './security-events'
import { createSession, type CreatedSession } from './sessions'
import { matchTotp } from './totp'
import { findUserByUsername, getUser, normalizeUsername, type UserRow } from './users'

const FORM_MIN_AGE_MS = 800
const FORM_MAX_AGE_MS = 60 * 60_000
const CHALLENGE_TTL_MS = 5 * 60_000
const CHALLENGE_ATTEMPTS = 5
const MAX_CHALLENGES = 10_000

export const loginLimits = {
  ipUser: new SlidingWindowLimiter(5, 15 * 60_000),
  ip: new SlidingWindowLimiter(20, 60 * 60_000),
  user: new SlidingWindowLimiter(10, 15 * 60_000),
}

interface Challenge {
  userId: string
  expiresAt: number
  attempts: number
}

const challenges = new Map<string, Challenge>()

export interface RequestContext {
  ip: string
  uaFamily: string
}

export type LoginOutcome =
  | { kind: 'rate_limited'; retryAfterMs: number }
  | { kind: 'invalid'; delayMs: number }
  | { kind: 'totp'; challenge: string }
  | { kind: 'session'; session: CreatedSession; user: UserRow }

export type SecondFactorOutcome =
  | { kind: 'invalid'; remaining: number }
  | { kind: 'expired' }
  | { kind: 'session'; session: CreatedSession; user: UserRow }

function formKey(): Buffer {
  return deriveKey(useEnv().analyticsKey, 'login-form')
}

export function issueFormToken(now = Date.now()): string {
  const stamp = now.toString(36)
  return `${stamp}.${hmacHex(formKey(), stamp)}`
}

export function verifyFormToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false
  const [stamp, signature] = token.split('.')
  if (!stamp || !signature || !safeEqual(hmacHex(formKey(), stamp), signature)) return false
  const issued = Number.parseInt(stamp, 36)
  if (!Number.isFinite(issued)) return false
  const age = now - issued
  return age >= FORM_MIN_AGE_MS && age <= FORM_MAX_AGE_MS
}

function failureDelay(ip: string, now: number): number {
  const failures = loginLimits.ip.peek(ip, now).count
  if (failures < 3) return 0
  return Math.min(8000, 1000 * 2 ** (failures - 3))
}

function registerFailure(ip: string, username: string, now: number): void {
  loginLimits.ipUser.hit(`${ip}|${username}`, now)
  loginLimits.ip.hit(ip, now)
  loginLimits.user.hit(username, now)
}

function createChallenge(userId: string, now: number): string {
  for (const [token, challenge] of challenges) {
    if (challenge.expiresAt <= now) challenges.delete(token)
  }
  if (challenges.size >= MAX_CHALLENGES) {
    const oldest = challenges.keys().next().value
    if (oldest !== undefined) challenges.delete(oldest)
  }
  const token = randomToken(32)
  challenges.set(token, { userId, expiresAt: now + CHALLENGE_TTL_MS, attempts: 0 })
  return token
}

export async function attemptLogin(
  input: { username: string; password: string; honeypot: string; formToken: string },
  context: RequestContext,
  now = Date.now(),
): Promise<LoginOutcome> {
  const username = normalizeUsername(input.username)
  const ipCheck = loginLimits.ip.peek(context.ip, now)
  const pairCheck = loginLimits.ipUser.peek(`${context.ip}|${username}`, now)
  if (!ipCheck.allowed || !pairCheck.allowed) {
    recordSecurityEvent('auth_rate_limited', { ip: context.ip, username })
    return {
      kind: 'rate_limited',
      retryAfterMs: Math.max(ipCheck.retryAfterMs, pairCheck.retryAfterMs),
    }
  }
  const userCheck = loginLimits.user.peek(username, now)
  if (!userCheck.allowed) {
    recordSecurityEvent('auth_locked', { ip: context.ip, username })
    return { kind: 'rate_limited', retryAfterMs: userCheck.retryAfterMs }
  }

  const suspicious = input.honeypot.length > 0 || !verifyFormToken(input.formToken, now)
  const user = findUserByUsername(username)
  const result = await verifyPassword(user?.passwordHash ?? null, input.password)

  if (suspicious || !user || !result.valid) {
    recordSecurityEvent(suspicious ? 'honeypot' : 'auth_failed', {
      ip: context.ip,
      username,
      meta: suspicious ? { field: input.honeypot.length > 0, token: true } : undefined,
    })
    const delayMs = failureDelay(context.ip, now)
    registerFailure(context.ip, username, now)
    return { kind: 'invalid', delayMs }
  }

  loginLimits.ipUser.reset(`${context.ip}|${username}`)
  if (result.needsRehash) {
    useDb()
      .update(users)
      .set({ passwordHash: await hashPassword(input.password), updatedAt: now })
      .where(eq(users.id, user.id))
      .run()
  }

  if (user.totpEnabled) return { kind: 'totp', challenge: createChallenge(user.id, now) }

  const session = createSession(user.id, { mfaPassed: true, reauth: true, ...context }, now)
  recordSecurityEvent('auth_success', { ip: context.ip, username, meta: { method: 'password' } })
  return { kind: 'session', session, user }
}

export function consumeTotp(user: UserRow, code: string, now: number): boolean {
  if (!user.totpEnabled || !user.totpSecretEnc) return false
  const env = useEnv()
  const keys = [
    env.encryptionKey,
    ...(env.previousEncryptionKey ? [env.previousEncryptionKey] : []),
  ]
  const secret = decryptSecret(user.totpSecretEnc, keys)
  const step = matchTotp(secret, code, now)
  if (step === null) return false
  const updated = useDb()
    .update(users)
    .set({ totpLastStep: step })
    .where(and(eq(users.id, user.id), or(isNull(users.totpLastStep), lt(users.totpLastStep, step))))
    .run()
  return updated.changes === 1
}

export function consumeRecoveryCode(user: UserRow, code: string, now: number): boolean {
  const codeHash = hashRecoveryCode(code)
  if (!codeHash) return false
  const updated = useDb()
    .update(recoveryCodes)
    .set({ usedAt: now })
    .where(
      and(
        eq(recoveryCodes.userId, user.id),
        eq(recoveryCodes.codeHash, codeHash),
        isNull(recoveryCodes.usedAt),
      ),
    )
    .run()
  return updated.changes === 1
}

export function verifySecondFactor(
  user: UserRow,
  code: string,
  now: number,
): 'totp' | 'recovery' | null {
  const trimmed = code.replace(/\s/g, '')
  if (/^\d{6}$/.test(trimmed)) return consumeTotp(user, trimmed, now) ? 'totp' : null
  return consumeRecoveryCode(user, code, now) ? 'recovery' : null
}

export function completeSecondFactor(
  challengeToken: string,
  code: string,
  context: RequestContext,
  now = Date.now(),
): SecondFactorOutcome {
  const challenge = challenges.get(challengeToken)
  if (!challenge || challenge.expiresAt <= now || challenge.attempts >= CHALLENGE_ATTEMPTS) {
    challenges.delete(challengeToken)
    return { kind: 'expired' }
  }
  const user = getUser(challenge.userId)
  if (!user) {
    challenges.delete(challengeToken)
    return { kind: 'expired' }
  }
  const method = verifySecondFactor(user, code, now)
  if (!method) {
    challenge.attempts++
    recordSecurityEvent('totp_failed', { ip: context.ip, username: user.username })
    const remaining = CHALLENGE_ATTEMPTS - challenge.attempts
    if (remaining <= 0) challenges.delete(challengeToken)
    return { kind: 'invalid', remaining }
  }
  challenges.delete(challengeToken)
  if (method === 'recovery')
    recordSecurityEvent('recovery_used', { ip: context.ip, username: user.username })
  const session = createSession(user.id, { mfaPassed: true, reauth: true, ...context }, now)
  recordSecurityEvent('auth_success', { ip: context.ip, username: user.username, meta: { method } })
  return { kind: 'session', session, user }
}

export function resetAuthState(): void {
  challenges.clear()
  loginLimits.ip.clear()
  loginLimits.ipUser.clear()
  loginLimits.user.clear()
}
