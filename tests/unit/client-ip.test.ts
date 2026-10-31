import { describe, expect, it } from 'vitest'
import { normalizeIp } from '../../server/utils/cidr'
import { resolveClientIp } from '../../server/utils/client-ip'

describe('normalizeIp', () => {
  it.each([
    ['::ffff:203.0.113.5', '203.0.113.5'],
    ['[2001:db8::1]', '2001:db8::1'],
    ['203.0.113.5:443', '203.0.113.5'],
    ['fe80::1%eth0', 'fe80::1'],
    ['2001:DB8::A', '2001:db8::a'],
    ['not-an-ip', null],
    ['', null],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeIp(input)).toBe(expected)
  })
})

describe('resolveClientIp', () => {
  it('takes the address the reverse proxy sets in X-Real-IP', () => {
    expect(resolveClientIp('172.18.0.5', '203.0.113.50')).toBe('203.0.113.50')
    expect(resolveClientIp('172.18.0.5', '2001:db8::7')).toBe('2001:db8::7')
  })

  it('falls back to the socket address without a valid header', () => {
    expect(resolveClientIp('::ffff:203.0.113.9', undefined)).toBe('203.0.113.9')
    expect(resolveClientIp('203.0.113.9', 'garbage')).toBe('203.0.113.9')
  })

  it('handles a missing socket address', () => {
    expect(resolveClientIp(undefined, undefined)).toBe('0.0.0.0')
  })
})
