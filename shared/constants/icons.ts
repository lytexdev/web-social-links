export const ICON_SETS = ['tabler', 'tabler-filled', 'si'] as const
export type IconSet = (typeof ICON_SETS)[number]

export const ICON_REF_PATTERN =
  /^(?:(tabler|tabler-filled|si):[a-z0-9-]{1,80}|media:[A-Za-z0-9_-]{12})$/

export const ICON_ALIASES: Record<string, string[]> = {
  'brand-instagram': ['ig', 'insta'],
  'brand-youtube': ['yt', 'video'],
  'brand-x': ['twitter', 'tweet'],
  'brand-twitter': ['x'],
  'brand-tiktok': ['tt'],
  'brand-facebook': ['fb', 'meta'],
  'brand-linkedin': ['li', 'xing', 'cv'],
  'brand-whatsapp': ['wa', 'chat'],
  'brand-telegram': ['tg', 'chat'],
  'brand-signal': ['messenger', 'chat'],
  'brand-github': ['gh', 'code', 'source', 'quellen'],
  'brand-threads': ['meta'],
  'brand-bluesky': ['bsky'],
  'brand-mastodon': ['fediverse', 'toot'],
  'brand-spotify': ['podcast', 'music', 'musik'],
  'brand-patreon': ['support', 'donate'],
  mail: ['email', 'e-mail', 'kontakt', 'contact'],
  world: ['website', 'web', 'webseite', 'homepage'],
  'shopping-cart': ['shop', 'kaufen', 'buy'],
  pill: ['supplement', 'nahrungsergaenzung', 'kapsel'],
  'discount-2': ['rabatt', 'coupon', 'gutschein'],
  'file-text': ['quellen', 'sources', 'studie', 'study'],
}
