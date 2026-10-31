import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { parseEnv } from '../../server/utils/env'

const key = () => randomBytes(32).toString('base64')

function base(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: 'production',
    PUBLIC_ORIGIN: 'https://links.example.com',
    APP_ENCRYPTION_KEY: key(),
    ANALYTICS_HMAC_KEY: key(),
    SECURITY_CONTACT: 'mailto:security@example.com',
    ...overrides,
  }
}

function issues(source: Record<string, string | undefined>): string[] {
  const result = parseEnv(source)
  return result.ok ? [] : result.issues
}

describe('parseEnv', () => {
  it('accepts a minimal production configuration and applies defaults', () => {
    const result = parseEnv(base())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.env.publicHost).toBe('links.example.com')
    expect([...result.env.adminHosts]).toEqual(['links.example.com'])
    expect(result.env.initialAdminUsername).toBe('admin')
    expect(result.env.initialAdminPassword).toBe('admin123')
    expect(result.env.sessionIdleMs).toBe(3_600_000)
    expect(result.env.timeZone).toBe('Europe/Berlin')
    expect(result.env.banScope).toBe('admin')
  })

  it('names every missing secret', () => {
    const found = issues(base({ APP_ENCRYPTION_KEY: undefined, ANALYTICS_HMAC_KEY: '' }))
    expect(found).toContain('APP_ENCRYPTION_KEY is required')
    expect(found).toContain('ANALYTICS_HMAC_KEY is required')
  })

  it('rejects weak or malformed keys', () => {
    expect(
      issues(base({ APP_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64') })).join(),
    ).toMatch(/APP_ENCRYPTION_KEY is not random enough/)
    expect(issues(base({ APP_ENCRYPTION_KEY: randomBytes(16).toString('base64') })).join()).toMatch(
      /exactly 32 bytes, got 16/,
    )
    expect(issues(base({ APP_ENCRYPTION_KEY: 'change-me' })).join()).toMatch(/standard base64/)
    expect(issues(base({ ANALYTICS_HMAC_KEY: randomBytes(64).toString('base64') }))).toEqual([])
  })

  it('requires https and a bare origin in production', () => {
    expect(issues(base({ PUBLIC_ORIGIN: 'http://links.example.com' }))).toContain(
      'PUBLIC_ORIGIN must use https',
    )
    expect(issues(base({ PUBLIC_ORIGIN: 'https://links.example.com/x' })).join()).toMatch(
      /without path/,
    )
    expect(
      issues(base({ NODE_ENV: 'development', PUBLIC_ORIGIN: 'http://localhost:3000' })),
    ).toEqual([])
  })

  it('requires a security contact only in production', () => {
    expect(issues(base({ SECURITY_CONTACT: undefined }))).toContain(
      'SECURITY_CONTACT is required in production',
    )
    expect(issues(base({ NODE_ENV: 'development', SECURITY_CONTACT: undefined }))).toEqual([])
    expect(issues(base({ SECURITY_CONTACT: 'security@example.com' })).join()).toMatch(
      /mailto: or https:/,
    )
  })

  it('parses alias origins, admin hosts and CIDR lists', () => {
    const result = parseEnv(
      base({
        ALIAS_ORIGINS: 'https://socials.example.com, https://www.example.com',
        ADMIN_ALLOWED_HOSTS: 'Admin.Example.com',
        ADMIN_IP_ALLOWLIST: '10.8.0.0/24,fd00::/8',
      }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect([...result.env.aliasHosts]).toEqual(['socials.example.com', 'www.example.com'])
    expect([...result.env.adminHosts]).toEqual(['admin.example.com'])
    expect(result.env.adminIpAllowlist?.check('10.8.0.7', 'ipv4')).toBe(true)
    expect(result.env.adminIpAllowlist?.check('10.9.0.7', 'ipv4')).toBe(false)
  })

  it('rejects broken ranges', () => {
    expect(issues(base({ ADMIN_IP_ALLOWLIST: '10.0.0.0/33' })).join()).toMatch(/"10.0.0.0\/33"/)
    expect(issues(base({ ADMIN_IP_ALLOWLIST: 'private' })).join()).toMatch(/"private" is not an IP/)
  })

  it('validates numeric ranges, enums and the time zone', () => {
    expect(issues(base({ SESSION_IDLE_MINUTES: '2' }))).toContain(
      'SESSION_IDLE_MINUTES must be at least 5',
    )
    expect(issues(base({ UPLOAD_MAX_MB: 'ten' }))).toContain('UPLOAD_MAX_MB must be a number')
    expect(issues(base({ BAN_SCOPE: 'public' })).join()).toMatch(/BAN_SCOPE/)
    expect(issues(base({ TZ: 'Mars/Olympus' })).join()).toMatch(/IANA time zone/)
  })

  it('normalises and validates the initial username', () => {
    const result = parseEnv(base({ INITIAL_ADMIN_USERNAME: 'Owner' }))
    expect(result.ok && result.env.initialAdminUsername).toBe('owner')
    expect(issues(base({ INITIAL_ADMIN_USERNAME: 'a' })).join()).toMatch(/INITIAL_ADMIN_USERNAME/)
  })
})
