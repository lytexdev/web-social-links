import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AdminClient } from '../support/client'
import { multipart, rawRequest, setupOwner } from '../support/client'
import { startServer, type TestServer } from '../support/server'

let server: TestServer
let admin: AdminClient
const fixture = (name: string) => readFileSync(`tests/fixtures/images/${name}`)

const LEGAL = `## Angaben gemäß § 5 DDG

Erika Musterfrau
Musterweg 1
12345 Musterstadt

E-Mail: kontakt@example.com`

interface Block {
  id: string
  type: string
  children: Block[]
}

async function create(
  type: string,
  data: Record<string, unknown>,
  parentId: string | null = null,
): Promise<Block> {
  const response = await admin.send('/api/admin/blocks', { body: { type, parentId, data } })
  expect(response.status, response.text).toBe(200)
  return response.json<Block>()
}

async function upload(name: string, type: string, path = '/api/admin/media', method = 'POST') {
  const form = multipart([{ name: 'file', filename: name, type, data: fixture(name) }])
  return admin.send(path, {
    method,
    rawBody: form.body,
    headers: { 'content-type': form.contentType },
  })
}

beforeAll(async () => {
  server = await startServer()
  admin = await setupOwner(server)
})

afterAll(async () => {
  await server.stop()
})

describe('publishing', () => {
  let group: Block
  let affiliateLink: Block
  let hiddenLink: Block
  let futureLink: Block
  let textBlock: Block

  it('seeds legal pages, platform sources and their short links', async () => {
    const pages = (await admin.send('/api/admin/pages')).json<Array<{ slug: string }>>()
    expect(pages.map((page) => page.slug).sort()).toEqual(['datenschutz', 'impressum'])
    const { sources, slugs } = (await admin.send('/api/admin/sources')).json<{
      sources: unknown[]
      slugs: Array<{ slug: string }>
    }>()
    expect(sources.length).toBe(26)
    expect(slugs.map((slug) => slug.slug)).toContain('ig')
  })

  it('blocks publishing while legal pages contain placeholders', async () => {
    const status = (await admin.send('/api/admin/publish/status')).json<{
      issues: Array<{ code: string }>
    }>()
    expect(status.issues.map((issue) => issue.code)).toContain('legal_placeholders')
    const response = await admin.send('/api/admin/publish', { body: { note: '' } })
    expect(response.status).toBe(422)
    expect(response.json<{ data: { code: string } }>().data.code).toBe('publish_blocked')
  })

  it('builds content and publishes revision 1', async () => {
    const pages = (await admin.send('/api/admin/pages')).json<Array<{ id: string; slug: string }>>()
    for (const page of pages) {
      const response = await admin.send(`/api/admin/pages/${page.id}`, {
        method: 'PATCH',
        body: { markdown: LEGAL },
      })
      expect(response.status).toBe(200)
    }
    await admin.send('/api/admin/settings/profile', {
      method: 'PUT',
      body: {
        displayName: 'Erika Musterfrau',
        handle: '@erika',
        bio: 'Notizen aus dem Labor',
        avatar: null,
        social: [
          {
            id: 'socialAAAAAA',
            label: 'Instagram',
            url: 'https://instagram.com/erika',
            icon: 'tabler:brand-instagram',
          },
        ],
      },
    })
    group = await create('group', { title: 'Supplements', layout: 'list' })
    affiliateLink = await create(
      'link',
      {
        title: 'Omega 3',
        url: 'https://shop.example.com/omega',
        affiliate: true,
        icon: 'tabler:pill',
        appendUtm: true,
      },
      group.id,
    )
    hiddenLink = await create('link', { title: 'Versteckt', url: 'https://example.com/hidden' })
    await admin.send(`/api/admin/blocks/${hiddenLink.id}`, {
      method: 'PATCH',
      body: { visible: false },
    })
    futureLink = await create('link', { title: 'Später', url: 'https://example.com/later' })
    await admin.send(`/api/admin/blocks/${futureLink.id}`, {
      method: 'PATCH',
      body: { visibleFrom: Date.now() + 86_400_000 },
    })
    textBlock = await create('text', {
      markdown: 'Mehr in den [Quellen](https://github.com/example/sources) **jetzt**.',
    })
    await create('code', { label: 'Rabattcode', code: 'LYTEX', partner: 'Partner' })

    const status = (await admin.send('/api/admin/publish/status')).json<{
      issues: unknown[]
      draftChanges: number
    }>()
    expect(status.issues).toEqual([])
    expect(status.draftChanges).toBeGreaterThan(0)
    const published = await admin.send('/api/admin/publish', { body: { note: 'Erste Version' } })
    expect(published.json()).toEqual({ revision: 1 })
  })

  it('renders the public page without scripts, cookies or hydration', async () => {
    const page = await rawRequest(server, '/', {
      ip: '203.0.113.5',
      headers: { accept: 'text/html' },
    })
    expect(page.status).toBe(200)
    expect(page.headers['set-cookie']).toBeUndefined()
    expect(page.headers['cache-control']).toBe('no-cache')
    const html = page.text
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">')
    expect(html).toContain('Erika Musterfrau')
    expect(html).toMatch(new RegExp(`href="/go/${affiliateLink.id}"`))
    expect(html).toContain('>Anzeige<')
    expect(html).toContain('Mit „Anzeige“ markierte Links sind Affiliate-Links')
    expect(html).not.toContain('Versteckt')
    expect(html).not.toContain('Später')
    expect(html).toContain(`/go/t/${textBlock.id}/0`)
    expect(html).toContain('Rev. 1 · ')
    const scripts = [...html.matchAll(/<script[^>]*>/g)].map((match) => match[0])
    expect(scripts).toEqual(['<script src="/js/enhance.js" defer>'])
    expect(html).not.toContain('__NUXT__')
    const csp = String(page.headers['content-security-policy'])
    expect(csp).not.toMatch(/unsafe-(inline|eval)/)
    expect(csp).toMatch(/style-src 'self' 'sha256-/)
    expect(page.headers['x-robots-tag']).toBe(
      'noindex, nofollow, noarchive, nosnippet, noimageindex',
    )
  })

  it('attributes a source slug to its platform', async () => {
    const page = await rawRequest(server, '/ig', {
      ip: '203.0.113.6',
      headers: { accept: 'text/html' },
    })
    expect(page.status).toBe(200)
    expect(page.text).toContain(`/go/${affiliateLink.id}?s=instagram`)
  })

  it('redirects published links, appends UTM and refuses hidden or scheduled ones', async () => {
    const go = await rawRequest(server, `/go/${affiliateLink.id}?s=instagram`, {
      ip: '203.0.113.7',
    })
    expect(go.status).toBe(302)
    expect(go.headers.location).toBe(
      'https://shop.example.com/omega?utm_source=instagram&utm_medium=link_in_bio',
    )
    expect(go.headers['cache-control']).toBe('no-store')
    expect((await rawRequest(server, `/go/${hiddenLink.id}`, { ip: '203.0.113.7' })).status).toBe(
      404,
    )
    expect((await rawRequest(server, `/go/${futureLink.id}`, { ip: '203.0.113.7' })).status).toBe(
      404,
    )
    expect((await rawRequest(server, '/go/doesnotexist', { ip: '203.0.113.7' })).status).toBe(404)
    expect(
      (await rawRequest(server, '/go/https:%2F%2Fevil.example', { ip: '203.0.113.7' })).status,
    ).toBe(404)
    const text = await rawRequest(server, `/go/t/${textBlock.id}/0`, { ip: '203.0.113.7' })
    expect(text.headers.location).toBe('https://github.com/example/sources')
    expect(
      (await rawRequest(server, `/go/t/${textBlock.id}/5`, { ip: '203.0.113.7' })).status,
    ).toBe(404)
    const social = await rawRequest(server, '/go/socialAAAAAA?s=evil', { ip: '203.0.113.7' })
    expect(social.headers.location).toBe('https://instagram.com/erika')
  })

  it('creates redirect slugs and rejects reserved or taken ones', async () => {
    const created = await admin.send('/api/admin/slugs', {
      body: { kind: 'redirect', slug: 'Omega3', linkId: affiliateLink.id, label: 'Omega' },
    })
    expect(created.status).toBe(200)
    const redirect = await rawRequest(server, '/omega3', { ip: '203.0.113.8' })
    expect(redirect.status).toBe(302)
    expect(redirect.headers.location).toContain('https://shop.example.com/omega')
    const taken = await admin.send('/api/admin/slugs', {
      body: { kind: 'source', slug: 'ig', sourceKey: 'tiktok' },
    })
    expect(taken.status).toBe(409)
    expect(taken.json<{ data: { fields: { slug: string } } }>().data.fields.slug).toBe(
      'taken:Instagram',
    )
    const reserved = await admin.send('/api/admin/slugs', {
      body: { kind: 'source', slug: 'admin', sourceKey: 'tiktok' },
    })
    expect(reserved.status).toBe(409)
  })

  it('rejects nesting groups and wrong child types', async () => {
    const nested = await admin.send('/api/admin/blocks', {
      body: { type: 'group', parentId: group.id },
    })
    expect(nested.status).toBe(422)
    const text = await admin.send('/api/admin/blocks', {
      body: { type: 'text', parentId: group.id },
    })
    expect(text.status).toBe(422)
  })

  it('reorders blocks into and out of groups', async () => {
    const tree = (await admin.send('/api/admin/blocks')).json<Block[]>()
    const order = tree.map((node) => ({
      id: node.id,
      children: node.children.map((child) => child.id),
    }))
    const target = order.find((entry) => entry.id === group.id)
    const hidden = order.findIndex((entry) => entry.id === hiddenLink.id)
    const [moved] = order.splice(hidden, 1)
    target?.children.push(moved?.id ?? '')
    const response = await admin.send('/api/admin/blocks/order', { method: 'PUT', body: { order } })
    expect(response.status).toBe(200)
    const updated = response.json<Block[]>()
    expect(updated.find((node) => node.id === group.id)?.children.map((child) => child.id)).toEqual(
      [affiliateLink.id, hiddenLink.id],
    )
    const invalid = await admin.send('/api/admin/blocks/order', {
      method: 'PUT',
      body: { order: order.slice(1) },
    })
    expect(invalid.status).toBe(422)
  })

  it('deletes with an undo window and duplicates', async () => {
    const block = await create('heading', { text: 'Temporär', level: 2 })
    expect((await admin.send(`/api/admin/blocks/${block.id}`, { method: 'DELETE' })).status).toBe(
      200,
    )
    let tree = (await admin.send('/api/admin/blocks')).json<Block[]>()
    expect(tree.some((node) => node.id === block.id)).toBe(false)
    expect((await admin.send(`/api/admin/blocks/${block.id}/restore`, { body: {} })).status).toBe(
      200,
    )
    const copy = (await admin.send(`/api/admin/blocks/${group.id}/duplicate`, { body: {} })).json<{
      id: string
    }>()
    tree = (await admin.send('/api/admin/blocks')).json<Block[]>()
    expect(tree.some((node) => node.id === block.id)).toBe(true)
    expect(tree.find((node) => node.id === copy.id)?.children).toHaveLength(2)
  })

  it('restores a published version into the draft', async () => {
    expect((await admin.send('/api/admin/versions/1/restore', { body: {} })).status).toBe(200)
    const tree = (await admin.send('/api/admin/blocks')).json<Block[]>()
    expect(tree.find((node) => node.id === group.id)?.children.map((child) => child.id)).toEqual([
      affiliateLink.id,
    ])
    expect(tree.some((node) => node.type === 'heading')).toBe(false)
    const versions = (await admin.send('/api/admin/versions')).json<
      Array<{ revision: number; note: string }>
    >()
    expect(versions).toEqual([expect.objectContaining({ revision: 1, note: 'Erste Version' })])
  })

  it('serves legal pages from the snapshot', async () => {
    const page = await rawRequest(server, '/impressum', {
      ip: '203.0.113.9',
      headers: { accept: 'text/html' },
    })
    expect(page.status).toBe(200)
    expect(page.text).toContain('<h2>Angaben gemäß § 5 DDG</h2>')
    expect(page.text).toContain('Erika Musterfrau')
  })
})

describe('media pipeline', () => {
  let mediaId = ''

  it('strips EXIF, GPS, XMP, IPTC and ICC and applies the orientation', async () => {
    const response = await upload('with-metadata.jpg', 'image/jpeg')
    expect(response.status, response.text).toBe(200)
    const { media } = response.json<{
      media: { id: string; width: number; height: number; preview: string }
    }>()
    mediaId = media.id
    expect(media.width).toBe(480)
    expect(media.height).toBe(640)
    const file = await rawRequest(server, media.preview, { ip: '203.0.113.20' })
    expect(file.status).toBe(200)
    expect(file.headers['content-type']).toBe('image/webp')
    expect(file.headers['cache-control']).toBe('public, max-age=31536000, immutable')
    expect(file.headers['cross-origin-resource-policy']).toBe('same-origin')
    const raw = await new Promise<Buffer>((resolve, reject) => {
      import('node:http').then(({ get }) =>
        get(
          {
            host: '127.0.0.1',
            port: server.port,
            path: media.preview,
            headers: { host: `127.0.0.1:${server.port}` },
          },
          (res) => {
            const chunks: Buffer[] = []
            res.on('data', (chunk: Buffer) => chunks.push(chunk))
            res.on('end', () => resolve(Buffer.concat(chunks)))
          },
        ).on('error', reject),
      )
    })
    const meta = await sharp(raw).metadata()
    expect(meta.exif).toBeUndefined()
    expect(meta.xmp).toBeUndefined()
    expect(meta.iptc).toBeUndefined()
    expect(meta.icc).toBeUndefined()
    expect(meta.orientation).toBeUndefined()
    expect(raw.includes(Buffer.from('Fixture'))).toBe(false)
  })

  it('deduplicates identical results', async () => {
    const response = await upload('with-metadata.jpg', 'image/jpeg')
    expect(response.json<{ duplicate: boolean; media: { id: string } }>()).toMatchObject({
      duplicate: true,
      media: { id: mediaId },
    })
  })

  it.each([
    ['disguised.jpg', 'image/jpeg', 415, 'type_mismatch'],
    ['polyglot.png', 'image/png', 415, 'unsupported_type'],
    ['huge.png', 'image/png', 422, 'image_invalid'],
    ['script.svg', 'image/svg+xml', 422, 'svg_rejected'],
    ['external.svg', 'image/svg+xml', 422, 'svg_rejected'],
  ])('rejects %s', async (name, type, status, code) => {
    const response = await upload(name, type)
    expect(response.status).toBe(status)
    expect(response.json<{ data: { code: string } }>().data.code).toBe(code)
  })

  it('rasterises a safe SVG', async () => {
    const response = await upload('safe.svg', 'image/svg+xml')
    expect(response.status).toBe(200)
    expect(response.json<{ media: { preview: string } }>().media.preview).toMatch(/\.webp$/)
  })

  it('refuses to delete media that is in use', async () => {
    await admin.send('/api/admin/settings/site', { method: 'PUT', body: { ogImage: mediaId } })
    const response = await admin.send(`/api/admin/media/${mediaId}`, { method: 'DELETE' })
    expect(response.status).toBe(409)
  })
})

describe('meta routes', () => {
  it('allows crawling but blocks AI crawlers without revealing the admin', async () => {
    const robots = await rawRequest(server, '/robots.txt', { ip: '203.0.113.30' })
    expect(robots.text).toContain('User-agent: GPTBot\nDisallow: /')
    expect(robots.text).toContain('User-agent: *\nAllow: /')
    expect(robots.text).not.toContain('admin')
  })

  it('publishes security.txt and an opaque health check', async () => {
    const security = await rawRequest(server, '/.well-known/security.txt', { ip: '203.0.113.31' })
    expect(security.text).toContain('Contact: mailto:security@example.com')
    expect(security.text).toMatch(/Expires: \d{4}-\d{2}-\d{2}T/)
    const health = await rawRequest(server, '/healthz', { ip: '203.0.113.31' })
    expect(health.text).toBe('ok')
  })
})
