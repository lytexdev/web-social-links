import { checkLink } from '../../../services/link-check'
import { listBlocks } from '../../../services/blocks'
import { getSetting } from '../../../services/settings'

export default defineEventHandler(async () => {
  const targets = new Map<string, string>()
  for (const node of listBlocks().flatMap((block) => [block, ...block.children])) {
    const url = node.data.url
    if (typeof url === 'string' && /^https?:/i.test(url)) targets.set(node.id, url)
  }
  for (const social of getSetting('profile').social)
    if (/^https?:/i.test(social.url)) targets.set(social.id, social.url)
  const entries = [...targets.entries()].slice(0, 100)
  const results: Array<{ id: string; url: string; result: Awaited<ReturnType<typeof checkLink>> }> =
    []
  for (let index = 0; index < entries.length; index += 5) {
    const batch = entries.slice(index, index + 5)
    results.push(
      ...(await Promise.all(
        batch.map(async ([id, url]) => ({ id, url, result: await checkLink(url) })),
      )),
    )
  }
  return results
})
