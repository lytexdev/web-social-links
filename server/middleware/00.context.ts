import { resolveClientIp } from '../utils/client-ip'
import { useEnv } from '../utils/env'
import { logger } from '../utils/logger'

let lastPeerWarning = 0

export default defineEventHandler((event) => {
  const env = useEnv()
  const socket = event.node.req.socket.remoteAddress
  const peer = env.proxyPeerHeader ? getRequestHeader(event, env.proxyPeerHeader) : undefined
  const result = resolveClientIp(
    { socket, forwardedFor: getRequestHeader(event, 'x-forwarded-for'), peer },
    { trusted: env.trustedProxies, cloudflare: env.cloudflare },
  )
  event.context.clientIp = result.ip
  event.context.viaCloudflare = result.viaCloudflare
  if (
    env.proxyPeerHeader &&
    peer === undefined &&
    result.ip !== socket &&
    Date.now() - lastPeerWarning > 3_600_000
  ) {
    lastPeerWarning = Date.now()
    logger.warn('proxy_peer_header_missing', {
      header: env.proxyPeerHeader,
      note: 'The reverse proxy did not send the configured peer header',
    })
  }
})
