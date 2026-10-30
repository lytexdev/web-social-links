import { SlidingWindowLimiter } from '../services/ratelimit'
import { clientIp } from '../utils/http'
import { routeKind } from '../utils/route-kind'

const publicPages = new SlidingWindowLimiter(120, 60_000)
const redirects = new SlidingWindowLimiter(60, 60_000)

export default defineEventHandler((event) => {
  const kind = routeKind(event.path)
  const limiter = kind === 'public-page' ? publicPages : kind === 'go' ? redirects : null
  if (!limiter) return
  const result = limiter.hit(clientIp(event))
  if (!result.allowed) {
    setResponseHeader(event, 'Retry-After', Math.ceil(result.retryAfterMs / 1000))
    throw createError({ statusCode: 429, statusMessage: 'Too Many Requests' })
  }
})
