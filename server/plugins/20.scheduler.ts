import { runMaintenance } from '../tasks/maintenance'
import { seedDefaultAvatar } from '../services/seed'
import { logger } from '../utils/logger'

const DAY_MS = 86_400_000

export default defineNitroPlugin((nitroApp) => {
  const timers: Array<ReturnType<typeof setInterval>> = []
  const safely = (name: string, task: () => Promise<void>) => () => {
    task().catch((error: unknown) => logger.error('task_failed', { task: name, error }))
  }
  setTimeout(safely('default_avatar', seedDefaultAvatar), 0).unref()
  setTimeout(
    safely('maintenance', () => runMaintenance()),
    60_000,
  ).unref()
  timers.push(
    setInterval(
      safely('maintenance', () => runMaintenance()),
      DAY_MS,
    ),
  )
  for (const timer of timers) timer.unref()
  nitroApp.hooks.hookOnce('close', () => {
    for (const timer of timers) clearInterval(timer)
  })
})
