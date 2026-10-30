import { createHash } from 'node:crypto'

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi
const INLINE_STYLE = /<style[^>]*>([\s\S]*?)<\/style>/gi
const NON_EXECUTABLE = /\btype=["']?(application\/json|application\/ld\+json|text\/template)/i

function digest(content: string): string {
  return `'sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}'`
}

export function buildDocumentCsp(
  html: string,
  options: { framable: boolean; embeds: boolean },
): string {
  const scripts = new Set<string>()
  const styles = new Set<string>()
  for (const match of html.matchAll(INLINE_SCRIPT)) {
    const attributes = match[1] ?? ''
    const body = match[2] ?? ''
    if (body.length === 0 || NON_EXECUTABLE.test(attributes)) continue
    scripts.add(digest(body))
  }
  for (const match of html.matchAll(INLINE_STYLE)) {
    const body = match[1] ?? ''
    if (body.length > 0) styles.add(digest(body))
  }
  return [
    "default-src 'self'",
    `script-src 'self'${[...scripts].map((hash) => ` ${hash}`).join('')}`,
    `style-src 'self'${[...styles].map((hash) => ` ${hash}`).join('')}`,
    "style-src-attr 'none'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "media-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    `frame-src ${options.embeds ? "'self'" : "'none'"}`,
    `frame-ancestors ${options.framable ? "'self'" : "'none'"}`,
  ].join('; ')
}
