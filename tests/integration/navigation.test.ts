import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type AdminClient, publishBasicPage, rawRequest, setupOwner } from '../support/client'
import { startServer, type TestServer } from '../support/server'

let server: TestServer
let admin: AdminClient

interface Site {
  nav: Array<{ id: string; label: string; href: string; icon: string }>
}

async function site(): Promise<Site> {
  const result = await admin.send('/api/admin/settings')
  return result.json<{ settings: { site: Site } }>().settings.site
}

beforeAll(async () => {
  server = await startServer()
  admin = await setupOwner(server)
  await publishBasicPage(admin, [{ title: 'Start', url: 'https://shop.example.com' }])
})

afterAll(async () => {
  await server.stop()
})

describe('buttons to subpages', () => {
  it('refuses a target that leaves the site unnoticed', async () => {
    const current = await site()
    for (const href of ['//evil.example.com', 'javascript:alert(1)', 'quellen']) {
      const response = await admin.send('/api/admin/settings/site', {
        method: 'PUT',
        body: {
          ...current,
          nav: [{ id: 'navAAAAAAAAA', label: 'x', href, icon: 'tabler:world' }],
        },
      })
      expect(response.status, href).toBe(422)
    }
  })

  it('renders an internal and an external button after publishing', async () => {
    const current = await site()
    const saved = await admin.send('/api/admin/settings/site', {
      method: 'PUT',
      body: {
        ...current,
        nav: [
          { id: 'navAAAAAAAAA', label: 'Quellen', href: '/quellen', icon: 'tabler:list-check' },
          {
            id: 'navBBBBBBBBB',
            label: 'Shop',
            href: 'https://shop.example.com',
            icon: 'tabler:world',
          },
        ],
      },
    })
    expect(saved.status).toBe(200)
    const before = await rawRequest(server, '/', { ip: '203.0.113.21' })
    expect(before.text).not.toContain('href="/quellen"')

    await admin.send('/api/admin/publish', { body: { note: '' } })
    const page = await rawRequest(server, '/', { ip: '203.0.113.22' })
    expect(page.text).toContain('href="/quellen"')
    expect(page.text).toContain('href="https://shop.example.com"')
    expect(page.text).toContain('target="_blank"')
    expect(page.text).toContain('<svg')
  })

  it('keeps at most six buttons', async () => {
    const current = await site()
    const many = Array.from({ length: 7 }, (_, index) => ({
      id: `navAAAAAAAA${index}`,
      label: `Link ${index}`,
      href: '/quellen',
      icon: 'tabler:world',
    }))
    const response = await admin.send('/api/admin/settings/site', {
      method: 'PUT',
      body: { ...current, nav: many },
    })
    expect(response.status).toBe(422)
  })
})
