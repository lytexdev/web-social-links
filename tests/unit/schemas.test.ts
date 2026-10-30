import { describe, expect, it } from 'vitest'
import { BLOCK_TYPES, draftBlockData, strictBlockData } from '../../shared/schemas/content'
import { PRESETS, checkThemeContrast, themeSchema } from '../../shared/schemas/theme'
import { checkLinkUrl } from '../../shared/utils/url-policy'

describe('block schemas', () => {
  it.each(BLOCK_TYPES)('creates an empty %s draft', (type) => {
    expect(draftBlockData[type].safeParse({}).success).toBe(true)
  })

  it('requires title and url only when publishing', () => {
    const result = strictBlockData.link.safeParse({ title: '', url: '' })
    expect(result.success).toBe(false)
    const codes = result.success
      ? []
      : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`)
    expect(codes).toContain('title:required')
    expect(codes).toContain('url:required')
  })

  it('rejects dangerous link schemes', () => {
    const result = strictBlockData.link.safeParse({ title: 'x', url: 'javascript:alert(1)' })
    expect(result.success ? '' : result.error.issues[0]?.message).toBe('url_scheme')
  })

  it('limits field lengths', () => {
    expect(draftBlockData.link.safeParse({ title: 'x'.repeat(81) }).success).toBe(false)
  })
})

describe('url policy', () => {
  it.each([
    ['https://example.com/path?x=1', true],
    ['http://example.com', true],
    ['mailto:hello@example.com', true],
    ['tel:+49 30 123456', true],
    ['javascript:alert(1)', false],
    ['data:text/html,<script>', false],
    ['vbscript:msgbox', false],
    ['//evil.example', false],
    ['/admin', false],
    ['https://user:pass@example.com', false],
    ['ftp://example.com', false],
  ])('%s -> %s', (url, ok) => {
    expect(checkLinkUrl(url).ok).toBe(ok)
  })

  it('warns about http and blocks links into the admin of the own host', () => {
    expect(checkLinkUrl('http://example.com')).toMatchObject({ ok: true, warning: 'insecure_http' })
    expect(checkLinkUrl('https://links.example.com/admin/login', ['links.example.com'])).toEqual({
      ok: false,
      reason: 'internal',
    })
    expect(checkLinkUrl('https://links.example.com/ig', ['links.example.com']).ok).toBe(true)
  })
})

describe('theme presets', () => {
  it.each(['datasheet', 'paper'] as const)(
    '%s passes every contrast pair in both schemes',
    (name) => {
      const theme = themeSchema.parse({ preset: name, scheme: 'auto', ...PRESETS[name] })
      const failing = checkThemeContrast(theme).filter((check) => !check.ok)
      expect(failing).toEqual([])
    },
  )

  it('reports a weak accent', () => {
    const theme = themeSchema.parse({
      scheme: 'dark',
      dark: { ...PRESETS.datasheet.dark, accent: '#222222' },
    })
    expect(checkThemeContrast(theme).some((check) => check.pair === 'accent/bg' && !check.ok)).toBe(
      true,
    )
  })
})

describe('themeCss', () => {
  it('outranks the static token defaults and switches palettes', async () => {
    const { themeCss } = await import('../../shared/schemas/theme')
    const light = themeCss(themeSchema.parse({ scheme: 'light', light: PRESETS.paper.light }))
    expect(light.startsWith(':root:root{--wsl-bg:#f4f2ee')).toBe(true)
    expect(light).toContain('color-scheme:light')
    const auto = themeCss(themeSchema.parse({ scheme: 'auto' }))
    expect(auto).toContain('@media (prefers-color-scheme: light){:root:root{--wsl-bg:#f4f2ee')
  })
})
