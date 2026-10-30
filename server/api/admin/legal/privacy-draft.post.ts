import { z } from 'zod'
import { generatePrivacyPolicy } from '../../../services/legal-templates'
import { listBlocks } from '../../../services/blocks'
import { getSetting } from '../../../services/settings'
import { parseBody } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const body = await parseBody(event, z.object({ cloudflare: z.boolean().default(true) }))
  const analytics = getSetting('analytics')
  const affiliate = listBlocks()
    .flatMap((node) => [node, ...node.children])
    .some((node) => node.data.affiliate === true)
  return {
    markdown: generatePrivacyPolicy({
      analyticsMode: analytics.mode,
      retentionDays: analytics.retentionDays,
      cloudflare: body.cloudflare,
      affiliate,
    }),
  }
})
