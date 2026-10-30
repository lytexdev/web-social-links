import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeDatabase, openDatabase, setDb, useDb } from '../../server/db/client'
import { analyticsSalts, dailyStats, events } from '../../server/db/schema'
import { calendarDay, purgeOldSalts } from '../../server/services/analytics'
import { purgeEvents, rollupDay, totals } from '../../server/services/stats'
import { initEnv } from '../../server/utils/env'

const DAY = 86_400_000
const now = Date.parse('2026-10-30T12:00:00Z')

function event(
  ts: number,
  type: 'view' | 'click' | 'preview',
  extra: Partial<typeof events.$inferInsert> = {},
) {
  return {
    ts,
    day: calendarDay(ts, 'Europe/Berlin'),
    type,
    sourceKey: 'instagram',
    linkId: type === 'click' ? 'linkAAAAAAAA' : null,
    ...extra,
  }
}

beforeAll(() => {
  const result = initEnv({
    NODE_ENV: 'test',
    PUBLIC_ORIGIN: 'https://links.example.com',
    APP_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    ANALYTICS_HMAC_KEY: randomBytes(32).toString('base64'),
    DATA_DIR: '/tmp',
  })
  expect(result.ok).toBe(true)
  setDb(openDatabase(':memory:', resolve('server/db/migrations')))
})

afterAll(() => closeDatabase())

describe('rollup and retention', () => {
  it('aggregates per day and keeps aggregates after raw data is deleted', () => {
    const db = useDb()
    const old = now - 40 * DAY
    const rows = [
      event(old, 'view'),
      event(old + 1000, 'view', { visitorHash: 'a' }),
      event(old + 2000, 'view', { visitorHash: 'a' }),
      event(old + 3000, 'click'),
      event(old + 4000, 'preview'),
      event(now, 'view', { sourceKey: 'direct' }),
    ]
    for (const row of rows) db.insert(events).values(row).run()
    const oldDay = calendarDay(old, 'Europe/Berlin')
    rollupDay(oldDay)
    rollupDay(oldDay)
    const before = totals({ from: oldDay, to: oldDay, source: null })
    expect(before).toEqual({ views: 3, clicks: 1, previews: 1, uniques: 1 })

    const removed = purgeEvents(30, now)
    expect(removed).toBe(5)
    expect(db.select().from(events).all()).toHaveLength(1)
    expect(totals({ from: oldDay, to: oldDay, source: null })).toEqual(before)
    expect(db.select().from(dailyStats).all().length).toBeGreaterThan(0)
  })

  it('deletes every salt except the current day', () => {
    const db = useDb()
    const today = calendarDay(now, 'Europe/Berlin')
    const yesterday = calendarDay(now - DAY, 'Europe/Berlin')
    db.insert(analyticsSalts).values({ day: yesterday, salt: 'old' }).run()
    db.insert(analyticsSalts).values({ day: today, salt: 'new' }).run()
    expect(purgeOldSalts(today)).toBe(1)
    expect(db.select().from(analyticsSalts).all()).toEqual([{ day: today, salt: 'new' }])
  })
})
