export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown'

export interface UserAgentInfo {
  device: DeviceType
  browser: string
  os: string
  inApp: string | null
}

interface Rule {
  name: string
  pattern: RegExp
}

export const IN_APP_RULES: readonly Rule[] = [
  { name: 'threads', pattern: /\bBarcelona [\d.]+/ },
  { name: 'instagram', pattern: /\bInstagram [\d.]+/ },
  { name: 'messenger', pattern: /FBAN\/Messenger|FBAN\/MessengerLite|FB_IAB\/Orca/ },
  { name: 'facebook', pattern: /FBAN\/|FBAV\/|FB_IAB\/|\[FB/ },
  { name: 'tiktok', pattern: /musical_ly|BytedanceWebview|TikTok|trill_\d/ },
  { name: 'snapchat', pattern: /Snapchat\/[\d.]+/ },
  { name: 'linkedin', pattern: /LinkedInApp/ },
  { name: 'pinterest', pattern: /Pinterest for (iOS|Android)|\[Pinterest\// },
  { name: 'x', pattern: /TwitterAndroid|Twitter for iP(hone|ad)/ },
  { name: 'reddit', pattern: /\bReddit\/Version|com\.reddit\.frontpage/ },
  { name: 'line', pattern: /\bLine\/[\d.]+/ },
  { name: 'wechat', pattern: /MicroMessenger/ },
  { name: 'telegram', pattern: /Telegram-Android|TelegramBot/ },
  { name: 'discord', pattern: /\bDiscord\/[\d.]+/ },
]

const BROWSER_RULES: readonly Rule[] = [
  { name: 'Edge', pattern: /\bEdg(e|A|iOS)?\/[\d.]+/ },
  { name: 'Opera', pattern: /\bOPR\/|\bOPiOS\/|\bOpera\b/ },
  { name: 'Samsung Internet', pattern: /SamsungBrowser\/[\d.]+/ },
  { name: 'Vivaldi', pattern: /Vivaldi\/[\d.]+/ },
  { name: 'Firefox', pattern: /\b(Firefox|FxiOS)\/[\d.]+/ },
  { name: 'Chrome', pattern: /\b(Chrome|CriOS)\/[\d.]+/ },
  { name: 'Safari', pattern: /Version\/[\d.]+.*Safari\/|AppleWebKit\/.*Mobile\/\w+$/ },
]

const OS_RULES: readonly Rule[] = [
  { name: 'iPadOS', pattern: /\biPad\b/ },
  { name: 'iOS', pattern: /\b(iPhone|iPod)\b|\biOS\b/ },
  { name: 'Android', pattern: /\bAndroid\b/ },
  { name: 'ChromeOS', pattern: /\bCrOS\b/ },
  { name: 'Windows', pattern: /\bWindows\b/ },
  { name: 'macOS', pattern: /\bMac OS X\b|\bMacintosh\b/ },
  { name: 'Linux', pattern: /\bLinux\b|\bX11\b/ },
]

function first(rules: readonly Rule[], ua: string): string | null {
  return rules.find((rule) => rule.pattern.test(ua))?.name ?? null
}

function fromHint(value: string | undefined): string | null {
  if (!value) return null
  const platform = value.replace(/"/g, '').trim()
  const map: Record<string, string> = {
    Android: 'Android',
    'Chrome OS': 'ChromeOS',
    'Chromium OS': 'ChromeOS',
    iOS: 'iOS',
    Linux: 'Linux',
    macOS: 'macOS',
    Windows: 'Windows',
  }
  return map[platform] ?? null
}

export function parseUserAgent(
  ua: string | undefined,
  hints: { mobile?: string; platform?: string } = {},
): UserAgentInfo {
  const value = (ua ?? '').slice(0, 512)
  const inApp = first(IN_APP_RULES, value)
  const os = fromHint(hints.platform) ?? first(OS_RULES, value) ?? 'Other'
  const browser = inApp ? `in-app:${inApp}` : (first(BROWSER_RULES, value) ?? 'Other')
  let device: DeviceType = 'unknown'
  if (hints.mobile === '?1') device = 'mobile'
  else if (
    os === 'iPadOS' ||
    /\bTablet\b/i.test(value) ||
    (os === 'Android' && !/\bMobile\b/.test(value))
  ) {
    device = 'tablet'
  } else if (os === 'iOS' || /\bMobile\b/.test(value)) device = 'mobile'
  else if (['Windows', 'macOS', 'Linux', 'ChromeOS'].includes(os)) device = 'desktop'
  return { device, browser, os, inApp }
}

export function uaFamily(ua: string | undefined): string {
  const info = parseUserAgent(ua)
  const browser = info.browser.startsWith('in-app:') ? info.browser.slice(7) : info.browser
  return `${browser} · ${info.os}`
}
