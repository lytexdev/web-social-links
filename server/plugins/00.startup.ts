import { logger } from '../utils/logger'
import { initEnv } from '../utils/env'
import { prepareDataDir } from '../utils/data-dir'

export default defineNitroPlugin(() => {
  const nodeEnv = import.meta.dev
    ? 'development'
    : process.env.NODE_ENV === 'test'
      ? 'test'
      : 'production'
  const result = initEnv({ ...process.env, NODE_ENV: nodeEnv })
  if (!result.ok) {
    for (const issue of result.issues) logger.error('config_invalid', { issue })
    logger.error('startup_aborted', { reason: 'invalid configuration' })
    process.exit(1)
  }
  const { env } = result
  const failure = prepareDataDir(env.dataDir, !env.production)
  if (failure) {
    logger.error('startup_aborted', {
      reason: `DATA_DIR ${env.dataDir} is not writable (${failure}). Run scripts/init-data.sh on the host.`,
    })
    process.exit(1)
  }
  if (env.production && env.trustsProxies && !env.proxyPeerHeader) {
    logger.warn('client_ip_unverified', {
      note: 'PROXY_PEER_HEADER is not set. A proxy that rewrites its peer address from X-Real-IP lets clients forge their address. See README, section Reverse proxy.',
    })
  }
  logger.info('startup', { origin: env.publicOrigin, timeZone: env.timeZone })
})
