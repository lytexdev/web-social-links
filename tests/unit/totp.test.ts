import { Secret } from 'otpauth'
import { describe, expect, it } from 'vitest'
import {
  createTotpSecret,
  generateTotp,
  matchTotp,
  totpStep,
  totpUri,
} from '../../server/services/totp'
import {
  generateRecoveryCode,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from '../../server/services/recovery-codes'

const RFC_SECRET = Secret.fromLatin1('12345678901234567890').base32

describe('TOTP', () => {
  it('matches the RFC 6238 SHA-1 test vectors', () => {
    expect(generateTotp(RFC_SECRET, 59_000)).toBe('287082')
    expect(generateTotp(RFC_SECRET, 1_111_111_109_000)).toBe('081804')
    expect(generateTotp(RFC_SECRET, 2_000_000_000_000)).toBe('279037')
  })

  it('accepts one step of drift and returns the matched step', () => {
    const now = 1_700_000_000_000
    const previous = generateTotp(RFC_SECRET, now - 30_000)
    const next = generateTotp(RFC_SECRET, now + 30_000)
    expect(matchTotp(RFC_SECRET, previous, now)).toBe(totpStep(now) - 1)
    expect(matchTotp(RFC_SECRET, next, now)).toBe(totpStep(now) + 1)
    expect(matchTotp(RFC_SECRET, generateTotp(RFC_SECRET, now - 90_000), now)).toBeNull()
    expect(matchTotp(RFC_SECRET, 'abcdef', now)).toBeNull()
  })

  it('creates 160-bit secrets and standard URIs', () => {
    const secret = createTotpSecret()
    expect(secret).toMatch(/^[A-Z2-7]{32}$/)
    expect(totpUri(secret, 'links.example.com', 'owner')).toBe(
      `otpauth://totp/links.example.com:owner?issuer=links.example.com&secret=${secret}&algorithm=SHA1&digits=6&period=30`,
    )
  })
})

describe('recovery codes', () => {
  it('generates 80-bit codes in groups of four', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateRecoveryCode()))
    expect(codes.size).toBe(200)
    for (const code of codes)
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/)
  })

  it('normalises case, separators and ambiguous characters', () => {
    expect(normalizeRecoveryCode('abcd-efgh-jkmn-pqrs')).toBe('ABCDEFGHJKMNPQRS')
    expect(normalizeRecoveryCode('0O1I L000 0000 0000')).toBe('0011100000000000')
    expect(normalizeRecoveryCode('too-short')).toBeNull()
    expect(hashRecoveryCode('abcd efgh jkmn pqrs')).toBe(hashRecoveryCode('ABCD-EFGH-JKMN-PQRS'))
  })
})
