import { describe, expect, it } from 'vitest'
import {
  checkPasswordPolicy,
  hashPassword,
  needsRehash,
  verifyPassword,
} from '../../server/services/password'

const context = { username: 'owner', initialPassword: 'admin123' }

describe('password policy', () => {
  it.each([
    ['short', 'too_short'],
    ['x'.repeat(129), 'too_long'],
    ['passwordpassword', 'common'],
    ['OWNEROWNEROWNER', null],
    ['correct horse battery', null],
    ['ü'.repeat(12), null],
  ])('%s -> %s', (password, expected) => {
    expect(checkPasswordPolicy(password, context)).toBe(expected)
  })

  it('rejects the username and the initial password', () => {
    expect(
      checkPasswordPolicy('long-username-x', { ...context, username: 'long-username-x' }),
    ).toBe('matches_username')
    expect(
      checkPasswordPolicy('initial-password', { ...context, initialPassword: 'initial-password' }),
    ).toBe('matches_initial')
  })
})

describe('argon2id hashing', () => {
  it('hashes with the configured parameters and verifies', async () => {
    const stored = await hashPassword('correct horse battery')
    expect(stored.startsWith('$argon2id$v=19$m=65536,t=3,p=1$')).toBe(true)
    expect(needsRehash(stored)).toBe(false)
    expect(await verifyPassword(stored, 'correct horse battery')).toEqual({
      valid: true,
      needsRehash: false,
    })
    expect((await verifyPassword(stored, 'wrong')).valid).toBe(false)
  })

  it('verifies against a dummy hash when the user does not exist', async () => {
    expect(await verifyPassword(null, 'anything')).toEqual({ valid: false, needsRehash: false })
  })

  it('flags hashes with weaker parameters for rehashing', () => {
    expect(needsRehash('$argon2id$v=19$m=19456,t=2,p=1$abc$def')).toBe(true)
  })
})
