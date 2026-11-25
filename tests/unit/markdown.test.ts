import { describe, expect, it } from 'vitest'
import { renderDocumentMarkdown } from '../../server/services/markdown'

describe('document markdown', () => {
  it('turns a linked image with a title into a figure with a caption', () => {
    const html = renderDocumentMarkdown(
      '[![Buch](/media/abc-1a2b3c4d-640.webp "Mein Hinweis")](https://example.com/buch)',
    )
    expect(html).toContain('<figure>')
    expect(html).toContain('<a href="https://example.com/buch" rel="noopener">')
    expect(html).toContain('<img src="/media/abc-1a2b3c4d-640.webp" alt="Buch">')
    expect(html).toContain('<figcaption>Mein Hinweis</figcaption>')
    expect(html).not.toContain('title=')
  })

  it('captions a plain image as well', () => {
    const html = renderDocumentMarkdown(
      '![Dose](/media/abc-1a2b3c4d-640.webp "Woher das Bild ist")',
    )
    expect(html).toContain('<figure>')
    expect(html).toContain('<figcaption>Woher das Bild ist</figcaption>')
  })

  it('escapes the caption', () => {
    const html = renderDocumentMarkdown('![A](/media/a-1-640.webp "<b>x</b>")')
    expect(html).toContain('<figcaption>&lt;b&gt;x&lt;/b&gt;</figcaption>')
  })

  it('leaves an image without a title and an image inside a sentence alone', () => {
    expect(renderDocumentMarkdown('![A](/media/a-1-640.webp)')).toBe(
      '<p><img src="/media/a-1-640.webp" alt="A"></p>\n',
    )
    const inline = renderDocumentMarkdown('Text ![A](/media/a-1-640.webp "Titel") danach')
    expect(inline).toContain('<p>')
    expect(inline).toContain('title="Titel"')
    expect(inline).not.toContain('<figure>')
  })

  it('rejects an image source the policy forbids', () => {
    const html = renderDocumentMarkdown('![A](javascript:alert(1) "Titel")')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('src=')
    expect(html).not.toContain('<figure>')
  })
})
