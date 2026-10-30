import { Secret, TOTP } from 'otpauth'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AdminClient, rawRequest } from '../support/client'
import { startServer, type TestServer } from '../support/server'

let server: TestServer
const NEW_PASSWORD = 'correct horse battery staple 7'

let lastStep = 0

async function freshCode(secret: string): Promise<string> {
  while (lastStep > Math.floor(Date.now() / 30_000)) {
    await new Promise((wait) => setTimeout(wait, 500))
  }
  const step = Math.max(Math.floor(Date.now() / 30_000), lastStep + 1)
  lastStep = step
  return new TOTP({
    secret: Secret.fromBase32(secret),
    digits: 6,
    period: 30,
    algorithm: 'SHA1',
  }).generate({
    timestamp: step * 30_000,
  })
}

beforeAll(async () => {
  server = await startServer()
})

afterAll(async () => {
  await server.stop()
})

describe('first login and setup', () => {
  const client = () => new AdminClient(server, '198.51.100.20')
  let admin: AdminClient
  let totpSecret = ''
  let recoveryCodes: string[] = []

  it('logs the initial credential warning', () => {
    expect(server.logs.some((line) => line.includes('initial_credentials_active'))).toBe(true)
  })

  it('accepts the initial credentials and forces the setup', async () => {
    admin = client()
    const response = await admin.login('admin', 'admin123')
    expect(response.status).toBe(200)
    expect(response.json()).toEqual({ next: 'setup' })
    const cookie = admin.cookie
    expect(cookie.startsWith('__Host-wsl_session=')).toBe(true)
    const me = await admin.send('/api/admin/auth/me')
    expect(me.json()).toMatchObject({
      authenticated: true,
      user: { mustChangePassword: true, setupComplete: false },
    })
  })

  it('blocks every other API until the setup is done', async () => {
    const response = await admin.send('/api/admin/sessions')
    expect(response.status).toBe(403)
    expect(response.json<{ data: { code: string } }>().data.code).toBe('setup_required')
  })

  it('rejects weak and reused passwords with a specific reason', async () => {
    const cases: Array<[string, string]> = [
      ['short', 'too_short'],
      ['admin123', 'too_short'],
      ['passwordpassword', 'common'],
    ]
    for (const [password, reason] of cases) {
      const response = await admin.send('/api/admin/setup/password', { body: { password } })
      expect(response.status).toBe(422)
      expect(
        response.json<{ data: { fields: Record<string, string> } }>().data.fields.password,
      ).toBe(reason)
    }
  })

  it('changes the password and rotates the session', async () => {
    const before = admin.cookie
    const response = await admin.send('/api/admin/setup/password', {
      body: { password: NEW_PASSWORD },
    })
    expect(response.status).toBe(200)
    expect(admin.cookie).not.toBe(before)
    await admin.refreshCsrf()
  })

  it('never accepts the initial password again', async () => {
    const other = new AdminClient(server, '198.51.100.21')
    const response = await other.login('admin', 'admin123')
    expect(response.status).toBe(401)
  })

  it('renames the account', async () => {
    const response = await admin.send('/api/admin/setup/username', { body: { username: 'Owner' } })
    expect(response.status).toBe(200)
    expect(response.json()).toEqual({ username: 'owner' })
    await admin.refreshCsrf()
  })

  it('enrolls TOTP and returns ten recovery codes once', async () => {
    const start = await admin.send('/api/admin/setup/totp-start', { body: {} })
    expect(start.status).toBe(200)
    const body = start.json<{ secret: string; uri: string; qr: string }>()
    expect(body.uri).toMatch(/^otpauth:\/\/totp\/.*algorithm=SHA1&digits=6&period=30/)
    expect(body.qr.startsWith('data:image/svg+xml;base64,')).toBe(true)
    totpSecret = body.secret
    const wrong = await admin.send('/api/admin/setup/totp-confirm', { body: { code: '000000' } })
    expect(wrong.status).toBe(422)
    const confirm = await admin.send('/api/admin/setup/totp-confirm', {
      body: { code: await freshCode(totpSecret) },
    })
    expect(confirm.status).toBe(200)
    recoveryCodes = confirm.json<{ recoveryCodes: string[] }>().recoveryCodes
    expect(recoveryCodes).toHaveLength(10)
    expect(recoveryCodes[0]).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/)
    await admin.refreshCsrf()
    expect((await admin.send('/api/admin/setup/finish', { body: {} })).status).toBe(200)
    expect((await admin.send('/api/admin/sessions')).status).toBe(200)
  })

  it('requires the second factor and rejects a replayed code', async () => {
    const first = new AdminClient(server, '198.51.100.22')
    const login = await first.login('owner', NEW_PASSWORD)
    const { next, challenge } = login.json<{ next: string; challenge: string }>()
    expect(next).toBe('totp')
    const code = await freshCode(totpSecret)
    const ok = await first.send('/api/admin/auth/totp', { body: { challenge, code } })
    expect(ok.status).toBe(200)

    const second = new AdminClient(server, '198.51.100.23')
    const again = await second.login('owner', NEW_PASSWORD)
    const replay = await second.send('/api/admin/auth/totp', {
      body: { challenge: again.json<{ challenge: string }>().challenge, code },
    })
    expect(replay.status).toBe(401)
  })

  it('accepts a recovery code exactly once', async () => {
    const code = recoveryCodes[0] ?? ''
    const first = new AdminClient(server, '198.51.100.24')
    const login = await first.login('owner', NEW_PASSWORD)
    const ok = await first.send('/api/admin/auth/totp', {
      body: { challenge: login.json<{ challenge: string }>().challenge, code: code.toLowerCase() },
    })
    expect(ok.status).toBe(200)
    const second = new AdminClient(server, '198.51.100.25')
    const again = await second.login('owner', NEW_PASSWORD)
    const reused = await second.send('/api/admin/auth/totp', {
      body: { challenge: again.json<{ challenge: string }>().challenge, code },
    })
    expect(reused.status).toBe(401)
  })

  it('expires a challenge after five wrong codes', async () => {
    const attacker = new AdminClient(server, '198.51.100.26')
    const login = await attacker.login('owner', NEW_PASSWORD)
    const challenge = login.json<{ challenge: string }>().challenge
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await attacker.send('/api/admin/auth/totp', {
        body: { challenge, code: '123456' },
      })
      expect(response.status).toBe(401)
    }
    const after = await attacker.send('/api/admin/auth/totp', {
      body: { challenge, code: await freshCode(totpSecret) },
    })
    expect(after.status).toBe(410)
  })

  it('allows sensitive actions right after a full login', async () => {
    const session = new AdminClient(server, '198.51.100.27')
    const login = await session.login('owner', NEW_PASSWORD)
    await session.send('/api/admin/auth/totp', {
      body: {
        challenge: login.json<{ challenge: string }>().challenge,
        code: await freshCode(totpSecret),
      },
    })
    await session.refreshCsrf()
    expect((await session.send('/api/admin/sessions')).status).toBe(200)
    const disableWrong = await session.send('/api/admin/account/totp-disable', {
      body: { password: NEW_PASSWORD, code: '000000' },
    })
    expect(disableWrong.status).toBe(422)
  }, 60_000)

  it('disables TOTP with password and a valid code', async () => {
    const response = await admin.send('/api/admin/account/totp-disable', {
      body: { password: NEW_PASSWORD, code: await freshCode(totpSecret) },
    })
    expect(response.status).toBe(200)
    await admin.refreshCsrf()
    const me = await admin.send('/api/admin/auth/me')
    expect(me.json()).toMatchObject({ user: { totpEnabled: false } })
  }, 60_000)

  it('signs out other sessions on password change', async () => {
    const other = new AdminClient(server, '198.51.100.28')
    expect((await other.login('owner', NEW_PASSWORD)).status).toBe(200)
    const response = await admin.send('/api/admin/account/password', {
      body: { password: `${NEW_PASSWORD}!` },
    })
    expect(response.status).toBe(200)
    expect((await other.send('/api/admin/auth/me')).json()).toEqual({ authenticated: false })
  })
})

describe('request protection', () => {
  it('rejects state changes without CSRF token or with a foreign origin', async () => {
    const admin = new AdminClient(server, '198.51.100.30')
    await admin.login('owner', `${NEW_PASSWORD}!`)
    const missing = await admin.send('/api/admin/auth/logout', {
      body: {},
      headers: { 'x-csrf-token': '' },
    })
    expect(missing.status).toBe(403)
    const foreign = await admin.send('/api/admin/auth/logout', {
      body: {},
      headers: { origin: 'https://evil.example' },
    })
    expect(foreign.status).toBe(403)
    expect((await admin.send('/api/admin/auth/logout', { body: {} })).status).toBe(200)
  })

  it('treats a filled honeypot or a fast submit as a failure', async () => {
    const bot = new AdminClient(server, '198.51.100.31')
    const token = await bot.formToken()
    const filled = await bot.send('/api/admin/auth/login', {
      body: { username: 'owner', password: `${NEW_PASSWORD}!`, website: 'spam', formToken: token },
    })
    expect(filled.status).toBe(401)
    const fresh = (await bot.send('/api/admin/auth/form-token')).json<{ token: string }>().token
    const fast = await bot.send('/api/admin/auth/login', {
      body: { username: 'owner', password: `${NEW_PASSWORD}!`, website: '', formToken: fresh },
    })
    expect(fast.status).toBe(401)
  })

  it('limits attempts per address and user, then locks the user across addresses', async () => {
    const token = await new AdminClient(server, '198.51.100.40').formToken()
    const attempt = (ip: string) =>
      new AdminClient(server, ip).send('/api/admin/auth/login', {
        body: { username: 'victim', password: 'wrong password 1', website: '', formToken: token },
      })
    const statuses: number[] = []
    for (let index = 0; index < 6; index++) statuses.push((await attempt('198.51.100.41')).status)
    expect(statuses.slice(0, 5).every((status) => status === 401)).toBe(true)
    expect(statuses[5]).toBe(429)
    for (let index = 0; index < 5; index++) await attempt(`198.51.100.${50 + index}`)
    const locked = await attempt('198.51.100.60')
    expect(locked.status).toBe(429)
    expect(Number(locked.headers['retry-after'])).toBeGreaterThan(0)
  }, 120_000)

  it('bans an address after two trap hits for the admin only', async () => {
    const ip = '198.51.100.70'
    expect((await rawRequest(server, '/wp-login.php', { ip })).status).toBe(404)
    expect((await rawRequest(server, '/.env', { ip })).status).toBe(404)
    expect((await rawRequest(server, '/api/admin/auth/me', { ip })).status).toBe(403)
    expect((await rawRequest(server, '/healthz', { ip })).status).toBe(200)
  })

  it('redirects alias hosts and refuses unknown hosts', async () => {
    const alias = await rawRequest(server, '/ig?utm_source=x', {
      host: `alias.test:${server.port}`,
    })
    expect(alias.status).toBe(301)
    expect(alias.headers.location).toBe(`${server.origin}/ig?utm_source=x`)
    expect((await rawRequest(server, '/', { host: 'evil.example' })).status).toBe(421)
  })

  it('sends the security headers on API responses', async () => {
    const response = await rawRequest(server, '/api/admin/auth/me', { ip: '198.51.100.80' })
    expect(response.headers['x-robots-tag']).toBe(
      'noindex, nofollow, noarchive, nosnippet, noimageindex',
    )
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-frame-options']).toBe('DENY')
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.headers['referrer-policy']).toBe('no-referrer')
    expect(response.headers['content-security-policy']).toContain("default-src 'none'")
    expect(response.headers['x-powered-by']).toBeUndefined()
  })
})

describe('reset-admin script', () => {
  it('restores access with a one-time password and forces the setup', async () => {
    const { execFileSync } = await import('node:child_process')
    const output = execFileSync(process.execPath, ['scripts/reset-admin.mjs'], {
      env: { PATH: process.env.PATH ?? '', DATA_DIR: server.dataDir },
      encoding: 'utf8',
    })
    const password = /One-time password: (\S+)/.exec(output)?.[1] ?? ''
    expect(password).toMatch(/^[a-z2-9]{6}(-[a-z2-9]{6}){3}$/)
    const old = new AdminClient(server, '198.51.100.90')
    expect((await old.login('owner', `${NEW_PASSWORD}!`)).status).toBe(401)
    const fresh = new AdminClient(server, '198.51.100.91')
    const response = await fresh.login('owner', password)
    expect(response.status).toBe(200)
    expect(response.json()).toEqual({ next: 'setup' })
  })
})
