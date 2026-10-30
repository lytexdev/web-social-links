import { calendarDay, purgeOldSalts } from '../services/analytics'
import { getSetting } from '../services/settings'
import { purgeEvents, rollupRecent } from '../services/stats'
import { useEnv } from '../utils/env'
import { logger } from '../utils/logger'

export function runHourlyAnalytics(now = Date.now()): void {
  rollupRecent(now)
  purgeOldSalts(calendarDay(now, useEnv().timeZone))
}

export function runDailyAnalytics(now = Date.now()): void {
  const removed = purgeEvents(getSetting('analytics').retentionDays, now)
  logger.info('analytics_retention', { removed })
}
