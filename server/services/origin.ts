import { DIRECT_SOURCE } from '../../shared/constants/platforms'

export const IN_APP_SOURCES: Record<string, string> = {
  threads: 'threads',
  instagram: 'instagram',
  facebook: 'facebook',
  messenger: 'facebook',
  tiktok: 'tiktok',
  snapchat: 'snapchat',
  linkedin: 'linkedin',
  pinterest: 'pinterest',
  x: 'x',
  reddit: 'reddit',
  telegram: 'telegram',
  discord: 'discord',
}

export const REFERRER_SOURCES: Array<[string, string]> = [
  ['instagram.com', 'instagram'],
  ['facebook.com', 'facebook'],
  ['fb.me', 'facebook'],
  ['messenger.com', 'facebook'],
  ['threads.net', 'threads'],
  ['threads.com', 'threads'],
  ['t.co', 'x'],
  ['x.com', 'x'],
  ['twitter.com', 'x'],
  ['youtube.com', 'youtube'],
  ['youtu.be', 'youtube'],
  ['tiktok.com', 'tiktok'],
  ['linkedin.com', 'linkedin'],
  ['lnkd.in', 'linkedin'],
  ['reddit.com', 'reddit'],
  ['bsky.app', 'bluesky'],
  ['pinterest.com', 'pinterest'],
  ['pin.it', 'pinterest'],
  ['snapchat.com', 'snapchat'],
  ['twitch.tv', 'twitch'],
  ['discord.com', 'discord'],
  ['discordapp.com', 'discord'],
  ['t.me', 'telegram'],
  ['telegram.org', 'telegram'],
  ['whatsapp.com', 'whatsapp'],
  ['wa.me', 'whatsapp'],
  ['spotify.com', 'spotify'],
  ['soundcloud.com', 'soundcloud'],
  ['patreon.com', 'patreon'],
  ['github.com', 'github'],
  ['substack.com', 'substack'],
  ['kick.com', 'kick'],
]

const UTM_ALIASES: Record<string, string> = {
  ig: 'instagram',
  insta: 'instagram',
  fb: 'facebook',
  yt: 'youtube',
  tt: 'tiktok',
  twitter: 'x',
  li: 'linkedin',
  bsky: 'bluesky',
  wa: 'whatsapp',
  tg: 'telegram',
  gh: 'github',
}

export function referrerHost(
  referrer: string | undefined,
  ownHosts: ReadonlySet<string>,
): string | null {
  if (!referrer) return null
  try {
    const url = new URL(referrer)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (ownHosts.has(url.host.toLowerCase()) || ownHosts.has(host)) return null
    return host.slice(0, 120)
  } catch {
    return null
  }
}

export function sourceFromReferrer(host: string | null): string | null {
  if (!host) return null
  for (const [domain, source] of REFERRER_SOURCES) {
    if (host === domain || host.endsWith(`.${domain}`)) return source
  }
  return null
}

export interface OriginInput {
  slugSource: string | null
  sParam: string | null
  utmSource: string | null
  inApp: string | null
  referrerHost: string | null
}

export function detectSource(input: OriginInput, known: ReadonlySet<string>): string {
  const candidates = [
    input.slugSource,
    input.sParam,
    input.utmSource ? (UTM_ALIASES[input.utmSource] ?? input.utmSource) : null,
    input.inApp ? (IN_APP_SOURCES[input.inApp] ?? null) : null,
    sourceFromReferrer(input.referrerHost),
  ]
  for (const candidate of candidates) {
    if (candidate && known.has(candidate)) return candidate
  }
  return DIRECT_SOURCE
}

export function cleanUtm(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 64)
  return cleaned || null
}
