import type { H3Event } from 'h3'
import { renderSVG } from 'uqr'
import { eq } from 'drizzle-orm'
import { useDb } from '../db/client'
import { recoveryCodes } from '../db/schema'
import { useEnv } from '../utils/env'
import { apiError, clientIp } from '../utils/http'
import { verifySecondFactor } from './auth'
import { decryptSecret, encryptSecret } from './crypto'
import { checkPasswordPolicy, hashPassword, verifyPassword } from './password'
import { recordSecurityEvent } from './security-events'
import {
  SESSION_COOKIE,
  deleteOtherSessions,
  hasRecentReauth,
  rotateSession,
  type SessionRow,
} from './sessions'
import { createTotpSecret, matchTotp, totpUri } from './totp'
import { uaFamily } from './user-agent'
import { findUserByUsername, replaceRecoveryCodes, updateUser, type UserRow } from './users'

function encryptionKeys(): Buffer[] {
  const env = useEnv()
  return [env.encryptionKey, ...(env.previousEncryptionKey ? [env.previousEncryptionKey] : [])]
}

export function setSessionCookie(event: H3Event, token: string): void {
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: Math.floor(useEnv().sessionMaxMs / 1000),
  })
}

export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  })
}

export function rotate(event: H3Event, session: SessionRow, reauth = false): void {
  const created = rotateSession(session, {
    ip: clientIp(event),
    uaFamily: uaFamily(getRequestHeader(event, 'user-agent')),
    reauth,
  })
  event.context.session = created.row
  event.context.sessionToken = created.token
  setSessionCookie(event, created.token)
}

export function requireSudo(session: SessionRow): void {
  if (!hasRecentReauth(session))
    throw apiError(403, 'reauth_required', 'Confirm your password first')
}

export async function changePassword(
  event: H3Event,
  user: UserRow,
  session: SessionRow,
  password: string,
): Promise<void> {
  const issue = checkPasswordPolicy(password, {
    username: user.username,
    initialPassword: useEnv().initialAdminPassword,
  })
  if (issue)
    throw apiError(422, 'password_rejected', 'Password does not meet the policy', {
      fields: { password: issue },
    })
  const reused = await verifyPassword(user.passwordHash, password)
  if (reused.valid) {
    throw apiError(422, 'password_rejected', 'Choose a different password', {
      fields: { password: 'unchanged' },
    })
  }
  updateUser(user.id, {
    passwordHash: await hashPassword(password),
    mustChangePassword: false,
    passwordChangedAt: Date.now(),
  })
  deleteOtherSessions(user.id, session.id)
  rotate(event, session, true)
  recordSecurityEvent('password_changed', { ip: clientIp(event), username: user.username })
}

export function changeUsername(
  event: H3Event,
  user: UserRow,
  session: SessionRow,
  username: string,
): void {
  if (username === user.username) return
  const existing = findUserByUsername(username)
  if (existing)
    throw apiError(409, 'username_taken', 'This username is taken', {
      fields: { username: 'taken' },
    })
  updateUser(user.id, { username })
  rotate(event, session, true)
  recordSecurityEvent('username_changed', {
    ip: clientIp(event),
    username,
    meta: { previous: user.username },
  })
}

export function startTotpEnrollment(user: UserRow): { secret: string; uri: string; qr: string } {
  if (user.totpEnabled)
    throw apiError(409, 'totp_active', 'Two-factor authentication is already active')
  const env = useEnv()
  const secret = createTotpSecret()
  updateUser(user.id, { totpPendingEnc: encryptSecret(secret, env.encryptionKey) })
  const uri = totpUri(secret, env.totpIssuer, user.username)
  const svg = renderSVG(uri, {
    border: 2,
    pixelSize: 6,
    whiteColor: '#ffffff',
    blackColor: '#000000',
  })
  return { secret, uri, qr: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` }
}

export function confirmTotpEnrollment(
  event: H3Event,
  user: UserRow,
  session: SessionRow,
  code: string,
): string[] {
  if (!user.totpPendingEnc) throw apiError(409, 'totp_not_started', 'Start the setup again')
  const secret = decryptSecret(user.totpPendingEnc, encryptionKeys())
  const now = Date.now()
  const step = matchTotp(secret, code, now)
  if (step === null)
    throw apiError(422, 'totp_invalid', 'The code is not valid', { fields: { code: 'invalid' } })
  updateUser(user.id, {
    totpSecretEnc: encryptSecret(secret, useEnv().encryptionKey),
    totpPendingEnc: null,
    totpEnabled: true,
    totpLastStep: step,
  })
  const codes = replaceRecoveryCodes(user.id)
  deleteOtherSessions(user.id, session.id)
  rotate(event, session, true)
  recordSecurityEvent('totp_enabled', { ip: clientIp(event), username: user.username })
  return codes
}

export async function disableTotp(
  event: H3Event,
  user: UserRow,
  session: SessionRow,
  password: string,
  code: string,
): Promise<void> {
  if (!user.totpEnabled)
    throw apiError(409, 'totp_inactive', 'Two-factor authentication is not active')
  const passwordCheck = await verifyPassword(user.passwordHash, password)
  const factor = passwordCheck.valid ? verifySecondFactor(user, code, Date.now()) : null
  if (!passwordCheck.valid || !factor) {
    recordSecurityEvent('auth_failed', {
      ip: clientIp(event),
      username: user.username,
      meta: { action: 'totp_disable' },
    })
    throw apiError(422, 'credentials_invalid', 'Password or code is wrong')
  }
  updateUser(user.id, {
    totpEnabled: false,
    totpSecretEnc: null,
    totpPendingEnc: null,
    totpLastStep: null,
  })
  useDb().delete(recoveryCodes).where(eq(recoveryCodes.userId, user.id)).run()
  rotate(event, session, true)
  recordSecurityEvent('totp_disabled', { ip: clientIp(event), username: user.username })
}

export function regenerateRecoveryCodes(event: H3Event, user: UserRow): string[] {
  if (!user.totpEnabled)
    throw apiError(409, 'totp_inactive', 'Two-factor authentication is not active')
  const codes = replaceRecoveryCodes(user.id)
  recordSecurityEvent('recovery_regenerated', { ip: clientIp(event), username: user.username })
  return codes
}
