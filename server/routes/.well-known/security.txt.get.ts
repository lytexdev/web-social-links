import { useEnv } from '../../utils/env'

export default defineEventHandler((event) => {
  const env = useEnv()
  if (!env.securityContact) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  const expires = new Date(Date.now() + 180 * 86_400_000)
  expires.setUTCHours(0, 0, 0, 0)
  setResponseHeaders(event, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=86400',
  })
  return [
    `Contact: ${env.securityContact}`,
    `Expires: ${expires.toISOString()}`,
    'Preferred-Languages: de, en',
    `Canonical: ${env.publicOrigin}/.well-known/security.txt`,
    '',
  ].join('\n')
})
