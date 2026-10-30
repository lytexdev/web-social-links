import { Secret, TOTP } from 'otpauth'

const PERIOD = 30
const DIGITS = 6

function instance(secret: string, issuer = '', label = ''): TOTP {
  return new TOTP({
    issuer,
    label,
    algorithm: 'SHA1',
    digits: DIGITS,
    period: PERIOD,
    secret: Secret.fromBase32(secret),
  })
}

export function createTotpSecret(): string {
  return new Secret({ size: 20 }).base32
}

export function totpUri(secret: string, issuer: string, label: string): string {
  return instance(secret, issuer, label).toString()
}

export function totpStep(now: number): number {
  return Math.floor(now / 1000 / PERIOD)
}

export function generateTotp(secret: string, now: number): string {
  return instance(secret).generate({ timestamp: now })
}

export function matchTotp(secret: string, code: string, now: number): number | null {
  if (!/^\d{6}$/.test(code)) return null
  const delta = instance(secret).validate({ token: code, timestamp: now, window: 1 })
  return delta === null ? null : totpStep(now) + delta
}
