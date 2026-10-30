export interface PlatformPreset {
  key: string
  label: string
  icon: string
  slug: string
}

export const PLATFORM_PRESETS: readonly PlatformPreset[] = [
  { key: 'instagram', label: 'Instagram', icon: 'tabler:brand-instagram', slug: 'ig' },
  { key: 'tiktok', label: 'TikTok', icon: 'tabler:brand-tiktok', slug: 'tt' },
  { key: 'youtube', label: 'YouTube', icon: 'tabler:brand-youtube', slug: 'yt' },
  { key: 'x', label: 'X', icon: 'tabler:brand-x', slug: 'x' },
  { key: 'threads', label: 'Threads', icon: 'tabler:brand-threads', slug: 'th' },
  { key: 'bluesky', label: 'Bluesky', icon: 'tabler:brand-bluesky', slug: 'bsky' },
  { key: 'facebook', label: 'Facebook', icon: 'tabler:brand-facebook', slug: 'fb' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'tabler:brand-linkedin', slug: 'li' },
  { key: 'twitch', label: 'Twitch', icon: 'tabler:brand-twitch', slug: 'twitch' },
  { key: 'discord', label: 'Discord', icon: 'tabler:brand-discord', slug: 'discord' },
  { key: 'telegram', label: 'Telegram', icon: 'tabler:brand-telegram', slug: 'tg' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'tabler:brand-whatsapp', slug: 'wa' },
  { key: 'signal', label: 'Signal', icon: 'tabler:brand-signal', slug: 'signal' },
  { key: 'snapchat', label: 'Snapchat', icon: 'tabler:brand-snapchat', slug: 'snap' },
  { key: 'pinterest', label: 'Pinterest', icon: 'tabler:brand-pinterest', slug: 'pin' },
  { key: 'reddit', label: 'Reddit', icon: 'tabler:brand-reddit', slug: 'reddit' },
  { key: 'mastodon', label: 'Mastodon', icon: 'tabler:brand-mastodon', slug: 'masto' },
  { key: 'spotify', label: 'Spotify', icon: 'tabler:brand-spotify', slug: 'spotify' },
  { key: 'soundcloud', label: 'SoundCloud', icon: 'tabler:brand-soundcloud', slug: 'sc' },
  { key: 'patreon', label: 'Patreon', icon: 'tabler:brand-patreon', slug: 'patreon' },
  { key: 'github', label: 'GitHub', icon: 'tabler:brand-github', slug: 'gh' },
  { key: 'substack', label: 'Substack', icon: 'si:substack', slug: 'substack' },
  { key: 'kick', label: 'Kick', icon: 'tabler:brand-kick', slug: 'kick' },
  { key: 'email', label: 'E-Mail', icon: 'tabler:mail', slug: 'mail' },
  { key: 'qr', label: 'QR-Code', icon: 'tabler:qrcode', slug: 'qr' },
  { key: 'website', label: 'Website', icon: 'tabler:world', slug: 'web' },
]

export const DIRECT_SOURCE = 'direct'
