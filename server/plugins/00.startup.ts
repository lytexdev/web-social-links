import { join, resolve } from 'node:path'
import { closeDatabase, openDatabase, setDb } from '../db/client'
import { loadBans } from '../services/bans'
import { seedOwner, warnAboutInitialCredentials } from '../services/users'
import { prepareDataDir } from '../utils/data-dir'
import { initEnv } from '../utils/env'
import { logger } from '../utils/logger'

function abort(reason: string): never {
  logger.error('startup_aborted', { reason })
  process.exit(1)
}

export default defineNitroPlugin((nitroApp) => {
  const variables: Record<string, string | undefined> = { ...process.env }
  const nodeEnv = import.meta.dev
    ? 'development'
    : variables.NODE_ENV === 'test'
      ? 'test'
      : 'production'
  const result = initEnv({ ...variables, NODE_ENV: nodeEnv })
  if (!result.ok) {
    for (const issue of result.issues) logger.error('config_invalid', { issue })
    abort('invalid configuration')
  }
  const { env } = result
  const failure = prepareDataDir(env.dataDir, !env.production)
  if (failure)
    abort(
      `DATA_DIR ${env.dataDir} is not writable (${failure}). Run scripts/init-data.sh on the host.`,
    )

  try {
    const migrations = resolve(process.env.MIGRATIONS_DIR ?? 'server/db/migrations')
    setDb(openDatabase(join(env.dataDir, 'app.sqlite'), migrations))
  } catch (error) {
    logger.error('database_failed', { error })
    abort('database could not be opened or migrated')
  }

  if (seedOwner() === 'created') logger.info('owner_seeded', { user: env.initialAdminUsername })
  warnAboutInitialCredentials()
  loadBans()

  if (env.production && env.trustsProxies && !env.proxyPeerHeader) {
    logger.warn('client_ip_unverified', {
      note: 'PROXY_PEER_HEADER is not set. A proxy that rewrites its peer address from X-Real-IP lets clients forge their address. See README, section Reverse proxy.',
    })
  }

  nitroApp.hooks.hookOnce('close', () => {
    closeDatabase()
    logger.info('shutdown')
  })
  logger.info('startup', { origin: env.publicOrigin, timeZone: env.timeZone })
})
