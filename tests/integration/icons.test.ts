import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type AdminClient, setupOwner } from '../support/client'
import { startServer, type TestServer } from '../support/server'

let server: TestServer
let admin: AdminClient

beforeAll(async () => {
  server = await startServer()
  admin = await setupOwner(server)
})

afterAll(async () => {
  await server.stop()
})

describe('icon picker API', () => {
  it('serves the icon index with brand icons', async () => {
    const response = await admin.send('/api/admin/icons')
    expect(response.status).toBe(200)
    const refs = response
      .json<{ icons: Array<[string, string, string, string]> }>()
      .icons.map(([ref]) => ref)
    expect(refs.length).toBeGreaterThan(5000)
    expect(refs).toContain('tabler:brand-youtube')
    expect(refs).toContain('si:youtube')
    const etag = String(response.headers.etag)
    expect(response.headers['cache-control']).toBe('private, no-cache')
    const again = await admin.send('/api/admin/icons', { headers: { 'if-none-match': etag } })
    expect(again.status).toBe(304)
  })

  it('serves SVG bodies for picked icons', async () => {
    const refs = encodeURIComponent(
      'tabler:brand-youtube,si:youtube,extra:nasal-spray,tabler:missing-icon',
    )
    const response = await admin.send(`/api/admin/icons/svg?refs=${refs}`)
    expect(response.status).toBe(200)
    const svgs = response.json<Record<string, string>>()
    expect(Object.keys(svgs).sort()).toEqual([
      'extra:nasal-spray',
      'si:youtube',
      'tabler:brand-youtube',
    ])
    expect(svgs['si:youtube']).toMatch(/^<svg [^>]*viewBox="0 0 24 24"/)
    expect(svgs['extra:nasal-spray']).toMatch(/^<svg [^>]*stroke="currentColor"/)
  })
})
