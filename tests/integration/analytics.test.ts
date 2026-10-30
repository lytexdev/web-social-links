import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type AdminClient, publishBasicPage, rawRequest, setupOwner } from '../support/client'
import { startServer, type TestServer } from '../support/server'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const INSTAGRAM =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 337.0.3.23.54 (iPhone14,5; iOS 17_5; de_DE; de; scale=3.00; 1170x2532; 618023787)'

let server: TestServer
let admin: AdminClient
let linkId = ''

interface Report {
  summary: { views: number; clicks: number; previews: number; uniques: number }
  sources: Array<{ key: string; views: number; clicks: number }>
  links: Array<{ key: string; clicks: number; label: string }>
  dimensions: Record<string, Array<{ key: string; views: number; clicks: number }>>
}

function db(): Database.Database {
  return new Database(join(server.dataDir, 'app.sqlite'), { readonly: true })
}

async function visit(path: string, headers: Record<string, string> = {}, method = 'GET') {
  return rawRequest(server, path, {
    method,
    ip: '203.0.113.50',
    headers: { 'user-agent': IPHONE, accept: 'text/html', ...headers },
  })
}

async function report(query = 'range=7d'): Promise<Report> {
  return (await admin.send(`/api/admin/stats?${query}`)).json<Report>()
}

beforeAll(async () => {
  server = await startServer({ ANALYTICS_FLUSH_SECONDS: '1' })
  admin = await setupOwner(server)
  const ids = await publishBasicPage(admin, [
    { title: 'Omega 3', url: 'https://shop.example.com/omega' },
  ])
  linkId = ids[0] ?? ''
})

afterAll(async () => {
  await server.stop()
})

describe('counting rules', () => {
  it('counts human views and clicks and attributes their source', async () => {
    await visit('/')
    await visit('/', { referer: 'https://l.instagram.com/?u=x' })
    await visit('/ig')
    await visit('/', { 'user-agent': INSTAGRAM })
    await visit('/?utm_source=yt&utm_campaign=Launch%202026')
    await visit(`/go/${linkId}?s=instagram`)
    await visit(`/go/${linkId}`)
    const result = await report()
    expect(result.summary).toMatchObject({ views: 5, clicks: 2, previews: 0 })
    const sources = Object.fromEntries(result.sources.map((row) => [row.key, row]))
    expect(sources.instagram).toMatchObject({ views: 3, clicks: 1 })
    expect(sources.youtube).toMatchObject({ views: 1 })
    expect(sources.direct).toMatchObject({ views: 1, clicks: 1 })
    expect(result.links).toEqual([
      expect.objectContaining({ key: linkId, clicks: 2, label: 'Omega 3' }),
    ])
    expect(result.dimensions.referrer).toEqual([
      expect.objectContaining({ key: 'l.instagram.com', views: 1 }),
    ])
    expect(result.dimensions.utm_campaign).toEqual([
      expect.objectContaining({ key: 'launch2026', views: 1 }),
    ])
    expect(result.dimensions.slug).toEqual([expect.objectContaining({ key: 'ig', views: 1 })])
  })

  it('ignores bots, HEAD, prefetch, errors, the admin and the preview, and counts link previews separately', async () => {
    const before = (await report()).summary
    await visit('/', {
      'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    })
    await visit('/', {}, 'HEAD')
    await visit('/', { 'sec-purpose': 'prefetch' })
    await visit('/missing-page')
    await visit('/', { cookie: admin.cookie })
    await admin.send('/admin/preview')
    await visit('/', {
      'user-agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    })
    await visit('/', { 'user-agent': 'WhatsApp/2.23.20.0' })
    const after = (await report()).summary
    expect(after.views).toBe(before.views)
    expect(after.clicks).toBe(before.clicks)
    expect(after.previews).toBe(before.previews + 2)
  })

  it('stores neither IP addresses nor visitor hashes in aggregated mode', async () => {
    const database = db()
    const rows = database.prepare('SELECT * FROM events').all() as Array<Record<string, unknown>>
    database.close()
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.visitor_hash).toBeNull()
      expect(Object.values(row).some((value) => String(value).includes('203.0.113.50'))).toBe(false)
    }
  })
})

describe('visitor estimation', () => {
  it('hashes visitors per day and respects Global Privacy Control and Do Not Track', async () => {
    const response = await admin.send('/api/admin/settings/analytics', {
      method: 'PUT',
      body: { mode: 'visitors', retentionDays: 30, utmSource: '', utmMedium: 'link_in_bio' },
    })
    expect(response.status).toBe(200)
    await new Promise((wait) => setTimeout(wait, 31_000))
    await visit('/', {}, 'GET')
    await visit('/')
    await rawRequest(server, '/', {
      ip: '203.0.113.99',
      headers: { 'user-agent': IPHONE, accept: 'text/html' },
    })
    await visit('/', { 'sec-gpc': '1' })
    await visit('/', { dnt: '1' })
    await report()
    const database = db()
    const hashes = database
      .prepare("SELECT visitor_hash FROM events WHERE type = 'view' ORDER BY id DESC LIMIT 5")
      .all() as Array<{ visitor_hash: string | null }>
    const salts = database.prepare('SELECT day FROM analytics_salts').all()
    database.close()
    const values = hashes.map((row) => row.visitor_hash).reverse()
    expect(values[0]).toMatch(/^[0-9a-f]{32}$/)
    expect(values[1]).toBe(values[0])
    expect(values[2]).not.toBe(values[0])
    expect(values[3]).toBeNull()
    expect(values[4]).toBeNull()
    expect(salts).toHaveLength(1)
    expect((await report()).summary.uniques).toBe(2)
  }, 60_000)
})

describe('report export', () => {
  it('matches the dashboard numbers exactly', async () => {
    const result = await report('range=30d')
    const csv = await admin.send('/api/admin/stats/export.csv?range=30d')
    expect(csv.headers['content-type']).toContain('text/csv')
    const total =
      csv.text
        .split('\n')
        .find((line) => line.startsWith('total,'))
        ?.split(',') ?? []
    expect(total.slice(3).map(Number)).toEqual([
      result.summary.views,
      result.summary.clicks,
      result.summary.previews,
      result.summary.uniques,
    ])
    const sourceViews = csv.text
      .split('\n')
      .filter((line) => line.startsWith('source,'))
      .reduce((sum, line) => sum + Number(line.split(',')[3]), 0)
    expect(sourceViews).toBe(result.summary.views)
  })

  it('compares with the previous period and supports 24 hours', async () => {
    const day = await report('range=24h')
    expect(day.summary.views).toBeGreaterThan(0)
    const filtered = await report('range=7d&source=instagram')
    expect(filtered.summary.views).toBe(
      filtered.sources.find((row) => row.key === 'instagram')?.views,
    )
  })
})
