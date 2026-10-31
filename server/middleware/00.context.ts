import { resolveClientIp } from '../utils/client-ip'

export default defineEventHandler((event) => {
  event.context.clientIp = resolveClientIp(
    event.node.req.socket.remoteAddress,
    getRequestHeader(event, 'x-real-ip'),
  )
})
