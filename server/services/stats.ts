import { and, eq, gte, lt, lte, sql } from 'drizzle-orm'
import { useDb } from '../db/client'
import { dailyDimensions, dailyStats, events } from '../db/schema'
import { useEnv } from '../utils/env'
import { calendarDay } from './analytics'

export const DIMENSIONS = [
  'referrer',
  'device',
  'browser',
  'os',
  'country',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'slug',
] as const
export type Dimension = (typeof DIMENSIONS)[number]

const COLUMN: Record<Dimension, string> = {
  referrer: 'referrer_host',
  device: 'device',
  browser: 'browser',
  os: 'os',
  country: 'country',
  utm_source: 'utm_source',
  utm_medium: 'utm_medium',
  utm_campaign: 'utm_campaign',
  slug: 'slug',
}

export function rollupDay(day: string): void {
  const db = useDb()
  db.transaction((tx) => {
    tx.delete(dailyStats).where(eq(dailyStats.day, day)).run()
    tx.delete(dailyDimensions).where(eq(dailyDimensions.day, day)).run()
    tx.run(sql`
      INSERT INTO daily_stats (day, link_id, source_key, views, clicks, uniques, previews)
      SELECT day, '', source_key,
        SUM(type = 'view'), 0, COUNT(DISTINCT CASE WHEN type = 'view' THEN visitor_hash END), SUM(type = 'preview')
      FROM events WHERE day = ${day} GROUP BY day, source_key
    `)
    tx.run(sql`
      INSERT INTO daily_stats (day, link_id, source_key, views, clicks, uniques, previews)
      SELECT day, link_id, source_key, 0, COUNT(*), 0, 0
      FROM events WHERE day = ${day} AND type = 'click' AND link_id IS NOT NULL GROUP BY day, link_id, source_key
    `)
    for (const dimension of DIMENSIONS) {
      const column = sql.raw(COLUMN[dimension])
      tx.run(sql`
        INSERT INTO daily_dimensions (day, dimension, value, source_key, views, clicks)
        SELECT day, ${dimension}, ${column}, source_key, SUM(type = 'view'), SUM(type = 'click')
        FROM events WHERE day = ${day} AND ${column} IS NOT NULL AND type IN ('view', 'click')
        GROUP BY day, ${column}, source_key
      `)
    }
  })
}

export function rollupRecent(now = Date.now()): void {
  const zone = useEnv().timeZone
  rollupDay(calendarDay(now - 86_400_000, zone))
  rollupDay(calendarDay(now, zone))
}

export function purgeEvents(retentionDays: number, now = Date.now()): number {
  const zone = useEnv().timeZone
  const cutoff = calendarDay(now - retentionDays * 86_400_000, zone)
  const days = useDb()
    .selectDistinct({ day: events.day })
    .from(events)
    .where(lt(events.day, cutoff))
    .all()
    .map((row) => row.day)
  for (const day of days) rollupDay(day)
  return useDb().delete(events).where(lt(events.day, cutoff)).run().changes
}

export interface StatsQuery {
  from: string
  to: string
  source: string | null
}

export interface Totals {
  views: number
  clicks: number
  previews: number
  uniques: number
}

export function totals(query: StatsQuery): Totals {
  const filters = [gte(dailyStats.day, query.from), lte(dailyStats.day, query.to)]
  if (query.source) filters.push(eq(dailyStats.sourceKey, query.source))
  const row = useDb()
    .select({
      views: sql<number>`COALESCE(SUM(${dailyStats.views}), 0)`,
      clicks: sql<number>`COALESCE(SUM(${dailyStats.clicks}), 0)`,
      previews: sql<number>`COALESCE(SUM(${dailyStats.previews}), 0)`,
      uniques: sql<number>`COALESCE(SUM(${dailyStats.uniques}), 0)`,
    })
    .from(dailyStats)
    .where(and(...filters))
    .get()
  return {
    views: row?.views ?? 0,
    clicks: row?.clicks ?? 0,
    previews: row?.previews ?? 0,
    uniques: row?.uniques ?? 0,
  }
}

export function dailySeries(
  query: StatsQuery,
): Array<{ bucket: string; views: number; clicks: number }> {
  const filters = [gte(dailyStats.day, query.from), lte(dailyStats.day, query.to)]
  if (query.source) filters.push(eq(dailyStats.sourceKey, query.source))
  const rows = useDb()
    .select({
      bucket: dailyStats.day,
      views: sql<number>`SUM(${dailyStats.views})`,
      clicks: sql<number>`SUM(${dailyStats.clicks})`,
    })
    .from(dailyStats)
    .where(and(...filters))
    .groupBy(dailyStats.day)
    .all()
  const byDay = new Map(rows.map((row) => [row.bucket, row]))
  const series: Array<{ bucket: string; views: number; clicks: number }> = []
  const cursor = new Date(`${query.from}T12:00:00Z`)
  const last = new Date(`${query.to}T12:00:00Z`)
  while (cursor <= last && series.length < 400) {
    const day = cursor.toISOString().slice(0, 10)
    series.push(byDay.get(day) ?? { bucket: day, views: 0, clicks: 0 })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return series
}

export function hourlySeries(
  since: number,
  source: string | null,
): Array<{ bucket: string; views: number; clicks: number }> {
  const zone = useEnv().timeZone
  const filters = [gte(events.ts, since)]
  if (source) filters.push(eq(events.sourceKey, source))
  const rows = useDb()
    .select({ ts: events.ts, type: events.type })
    .from(events)
    .where(and(...filters))
    .all()
  const format = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  })
  const buckets = new Map<string, { views: number; clicks: number }>()
  for (let hour = 0; hour < 24; hour++) {
    const key = format.format(new Date(since + hour * 3_600_000)).replace(', ', 'T')
    buckets.set(key, { views: 0, clicks: 0 })
  }
  for (const row of rows) {
    const key = format.format(new Date(row.ts)).replace(', ', 'T')
    const bucket = buckets.get(key)
    if (!bucket) continue
    if (row.type === 'view') bucket.views++
    else if (row.type === 'click') bucket.clicks++
  }
  return [...buckets.entries()].map(([bucket, value]) => ({ bucket, ...value }))
}

export function hourlyTotals(since: number, until: number, source: string | null): Totals {
  const filters = [gte(events.ts, since), lt(events.ts, until)]
  if (source) filters.push(eq(events.sourceKey, source))
  const row = useDb()
    .select({
      views: sql<number>`COALESCE(SUM(${events.type} = 'view'), 0)`,
      clicks: sql<number>`COALESCE(SUM(${events.type} = 'click'), 0)`,
      previews: sql<number>`COALESCE(SUM(${events.type} = 'preview'), 0)`,
      uniques: sql<number>`COUNT(DISTINCT CASE WHEN ${events.type} = 'view' THEN ${events.visitorHash} END)`,
    })
    .from(events)
    .where(and(...filters))
    .get()
  return {
    views: row?.views ?? 0,
    clicks: row?.clicks ?? 0,
    previews: row?.previews ?? 0,
    uniques: row?.uniques ?? 0,
  }
}

export function bySource(query: StatsQuery) {
  return useDb()
    .select({
      key: dailyStats.sourceKey,
      views: sql<number>`SUM(${dailyStats.views})`,
      clicks: sql<number>`SUM(${dailyStats.clicks})`,
    })
    .from(dailyStats)
    .where(and(gte(dailyStats.day, query.from), lte(dailyStats.day, query.to)))
    .groupBy(dailyStats.sourceKey)
    .orderBy(sql`SUM(${dailyStats.views}) + SUM(${dailyStats.clicks}) DESC`)
    .all()
}

export function byLink(query: StatsQuery) {
  const filters = [
    gte(dailyStats.day, query.from),
    lte(dailyStats.day, query.to),
    sql`${dailyStats.linkId} != ''`,
  ]
  if (query.source) filters.push(eq(dailyStats.sourceKey, query.source))
  return useDb()
    .select({ key: dailyStats.linkId, clicks: sql<number>`SUM(${dailyStats.clicks})` })
    .from(dailyStats)
    .where(and(...filters))
    .groupBy(dailyStats.linkId)
    .orderBy(sql`SUM(${dailyStats.clicks}) DESC`)
    .limit(50)
    .all()
}

export function byDimension(query: StatsQuery, dimension: Dimension) {
  const filters = [
    gte(dailyDimensions.day, query.from),
    lte(dailyDimensions.day, query.to),
    eq(dailyDimensions.dimension, dimension),
  ]
  if (query.source) filters.push(eq(dailyDimensions.sourceKey, query.source))
  return useDb()
    .select({
      key: dailyDimensions.value,
      views: sql<number>`SUM(${dailyDimensions.views})`,
      clicks: sql<number>`SUM(${dailyDimensions.clicks})`,
    })
    .from(dailyDimensions)
    .where(and(...filters))
    .groupBy(dailyDimensions.value)
    .orderBy(sql`SUM(${dailyDimensions.views}) + SUM(${dailyDimensions.clicks}) DESC`)
    .limit(25)
    .all()
}
