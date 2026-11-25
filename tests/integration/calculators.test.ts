import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type AdminClient, publishBasicPage, rawRequest, setupOwner } from '../support/client'
import { startServer, type TestServer } from '../support/server'

let server: TestServer
let admin: AdminClient

const SETTINGS = {
  path: 'rechner',
  indexTitle: 'Rechner',
  indexIntro: 'Werkzeuge zum Nachrechnen.',
  calories: { enabled: true, title: 'Kalorienrechner', intro: 'Grundumsatz und Bedarf.' },
  peptide: { enabled: true, title: 'Peptid-Rechner', intro: 'Konzentration und Einheiten.' },
  halflife: { enabled: true, title: 'Wirkstoff-Abbau', intro: 'Was noch im Körper ist.' },
}

async function page(path: string) {
  return rawRequest(server, path, {
    headers: {
      accept: 'text/html',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36',
    },
  })
}

function reading(html: string, key: string): string {
  return new RegExp(`data-calc="${key}"[^>]*>([^<]*)`).exec(html)?.[1]?.trim() ?? ''
}

beforeAll(async () => {
  server = await startServer({ ANALYTICS_FLUSH_SECONDS: '1' })
  admin = await setupOwner(server)
})

afterAll(async () => {
  await server.stop()
})

describe('calculator settings', () => {
  it('refuses a reserved address and an address taken by a short link', async () => {
    const reserved = await admin.send('/api/admin/settings/calculators', {
      method: 'PUT',
      body: { ...SETTINGS, path: 'admin' },
    })
    expect(reserved.status).toBe(422)
    await admin.send('/api/admin/settings/calculators', { method: 'PUT', body: SETTINGS })
    const slug = await admin.send('/api/admin/slugs', {
      body: { kind: 'url', slug: 'rechner', url: 'https://example.com' },
    })
    expect(slug.status).toBe(409)
  })

  it('stays hidden until the settings are published', async () => {
    expect((await page('/rechner')).status).toBe(404)
    await publishBasicPage(admin, [{ title: 'Start', url: 'https://shop.example.com' }])
    expect((await page('/rechner')).status).toBe(200)
  })
})

describe('calculator pages', () => {
  it('lists the enabled calculators and hides the disabled ones', async () => {
    const index = await page('/rechner')
    expect(index.text).toContain('href="/rechner/kalorien"')
    expect(index.text).toContain('href="/rechner/peptide"')
    await admin.send('/api/admin/settings/calculators', {
      method: 'PUT',
      body: { ...SETTINGS, peptide: { ...SETTINGS.peptide, enabled: false } },
    })
    await admin.send('/api/admin/publish', { body: { note: '' } })
    expect((await page('/rechner')).text).not.toContain('href="/rechner/peptide"')
    expect((await page('/rechner/peptide')).status).toBe(404)
    await admin.send('/api/admin/settings/calculators', { method: 'PUT', body: SETTINGS })
    await admin.send('/api/admin/publish', { body: { note: '' } })
  })

  it('renders a linked image with a caption below the calculator', async () => {
    await admin.send('/api/admin/settings/calculators', {
      method: 'PUT',
      body: {
        ...SETTINGS,
        calories: {
          ...SETTINGS.calories,
          content:
            '## Dazu passend\n\n[![Waage](/media/abcdefghijkl-1a2b3c4d-640.webp "Unsere Empfehlung")](https://shop.example.com/waage)',
        },
      },
    })
    await admin.send('/api/admin/publish', { body: { note: '' } })
    const rendered = await page('/rechner/kalorien')
    expect(rendered.text).toContain('<h2>Dazu passend</h2>')
    expect(rendered.text).toContain('<figure>')
    expect(rendered.text).toContain('href="https://shop.example.com/waage" rel="noopener"')
    expect(rendered.text).toContain('<img src="/media/abcdefghijkl-1a2b3c4d-640.webp" alt="Waage">')
    expect(rendered.text).toContain('<figcaption>Unsere Empfehlung</figcaption>')
    await admin.send('/api/admin/settings/calculators', { method: 'PUT', body: SETTINGS })
    await admin.send('/api/admin/publish', { body: { note: '' } })
  })

  it('computes the calories on the server without cookies or inline scripts', async () => {
    const result = await page(
      '/rechner/kalorien?sex=female&age=42&height=165&weight=62&fat=24&activity=moderate&sessions=4&minutes=45&intensity=hard',
    )
    expect(result.status).toBe(200)
    expect(result.headers['set-cookie']).toBeUndefined()
    expect(String(result.headers['content-security-policy'])).not.toContain('unsafe-inline')
    expect(reading(result.text, 'lbm')).toBe('47,1')
    expect(reading(result.text, 'bmr')).toBe('1.388')
    expect(reading(result.text, 'tdee')).toBe('2.374')
    expect(result.text).toContain('value="42"')
    expect(result.text).toContain('<script src="/js/calculators.js" type="module">')
    expect(result.text).not.toMatch(/<script(?![^>]*src=)[^>]*>/)
  })

  it('computes the peptide units and the reach of the vial', async () => {
    const result = await page(
      '/rechner/peptide?vial=10&solvent=1&dose=0.5&unit=mg&scale=u40&size=0.5',
    )
    expect(reading(result.text, 'units')).toBe('2')
    expect(reading(result.text, 'capacityUnits')).toBe('20')
    expect(reading(result.text, 'concentrationMgMl')).toBe('10')
    expect(reading(result.text, 'wholeDoses')).toBe('20')
    expect(result.text).toContain('class="c-fill" data-calc-fill')
  })

  it('falls back to defaults for empty or impossible input', async () => {
    const empty = await page('/rechner/kalorien')
    expect(empty.text).toContain('value="30"')
    expect(reading(empty.text, 'bmr')).toBe('1.699')
    const broken = await page('/rechner/kalorien?age=abc&height=9999&weight=-5')
    expect(broken.text).toContain('value="30"')
    expect(broken.text).toContain('value="230"')
  })

  it('computes what is left of a dose and shows the substance data', async () => {
    const result = await page('/rechner/wirkstoff-abbau?substance=caffeine&dose=200&hours=5')
    expect(result.status).toBe(200)
    expect(reading(result.text, 'percent')).toBe('50')
    expect(reading(result.text, 'remaining')).toBe('100')
    expect(reading(result.text, 'half')).toBe('5')
    expect(result.text).toContain('Paraxanthin')
    expect(result.text).toContain('Nachweis im Urin')
    expect(result.text).toContain('<polyline points="0.0,0.0')
  })

  it('shows the build-up only for repeated intake', async () => {
    const once = await page('/rechner/wirkstoff-abbau?substance=caffeine&dose=100&hours=1')
    expect(once.text).toMatch(/data-calc-when="repeated" hidden/)
    const repeated = await page(
      '/rechner/wirkstoff-abbau?substance=caffeine&dose=100&hours=1&interval=5',
    )
    expect(reading(repeated.text, 'accumulation')).toBe('2')
    expect(reading(repeated.text, 'steadyPeak')).toBe('200')
    expect(repeated.text).not.toMatch(/data-calc-when="repeated" hidden/)
  })

  it('does not compute for a substance without a single half-life', async () => {
    const result = await page('/rechner/wirkstoff-abbau?substance=thc&hours=24')
    expect(result.text).toContain('keine einzelne Halbwertszeit')
    expect(result.text).toContain('THC-COOH')
    expect(result.text).toMatch(/data-calc-when="model" hidden/)
  })

  it('answers unknown calculators with 404', async () => {
    expect((await page('/rechner/nope')).status).toBe(404)
    expect((await page('/rechner/kalorien/extra')).status).toBe(404)
    expect((await page('/rechner/wirkstoff-abbau?substance=../etc')).status).toBe(200)
  })

  it('does not count as page views', async () => {
    await new Promise((done) => setTimeout(done, 1500))
    const stats = await admin.send('/api/admin/stats?range=7d')
    expect(stats.json<{ summary: { views: number } }>().summary.views).toBe(0)
  })
})
