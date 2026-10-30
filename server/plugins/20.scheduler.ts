import { runDailyAnalytics, runHourlyAnalytics } from '../tasks/analytics'
import { runMaintenance } from '../tasks/maintenance'
import { seedDefaultAvatar } from '../services/seed'
import { logger } from '../utils/logger'

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

export default defineNitroPlugin((nitroApp) => {
  const timers: Array<ReturnType<typeof setTimeout>> = []
  const safely = (name: string, task: () => void | Promise<void>) => () => {
    Promise.resolve()
      .then(task)
      .catch((error: unknown) => logger.error('task_failed', { task: name, error }))
  }
  const avatar = safely('default_avatar', seedDefaultAvatar)
  const maintenance = safely('maintenance', () => runMaintenance())
  const hourly = safely('analytics_hourly', () => runHourlyAnalytics())
  const daily = safely('analytics_daily', () => runDailyAnalytics())

  timers.push(setTimeout(avatar, 0))
  timers.push(setTimeout(maintenance, 60_000))
  timers.push(setTimeout(daily, 90_000))
  timers.push(setInterval(maintenance, DAY_MS))
  timers.push(setInterval(hourly, HOUR_MS))
  timers.push(setInterval(daily, DAY_MS))
  for (const timer of timers) timer.unref()

  nitroApp.hooks.hookOnce('close', () => {
    for (const timer of timers) clearTimeout(timer)
  })
})
