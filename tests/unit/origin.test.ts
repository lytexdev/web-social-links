import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PLATFORM_PRESETS } from '../../shared/constants/platforms'
import { classifyRequest } from '../../server/services/analytics'
import {
  cleanUtm,
  detectSource,
  referrerHost,
  sourceFromReferrer,
} from '../../server/services/origin'
import { parseUserAgent } from '../../server/services/user-agent'

interface UaFixture {
  inApp: string | null
  userAgent: string
  source: string
}
interface ReferrerFixture {
  referrer: string
  source: string | null
}

const userAgents = JSON.parse(
  readFileSync('tests/fixtures/user-agents.json', 'utf8'),
) as UaFixture[]
const referrers = JSON.parse(
  readFileSync('tests/fixtures/referrers.json', 'utf8'),
) as ReferrerFixture[]
const known = new Set(['direct', ...PLATFORM_PRESETS.map((preset) => preset.key)])
const own = new Set(['links.example.com'])

describe('in-app browser detection on recorded user agents', () => {
  it.each(
    userAgents.map((fixture) => [fixture.inApp, fixture.userAgent.slice(0, 80), fixture] as const),
  )('%s: %s', (_name, _short, fixture) => {
    expect(parseUserAgent(fixture.userAgent).inApp).toBe(fixture.inApp)
  })

  it('covers the major platforms', () => {
    const covered = new Set(userAgents.map((fixture) => fixture.inApp))
    for (const app of [
      'instagram',
      'facebook',
      'tiktok',
      'threads',
      'snapchat',
      'linkedin',
      'pinterest',
      'x',
    ]) {
      expect(covered.has(app)).toBe(true)
    }
  })
})

describe('referrer hosts', () => {
  it.each(referrers.map((fixture) => [fixture.referrer, fixture.source] as const))(
    '%s -> %s',
    (referrer, source) => {
      expect(sourceFromReferrer(referrerHost(referrer, own))).toBe(source)
    },
  )

  it('keeps only the host and drops own hosts and other schemes', () => {
    expect(referrerHost('https://www.google.com/search?q=secret', own)).toBe('google.com')
    expect(referrerHost('https://links.example.com/ig', own)).toBeNull()
    expect(referrerHost('android-app://com.instagram.android', own)).toBeNull()
    expect(referrerHost('not a url', own)).toBeNull()
  })
})

describe('detectSource priority', () => {
  const base = { slugSource: null, sParam: null, utmSource: null, inApp: null, referrerHost: null }

  it('prefers the slug over everything else', () => {
    expect(
      detectSource(
        {
          ...base,
          slugSource: 'tiktok',
          sParam: 'youtube',
          utmSource: 'x',
          inApp: 'instagram',
          referrerHost: 't.co',
        },
        known,
      ),
    ).toBe('tiktok')
  })

  it('falls back through s, utm_source, in-app browser, referrer and direct', () => {
    expect(detectSource({ ...base, sParam: 'youtube', utmSource: 'x' }, known)).toBe('youtube')
    expect(detectSource({ ...base, utmSource: 'ig', inApp: 'tiktok' }, known)).toBe('instagram')
    expect(detectSource({ ...base, inApp: 'threads', referrerHost: 't.co' }, known)).toBe('threads')
    expect(detectSource({ ...base, referrerHost: 'l.instagram.com' }, known)).toBe('instagram')
    expect(detectSource(base, known)).toBe('direct')
  })

  it('ignores unknown values instead of storing them as sources', () => {
    expect(detectSource({ ...base, sParam: 'evil', utmSource: 'newsletter' }, known)).toBe('direct')
  })

  it('normalises UTM values', () => {
    expect(cleanUtm('Instagram Story!')).toBe('instagramstory')
    expect(cleanUtm('x'.repeat(100))).toHaveLength(64)
    expect(cleanUtm(['a'])).toBeNull()
  })
})

describe('request classification', () => {
  const human =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  const base = {
    method: 'GET',
    status: 200,
    userAgent: human,
    purpose: undefined,
    adminSession: false,
  }

  it.each([
    [{}, 'count'],
    [{ method: 'HEAD' }, 'skip'],
    [{ status: 404 }, 'skip'],
    [{ adminSession: true }, 'skip'],
    [{ purpose: 'prefetch' }, 'skip'],
    [{ purpose: 'prefetch;prerender' }, 'skip'],
    [
      { userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
      'skip',
    ],
    [{ userAgent: 'curl/8.5.0' }, 'skip'],
    [{ userAgent: undefined }, 'skip'],
    [
      { userAgent: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
      'preview',
    ],
    [{ userAgent: 'WhatsApp/2.23.20.0' }, 'preview'],
    [{ userAgent: 'TelegramBot (like TwitterBot)' }, 'preview'],
    [{ userAgent: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' }, 'preview'],
    [{ userAgent: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)' }, 'preview'],
  ] as const)('%o -> %s', (overrides, expected) => {
    expect(classifyRequest({ ...base, ...overrides })).toBe(expected)
  })
})
