import { randomBytes } from 'node:crypto'
import { getCookie, getQuery, getRequestHeader, type H3Event } from 'h3'
import { isbot } from 'isbot'
import { eq, ne } from 'drizzle-orm'
import { useDb } from '../db/client'
import { analyticsSalts, events } from '../db/schema'
import { useEnv } from '../utils/env'
import { logger } from '../utils/logger'
import { hmacHex } from './crypto'
import { cleanUtm, detectSource, referrerHost } from './origin'
import { SESSION_COOKIE, readSession } from './sessions'
import { getSetting } from './settings'
import { sourceKeys } from './sources'
import { parseUserAgent } from './user-agent'

const MAX_BUFFER = 100
const PREVIEW_BOTS =
  /facebookexternalhit|Facebot|meta-externalagent\/.*preview|WhatsApp|Twitterbot|TelegramBot|Slackbot|Discordbot|LinkedInBot|SkypeUriPreview|redditbot|Mastodon|Bluesky|Cardyb|Iframely|Embedly|vkShare|Viber|Signal|Applebot|Pinterestbot|Snap URL Preview|Google-PageRenderer|Line\/.*Bot/i

export type EventRow = typeof events.$inferInsert

let buffer: EventRow[] = []
let timer: ReturnType<typeof setInterval> | null = null
let settingsCache: { mode: 'aggregate' | 'visitors'; at: number } | null = null

export function calendarDay(timestamp: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp))
}

function analyticsMode(now: number): 'aggregate' | 'visitors' {
  if (!settingsCache || now - settingsCache.at > 30_000) {
    settingsCache = { mode: getSetting('analytics').mode, at: now }
  }
  return settingsCache.mode
}

export function resetAnalyticsSettingsCache(): void {
  settingsCache = null
}

function dailySalt(day: string): string {
  const db = useDb()
  const existing = db.select().from(analyticsSalts).where(eq(analyticsSalts.day, day)).get()
  if (existing) return existing.salt
  const salt = randomBytes(32).toString('base64')
  db.delete(analyticsSalts).where(ne(analyticsSalts.day, day)).run()
  db.insert(analyticsSalts).values({ day, salt }).onConflictDoNothing().run()
  return db.select().from(analyticsSalts).where(eq(analyticsSalts.day, day)).get()?.salt ?? salt
}

export function purgeOldSalts(today: string): number {
  return useDb().delete(analyticsSalts).where(ne(analyticsSalts.day, today)).run().changes
}

export function flushEvents(): number {
  if (buffer.length === 0) return 0
  const batch = buffer
  buffer = []
  try {
    useDb().transaction((tx) => {
      for (const row of batch) tx.insert(events).values(row).run()
    })
  } catch (error) {
    logger.error('analytics_flush_failed', { error, count: batch.length })
  }
  return batch.length
}

export function startAnalytics(): void {
  if (timer) return
  timer = setInterval(flushEvents, useEnv().analyticsFlushMs)
  timer.unref()
}

export function stopAnalytics(): void {
  if (timer) clearInterval(timer)
  timer = null
  flushEvents()
}

function push(row: EventRow): void {
  buffer.push(row)
  if (buffer.length >= MAX_BUFFER) flushEvents()
}

export type Classification = 'count' | 'preview' | 'skip'

export function classifyRequest(input: {
  method: string
  status: number
  userAgent: string | undefined
  purpose: string | undefined
  adminSession: boolean
}): Classification {
  if (input.method !== 'GET' || input.status >= 400 || input.adminSession) return 'skip'
  if (input.purpose && /prefetch|prerender|preview/i.test(input.purpose)) return 'skip'
  const ua = input.userAgent ?? ''
  if (PREVIEW_BOTS.test(ua)) return 'preview'
  if (!ua || isbot(ua)) return 'skip'
  return 'count'
}

function hasAdminSession(event: H3Event): boolean {
  const token = getCookie(event, SESSION_COOKIE)
  return Boolean(token && readSession(token))
}

export function recordFromEvent(event: H3Event, kind: 'view' | 'click', now = Date.now()): void {
  const env = useEnv()
  const purpose =
    getRequestHeader(event, 'sec-purpose') ??
    getRequestHeader(event, 'purpose') ??
    getRequestHeader(event, 'x-purpose') ??
    getRequestHeader(event, 'x-moz')
  const userAgent = getRequestHeader(event, 'user-agent')
  const classification = classifyRequest({
    method: event.method.toUpperCase(),
    status: event.node.res.statusCode,
    userAgent,
    purpose,
    adminSession: hasAdminSession(event),
  })
  if (classification === 'skip') return
  if (classification === 'preview' && kind === 'click') return

  const query = getQuery(event)
  const ownHosts = new Set([env.publicHost, ...env.aliasHosts, ...env.adminHosts])
  const host = referrerHost(getRequestHeader(event, 'referer'), ownHosts)
  const info = parseUserAgent(userAgent, {
    mobile: getRequestHeader(event, 'sec-ch-ua-mobile'),
    platform: getRequestHeader(event, 'sec-ch-ua-platform'),
  })
  const click = event.context.redirectClick
  const known = sourceKeys()
  const source =
    kind === 'click'
      ? (click?.source ?? 'direct')
      : detectSource(
          {
            slugSource: event.context.viewSource ?? null,
            sParam: typeof query.s === 'string' ? query.s : null,
            utmSource: cleanUtm(query.utm_source),
            inApp: info.inApp,
            referrerHost: host,
          },
          known,
        )
  const country = event.context.viaCloudflare
    ? getRequestHeader(event, 'cf-ipcountry')?.toUpperCase()
    : undefined
  const day = calendarDay(now, env.timeZone)
  let visitorHash: string | null = null
  const optOut =
    getRequestHeader(event, 'sec-gpc') === '1' || getRequestHeader(event, 'dnt') === '1'
  if (
    classification === 'count' &&
    kind === 'view' &&
    !optOut &&
    analyticsMode(now) === 'visitors'
  ) {
    const ip = event.context.clientIp ?? '0.0.0.0'
    visitorHash = hmacHex(
      Buffer.from(dailySalt(day)),
      `${ip}\n${userAgent ?? ''}\n${env.publicHost}`,
    ).slice(0, 32)
  }

  push({
    ts: now,
    day,
    type: classification === 'preview' ? 'preview' : kind,
    linkId: click?.linkId ?? null,
    blockId: click?.blockId ?? null,
    sourceKey: source,
    slug: click?.slug ?? event.context.viewSlug ?? null,
    referrerHost: host,
    utmSource: cleanUtm(query.utm_source),
    utmMedium: cleanUtm(query.utm_medium),
    utmCampaign: cleanUtm(query.utm_campaign),
    country:
      country && /^[A-Z]{2}$/.test(country) && country !== 'XX' && country !== 'T1'
        ? country
        : null,
    device: info.device,
    browser: info.browser,
    os: info.os,
    visitorHash,
  })
}
