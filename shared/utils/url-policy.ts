export type UrlCheck =
  | { ok: true; url: string; warning?: 'insecure_http' }
  | { ok: false; reason: 'invalid' | 'scheme' | 'internal' }

const TEL = /^tel:\+?[0-9 ()/.-]{3,32}$/
const MAILTO = /^mailto:[^\s@/?]+@[^\s@/?]+\.[^\s@/?]+(\?.*)?$/i

export function checkLinkUrl(input: string, ownHosts: readonly string[] = []): UrlCheck {
  const value = input.trim()
  if (value.length === 0 || value.length > 2048) return { ok: false, reason: 'invalid' }
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value)?.[1]?.toLowerCase()
  if (!scheme) return { ok: false, reason: 'invalid' }
  if (scheme === 'mailto')
    return MAILTO.test(value) ? { ok: true, url: value } : { ok: false, reason: 'invalid' }
  if (scheme === 'tel')
    return TEL.test(value) ? { ok: true, url: value } : { ok: false, reason: 'invalid' }
  if (scheme !== 'https' && scheme !== 'http') return { ok: false, reason: 'scheme' }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return { ok: false, reason: 'invalid' }
  }
  if (!url.hostname || url.username || url.password || !/^https?:\/\/[^/]/i.test(value)) {
    return { ok: false, reason: 'invalid' }
  }
  if (ownHosts.includes(url.host.toLowerCase()) && /^\/(admin|api)(\/|$)/i.test(url.pathname)) {
    return { ok: false, reason: 'internal' }
  }
  return scheme === 'http'
    ? { ok: true, url: url.href, warning: 'insecure_http' }
    : { ok: true, url: url.href }
}
