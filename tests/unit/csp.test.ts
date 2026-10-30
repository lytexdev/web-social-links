import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { buildDocumentCsp } from '../../server/utils/csp'

const sha = (value: string) => `'sha256-${createHash('sha256').update(value).digest('base64')}'`

describe('buildDocumentCsp', () => {
  const html = [
    '<html><head><style>:root{--a:1}</style>',
    '<script type="importmap">{"imports":{}}</script>',
    '<script>window.__NUXT__={}</script>',
    '<script type="application/json" id="data">{"x":1}</script>',
    '<script type="module" src="/_nuxt/a.js"></script></head></html>',
  ].join('')

  it('hashes inline scripts and styles but not data blocks or external scripts', () => {
    const csp = buildDocumentCsp(html, { framable: false, embeds: false })
    expect(csp).toContain(
      `script-src 'self' ${sha('{"imports":{}}')} ${sha('window.__NUXT__={}')};`,
    )
    expect(csp).toContain(`style-src 'self' ${sha(':root{--a:1}')};`)
    expect(csp).not.toContain(sha('{"x":1}'))
    expect(csp).not.toMatch(/unsafe-(inline|eval)/)
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("style-src-attr 'none'")
  })

  it('allows same-origin framing only when requested', () => {
    expect(buildDocumentCsp('', { framable: true, embeds: false })).toContain(
      "frame-ancestors 'self'",
    )
    expect(buildDocumentCsp('', { framable: false, embeds: true })).toContain("frame-src 'self'")
  })
})
