import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type AdminClient, publishBasicPage, rawRequest, setupOwner } from '../support/client'
import { startServer, type TestServer } from '../support/server'

let server: TestServer
let admin: AdminClient
const restoreDir = mkdtempSync(join(tmpdir(), 'wsl-restore-'))

function run(script: string, args: string[], dataDir: string): string {
  return execFileSync(process.execPath, [script, ...args], {
    env: { PATH: process.env.PATH ?? '', DATA_DIR: dataDir },
    encoding: 'utf8',
  })
}

beforeAll(async () => {
  server = await startServer()
  admin = await setupOwner(server)
  for (let attempt = 0; attempt < 60; attempt++) {
    const media = (await admin.send('/api/admin/media')).json<unknown[]>()
    if (media.length > 0) break
    await new Promise((wait) => setTimeout(wait, 500))
  }
  await publishBasicPage(admin, [{ title: 'Gesicherter Link', url: 'https://example.com/backup' }])
})

afterAll(async () => {
  await server.stop()
  rmSync(restoreDir, { recursive: true, force: true })
})

describe('backup and restore', () => {
  it('restores database and media into a fresh data directory that serves the same page', async () => {
    const output = run('scripts/backup.mjs', [], server.dataDir)
    const backup = /Backup written to (\S+)/.exec(output)?.[1] ?? ''
    expect(readdirSync(backup).sort()).toEqual(['app.sqlite', 'media.zip'])

    const restored = run('scripts/restore.mjs', [backup], restoreDir)
    expect(restored).toMatch(/Restored \d+ media files/)
    expect(readdirSync(join(restoreDir, 'media')).length).toBeGreaterThan(0)

    const copy = await startServer({ DATA_DIR: restoreDir })
    try {
      const page = await rawRequest(copy, '/', {
        headers: { accept: 'text/html' },
        ip: '203.0.113.60',
      })
      expect(page.status).toBe(200)
      expect(page.text).toContain('Gesicherter Link')
      const avatar = /\/media\/[A-Za-z0-9_-]{12}-[0-9a-f]{8}-\d+\.webp/.exec(page.text)?.[0] ?? ''
      expect(avatar).not.toBe('')
      expect((await rawRequest(copy, avatar, { ip: '203.0.113.60' })).status).toBe(200)
    } finally {
      await copy.stop()
    }
  })

  it('refuses a directory without a backup', () => {
    expect(() => run('scripts/restore.mjs', [restoreDir], restoreDir)).toThrow()
  })
})
