import { desc, eq, max } from 'drizzle-orm'
import type { BlockNode, BlockType } from '../../shared/schemas/content'
import { strictBlockData } from '../../shared/schemas/content'
import { SETTING_KEYS, settingsSchemas, type Settings } from '../../shared/schemas/settings'
import { checkThemeContrast, themeCss } from '../../shared/schemas/theme'
import { checkLinkUrl } from '../../shared/utils/url-policy'
import { useDb } from '../db/client'
import { pageVersions } from '../db/schema'
import { useEnv } from '../utils/env'
import { apiError } from '../utils/http'
import { recordAudit } from './audit'
import { listBlocks, replaceAllBlocks } from './blocks'
import { randomId } from './crypto'
import { iconExists, iconSvgs } from './icons'
import { kvSet } from './kv'
import { hasPlaceholders, renderDocumentMarkdown, renderTextMarkdown } from './markdown'
import { listMedia, variantsOf, type MediaVariants } from './media'
import { listPages, replaceAllPages } from './pages'
import { getAllSettings, writeSetting } from './settings'

export const UI_ICONS = ['tabler:arrow-up-right', 'tabler:copy', 'tabler:chevron-down'] as const

export interface SnapshotMedia extends MediaVariants {
  width: number
  height: number
  alt: string
  decorative: boolean
}

export interface SnapshotPage {
  id: string
  slug: string
  title: string
  kind: string
  markdown: string
  html: string
}

export interface Snapshot {
  version: 1
  revision: number
  publishedAt: number
  settings: Settings
  blocks: BlockNode[]
  pages: SnapshotPage[]
  textHtml: Record<string, string>
  textLinks: Record<string, string[]>
  icons: Record<string, string>
  media: Record<string, SnapshotMedia>
  themeCss: string
}

export interface PublishIssue {
  scope: 'block' | 'settings' | 'legal' | 'theme' | 'page'
  id: string
  field: string
  code: string
  detail?: string
}

function collectIcons(blocks: BlockNode[], settings: Settings): Set<string> {
  const refs = new Set<string>(UI_ICONS)
  for (const node of blocks.flatMap((block) => [block, ...block.children])) {
    const icon = node.data.icon
    if (typeof icon === 'string') refs.add(icon)
  }
  for (const social of settings.profile.social) refs.add(social.icon)
  return refs
}

function collectMedia(blocks: BlockNode[], settings: Settings, icons: Set<string>): Set<string> {
  const ids = new Set<string>()
  for (const node of blocks.flatMap((block) => [block, ...block.children])) {
    for (const key of ['thumbnail', 'image', 'media'] as const) {
      const value = node.data[key]
      if (typeof value === 'string' && value) ids.add(value)
    }
  }
  if (settings.profile.avatar) ids.add(settings.profile.avatar)
  if (settings.site.ogImage) ids.add(settings.site.ogImage)
  for (const ref of icons) if (ref.startsWith('media:')) ids.add(ref.slice(6))
  return ids
}

export async function buildSnapshot(
  mode: 'publish' | 'preview',
): Promise<{ snapshot: Snapshot; issues: PublishIssue[] }> {
  const issues: PublishIssue[] = []
  const rawSettings = getAllSettings()
  const settings = Object.fromEntries(
    SETTING_KEYS.map((key) => {
      const result = settingsSchemas[key].safeParse(rawSettings[key])
      if (!result.success) {
        for (const issue of result.error.issues) {
          issues.push({
            scope: 'settings',
            id: key,
            field: issue.path.join('.'),
            code: issue.message,
          })
        }
        return [key, rawSettings[key]]
      }
      return [key, result.data]
    }),
  ) as Settings

  const ownHosts = [useEnv().publicHost, ...useEnv().adminHosts]
  const mediaRows = new Map(listMedia().map((row) => [row.id, row]))

  const validate = (node: BlockNode): BlockNode | null => {
    const result = strictBlockData[node.type as BlockType].safeParse(node.data)
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({
          scope: 'block',
          id: node.id,
          field: issue.path.join('.'),
          code: issue.message,
        })
      }
      return null
    }
    const data = result.data as Record<string, unknown>
    if (typeof data.url === 'string' && data.url) {
      const check = checkLinkUrl(data.url, ownHosts)
      if (!check.ok) {
        issues.push({ scope: 'block', id: node.id, field: 'url', code: `url_${check.reason}` })
        return null
      }
    }
    for (const key of ['thumbnail', 'image', 'media']) {
      const value = data[key]
      if (typeof value === 'string' && value && !mediaRows.has(value)) {
        issues.push({ scope: 'block', id: node.id, field: key, code: 'media_missing' })
        return null
      }
    }
    if (node.type === 'image') {
      const row = mediaRows.get(String(data.media))
      if (!data.decorative && !String(data.alt) && !row?.alt && !row?.decorative) {
        issues.push({ scope: 'block', id: node.id, field: 'alt', code: 'alt_required' })
        return null
      }
    }
    return {
      ...node,
      data,
      children: node.children.map(validate).filter((child): child is BlockNode => child !== null),
    }
  }

  const blocks = listBlocks()
    .map(validate)
    .filter((node): node is BlockNode => node !== null)

  const iconRefs = collectIcons(blocks, settings)
  for (const ref of iconRefs) {
    if (!(await iconExists(ref)))
      issues.push({ scope: 'block', id: ref, field: 'icon', code: 'icon_missing' })
  }

  const textHtml: Record<string, string> = {}
  const textLinks: Record<string, string[]> = {}
  for (const node of blocks) {
    if (node.type === 'text' || node.type === 'notice') {
      const rendered = renderTextMarkdown(
        String(node.data.markdown ?? ''),
        (index) => `/go/t/${node.id}/${index}`,
      )
      textHtml[node.id] = rendered.html
      textLinks[node.id] = rendered.links
    }
  }

  const pages: SnapshotPage[] = listPages().map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    kind: row.kind,
    markdown: row.markdown,
    html: renderDocumentMarkdown(row.markdown),
  }))

  for (const [target, slug] of [
    ['impressum', 'impressum'],
    ['privacy', 'datenschutz'],
  ] as const) {
    const config = settings.legal[target]
    if (config.mode === 'url') {
      if (!checkLinkUrl(config.url).ok)
        issues.push({ scope: 'legal', id: target, field: 'url', code: 'legal_unreachable' })
    } else {
      const page = pages.find((item) => item.slug === slug)
      if (!page || page.markdown.trim().length < 40) {
        issues.push({ scope: 'legal', id: target, field: 'page', code: 'legal_empty' })
      } else if (hasPlaceholders(page.markdown)) {
        issues.push({ scope: 'legal', id: target, field: 'page', code: 'legal_placeholders' })
      }
    }
  }

  for (const check of checkThemeContrast(settings.theme)) {
    if (!check.ok) {
      issues.push({
        scope: 'theme',
        id: check.scheme,
        field: check.pair,
        code: 'contrast',
        detail: `${check.ratio}:1 < ${check.required}:1`,
      })
    }
  }

  const media: Record<string, SnapshotMedia> = {}
  for (const id of collectMedia(blocks, settings, iconRefs)) {
    const row = mediaRows.get(id)
    if (!row) {
      if (mode === 'publish')
        issues.push({ scope: 'settings', id, field: 'media', code: 'media_missing' })
      continue
    }
    media[id] = {
      ...variantsOf(row),
      width: row.width,
      height: row.height,
      alt: row.alt,
      decorative: row.decorative,
    }
  }

  const snapshot: Snapshot = {
    version: 1,
    revision: 0,
    publishedAt: Date.now(),
    settings,
    blocks,
    pages,
    textHtml,
    textLinks,
    icons: await iconSvgs(iconRefs),
    media,
    themeCss: themeCss(settings.theme),
  }
  return { snapshot, issues }
}

let current: Snapshot | null | undefined

export function latestSnapshot(): Snapshot | null {
  if (current === undefined) {
    const row = useDb()
      .select()
      .from(pageVersions)
      .orderBy(desc(pageVersions.revision))
      .limit(1)
      .get()
    current = row ? (row.snapshot as Snapshot) : null
  }
  return current
}

export function snapshotForRevision(revision: number): Snapshot | null {
  const row = useDb().select().from(pageVersions).where(eq(pageVersions.revision, revision)).get()
  return row ? (row.snapshot as Snapshot) : null
}

const listeners = new Set<() => void>()

export function onPublish(listener: () => void): void {
  listeners.add(listener)
}

export async function publish(note: string, userId: string): Promise<{ revision: number }> {
  const { snapshot, issues } = await buildSnapshot('publish')
  if (issues.length > 0)
    throw apiError(422, 'publish_blocked', 'The page cannot be published yet', { issues })
  const db = useDb()
  const revision = db.transaction((tx) => {
    const next =
      (tx
        .select({ value: max(pageVersions.revision) })
        .from(pageVersions)
        .get()?.value ?? 0) + 1
    snapshot.revision = next
    tx.insert(pageVersions)
      .values({
        id: randomId(),
        revision: next,
        snapshot,
        publishedAt: snapshot.publishedAt,
        publishedBy: userId,
        note: note || null,
      })
      .run()
    return next
  })
  kvSet('draft_changes', '0')
  current = snapshot
  for (const listener of listeners) listener()
  recordAudit(userId, 'publish', 'page', String(revision), note)
  return { revision }
}

export function listVersions() {
  return useDb()
    .select({
      revision: pageVersions.revision,
      publishedAt: pageVersions.publishedAt,
      publishedBy: pageVersions.publishedBy,
      note: pageVersions.note,
    })
    .from(pageVersions)
    .orderBy(desc(pageVersions.revision))
    .all()
}

export function restoreVersion(revision: number, userId: string): void {
  const snapshot = snapshotForRevision(revision)
  if (!snapshot) throw apiError(404, 'not_found', 'Version not found')
  useDb().transaction(() => {
    replaceAllBlocks(
      snapshot.blocks.flatMap((node, index) => [
        {
          id: node.id,
          parentId: null,
          type: node.type,
          position: index,
          data: node.data,
          visible: node.visible,
          visibleFrom: node.visibleFrom,
          visibleUntil: node.visibleUntil,
        },
        ...node.children.map((child, childIndex) => ({
          id: child.id,
          parentId: node.id,
          type: child.type,
          position: childIndex,
          data: child.data,
          visible: child.visible,
          visibleFrom: child.visibleFrom,
          visibleUntil: child.visibleUntil,
        })),
      ]),
    )
    replaceAllPages(
      snapshot.pages.map(({ id, slug, title, kind, markdown }) => ({
        id,
        slug,
        title,
        kind,
        markdown,
      })),
    )
    for (const key of SETTING_KEYS) writeSetting(key, snapshot.settings[key] as never)
  })
  kvSet('draft_changes', '1')
  recordAudit(userId, 'restore', 'version', String(revision))
}

export function resetSnapshotCache(): void {
  current = undefined
}
