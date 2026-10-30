import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  SecretDecryptionError,
  decryptSecret,
  encryptSecret,
  keyId,
  needsReencryption,
  safeEqual,
} from '../../server/services/crypto'

describe('secret encryption', () => {
  const current = randomBytes(32)
  const previous = randomBytes(32)

  it('round-trips with a random nonce and a versioned prefix', () => {
    const first = encryptSecret('JBSWY3DPEHPK3PXP', current)
    const second = encryptSecret('JBSWY3DPEHPK3PXP', current)
    expect(first).not.toBe(second)
    expect(first.startsWith(`v1.${keyId(current)}.`)).toBe(true)
    expect(decryptSecret(first, [current])).toBe('JBSWY3DPEHPK3PXP')
  })

  it('decrypts with the previous key during rotation', () => {
    const token = encryptSecret('secret', previous)
    expect(decryptSecret(token, [current, previous])).toBe('secret')
    expect(needsReencryption(token, current)).toBe(true)
  })

  it('rejects tampering, unknown keys and malformed input', () => {
    const token = encryptSecret('secret', current)
    const parts = token.split('.')
    const payload = Buffer.from(parts[3] ?? '', 'base64url')
    payload[0] = (payload[0] ?? 0) ^ 1
    const tampered = [parts[0], parts[1], parts[2], payload.toString('base64url')].join('.')
    expect(() => decryptSecret(tampered, [current])).toThrow(SecretDecryptionError)
    expect(() => decryptSecret(token, [previous])).toThrow(/no matching key/)
    expect(() => decryptSecret('v2.x.y.z', [current])).toThrow(/unknown format/)
  })
})

describe('safeEqual', () => {
  it('compares strings of any length', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})
