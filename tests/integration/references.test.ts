import { readFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { strToU8, zipSync } from 'fflate'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type AdminClient, publishBasicPage, rawRequest, setupOwner } from '../support/client'
import { startServer, type TestServer } from '../support/server'

const FIXTURES = 'tests/fixtures/references'
const FILES = ['videos/2025/Schlaf-Grundlagen.md', 'shorts/2025/Koffein-am-Abend.md']

let archive = zipSync(
  Object.fromEntries(
    FILES.map((path) => [
      `repo-main/${path}`,
      strToU8(readFileSync(`${FIXTURES}/${path}`, 'utf8')),
    ]),
  ),
)
let github: Server
let server: TestServer
let admin: AdminClient
const requests: string[] = []

const SETTINGS = {
  enabled: true,
  title: 'Quellenangaben',
  intro: 'Studien zu jedem Video.',
  path: 'quellen',
  aliases: ['quellenangaben', 'sources'],
  repository: 'https://github.com/beispiel/quellen',
  branch: 'main',
}

async function page(path: string) {
  return rawRequest(server, path, {
    headers: {
      accept: 'text/html',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36',
    },
  })
}

beforeAll(async () => {
  github = createServer((request, response) => {
    requests.push(request.url ?? '')
    if (request.url === '/beispiel/quellen/zip/refs/heads/main') {
      response.writeHead(200, { 'content-type': 'application/zip' })
      response.end(Buffer.from(archive))
    } else {
      response.writeHead(404)
      response.end()
    }
  })
  await new Promise<void>((done) => github.listen(0, '127.0.0.1', done))
  const { port } = github.address() as AddressInfo
  server = await startServer({
    REFERENCES_ARCHIVE_ORIGIN: `http://127.0.0.1:${port}`,
    ANALYTICS_FLUSH_SECONDS: '1',
  })
  admin = await setupOwner(server)
})

afterAll(async () => {
  await server.stop()
  await new Promise((done) => github.close(done))
})

describe('references sync', () => {
  it('needs a repository before it can sync', async () => {
    const status = await admin.send('/api/admin/references/sync', { body: {} })
    expect(status.json()).toMatchObject({ ok: false, error: 'repository_missing' })
  })

  it('validates the settings', async () => {
    const response = await admin.send('/api/admin/settings/references', {
      method: 'PUT',
      body: { ...SETTINGS, path: 'admin', repository: 'https://example.com/x/y' },
    })
    expect(response.status).toBe(422)
    expect(response.json<{ data: { fields: Record<string, string> } }>().data.fields).toMatchObject(
      { path: 'reserved', repository: 'repository_invalid' },
    )
  })

  it('reports a missing branch', async () => {
    await admin.send('/api/admin/settings/references', {
      method: 'PUT',
      body: { ...SETTINGS, branch: 'gibt-es-nicht' },
    })
    const status = await admin.send('/api/admin/references/sync', { body: {} })
    expect(status.json()).toMatchObject({ ok: false, error: 'repository_not_found' })
  })

  it('imports the documents from the archive', async () => {
    await admin.send('/api/admin/settings/references', { method: 'PUT', body: SETTINGS })
    const status = await admin.send('/api/admin/references/sync', { body: {} })
    expect(status.json()).toMatchObject({ ok: true, documents: 2, added: 2 })
    expect(requests.at(-1)).toBe('/beispiel/quellen/zip/refs/heads/main')
    const list = await admin.send('/api/admin/references')
    const body = list.json<{
      status: { ok: boolean }
      documents: Array<{ slug: string; claims: number; sources: number; warnings: unknown[] }>
    }>()
    expect(body.status.ok).toBe(true)
    expect(body.documents).toEqual([
      expect.objectContaining({ slug: 'koffein-am-abend', claims: 2, sources: 1, warnings: [] }),
      expect.objectContaining({
        slug: 'schlaf-grundlagen',
        claims: 4,
        sources: 3,
        warnings: [{ code: 'ref_unknown', detail: '9' }],
      }),
    ])
  })

  it('needs an admin session', async () => {
    const anonymous = await rawRequest(server, '/api/admin/references/sync', { method: 'POST' })
    expect([401, 403]).toContain(anonymous.status)
  })
})

describe('references pages', () => {
  it('stay hidden until the settings are published', async () => {
    expect((await page('/quellen')).status).toBe(404)
    await publishBasicPage(admin, [{ title: 'Start', url: 'https://shop.example.com' }])
    expect((await page('/quellen')).status).toBe(200)
  })

  it('list, search and filter the entries without cookies or inline scripts', async () => {
    const index = await page('/quellen')
    expect(index.headers['set-cookie']).toBeUndefined()
    expect(index.headers['x-robots-tag']).toContain('noindex')
    expect(String(index.headers['content-security-policy'])).not.toContain('unsafe-inline')
    expect(index.text).toContain('<h1 class="p-name r-heading">Quellenangaben</h1>')
    expect(index.text).toContain('href="/quellen/schlaf-grundlagen"')
    expect(index.text).toContain('href="/quellen/koffein-am-abend"')
    expect(index.text).toContain('<script src="/js/references.js" defer>')
    expect(index.text).not.toMatch(/<script(?![^>]*src=)[^>]*>/)

    const search = await page('/quellen?q=Halbwertszeit')
    expect(search.text).toContain('href="/quellen/koffein-am-abend"')
    expect(search.text).not.toContain('href="/quellen/schlaf-grundlagen"')
    expect(search.text).toContain('1 Eintrag')

    const videos = await page('/quellen?type=video')
    expect(videos.text).toContain('href="/quellen/schlaf-grundlagen"')
    expect(videos.text).not.toContain('href="/quellen/koffein-am-abend"')

    const topic = await page('/quellen?topic=Koffein')
    expect(topic.text).toContain('aria-current="true"')
    expect(topic.text).not.toContain('href="/quellen/schlaf-grundlagen"')

    const none = await page('/quellen?q=gibtesnicht')
    expect(none.text).toContain('Keine Einträge gefunden')
  })

  it('render an entry with claims, numbered sources and escaped content', async () => {
    const entry = await page('/quellen/schlaf-grundlagen')
    expect(entry.status).toBe(200)
    expect(entry.text).toContain('Schlaf verstehen: Grundlagen und Mythen')
    expect(entry.text).toContain('data-level="refuted"')
    expect(entry.text).toContain('href="#q-3"')
    expect(entry.text).toContain('id="q-3"')
    expect(entry.text).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(entry.text).not.toContain('href="javascript:')
    expect(entry.text).toContain('Auf YouTube ansehen')
    expect(entry.text).not.toContain('/js/references.js')
  })

  it('redirect the further addresses permanently and keep path and query', async () => {
    const alias = await page('/quellenangaben/koffein-am-abend?x=1')
    expect(alias.status).toBe(301)
    expect(alias.headers.location).toBe('/quellen/koffein-am-abend?x=1')
    expect((await page('/sources')).headers.location).toBe('/quellen')
  })

  it('answer unknown entries with 404', async () => {
    expect((await page('/quellen/gibt-es-nicht')).status).toBe(404)
    expect((await page('/quellen/a/b')).status).toBe(404)
    expect((await page('/quellen/%3Cscript%3E')).status).toBe(404)
  })

  it('show repository updates without publishing again', async () => {
    archive = zipSync({
      'repo-main/shorts/2025/Koffein-am-Abend.md': strToU8(
        readFileSync(`${FIXTURES}/shorts/2025/Koffein-am-Abend.md`, 'utf8').replace(
          'Koffein am Abend',
          'Koffein am späten Abend',
        ),
      ),
    })
    const status = await admin.send('/api/admin/references/sync', { body: {} })
    expect(status.json()).toMatchObject({ ok: true, documents: 1, updated: 1, removed: 1 })
    expect((await page('/quellen/koffein-am-abend')).text).toContain('Koffein am späten Abend')
    expect((await page('/quellen/schlaf-grundlagen')).status).toBe(404)
  })

  it('do not count as page views', async () => {
    await new Promise((done) => setTimeout(done, 1500))
    const stats = await admin.send('/api/admin/stats?range=7d')
    expect(stats.json<{ summary: { views: number } }>().summary.views).toBe(0)
  })
})

describe('address conflicts', () => {
  it('refuses short links on the references addresses', async () => {
    const response = await admin.send('/api/admin/slugs', {
      body: { kind: 'source', slug: 'sources', sourceKey: 'instagram', label: '' },
    })
    expect(response.status).toBe(409)
  })

  it('blocks publishing when a short link takes a new address', async () => {
    const created = await admin.send('/api/admin/slugs', {
      body: { kind: 'source', slug: 'belege', sourceKey: 'instagram', label: '' },
    })
    expect(created.status).toBe(200)
    await admin.send('/api/admin/settings/references', {
      method: 'PUT',
      body: { ...SETTINGS, aliases: ['belege'] },
    })
    const publish = await admin.send('/api/admin/publish', { body: { note: '' } })
    expect(publish.status).toBe(422)
    expect(publish.text).toContain('references_slug_taken')
  })
})
