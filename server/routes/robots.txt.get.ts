import { latestSnapshot } from '../services/publish'
import { DEFAULT_AI_CRAWLERS } from '../../shared/schemas/settings'

export default defineEventHandler((event) => {
  const crawlers = latestSnapshot()?.settings.site.aiCrawlers ?? DEFAULT_AI_CRAWLERS
  const lines = [
    ...crawlers.flatMap((agent) => [
      `User-agent: ${agent.replace(/[\r\n]/g, '')}`,
      'Disallow: /',
      '',
    ]),
    'User-agent: *',
    'Allow: /',
    '',
  ]
  setResponseHeaders(event, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  })
  return lines.join('\n')
})
