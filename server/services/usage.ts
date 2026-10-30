import type { BlockNode } from '../../shared/schemas/content'
import { listBlocks } from './blocks'
import { latestSnapshot } from './publish'
import { getAllSettings } from './settings'

export interface Usage {
  kind: 'block' | 'avatar' | 'og' | 'social' | 'published'
  id: string
  label: string
}

function blockLabel(node: BlockNode): string {
  const data = node.data
  return String(data.title ?? data.label ?? data.text ?? data.alt ?? node.type)
}

export function mediaUsages(): Map<string, Usage[]> {
  const usages = new Map<string, Usage[]>()
  const add = (mediaId: string, usage: Usage) =>
    usages.set(mediaId, [...(usages.get(mediaId) ?? []), usage])
  for (const node of listBlocks().flatMap((block) => [block, ...block.children])) {
    for (const key of ['thumbnail', 'image', 'media', 'icon']) {
      const value = node.data[key]
      if (typeof value !== 'string' || !value) continue
      const mediaId = value.startsWith('media:') ? value.slice(6) : key === 'icon' ? null : value
      if (mediaId) add(mediaId, { kind: 'block', id: node.id, label: blockLabel(node) })
    }
  }
  const settings = getAllSettings()
  if (settings.profile.avatar)
    add(settings.profile.avatar, { kind: 'avatar', id: 'profile', label: 'Avatar' })
  if (settings.site.ogImage)
    add(settings.site.ogImage, { kind: 'og', id: 'site', label: 'Open Graph' })
  for (const social of settings.profile.social) {
    if (social.icon.startsWith('media:'))
      add(social.icon.slice(6), { kind: 'social', id: social.id, label: social.label })
  }
  const snapshot = latestSnapshot()
  for (const mediaId of Object.keys(snapshot?.media ?? {})) {
    add(mediaId, {
      kind: 'published',
      id: String(snapshot?.revision),
      label: `Rev. ${snapshot?.revision}`,
    })
  }
  return usages
}
