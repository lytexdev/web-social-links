import { DIRECT_SOURCE } from '../../shared/constants/platforms'
import { PUBLIC_TEXT } from '../../shared/constants/public-text'
import type { BlockNode } from '../../shared/schemas/content'
import type {
  BlockView,
  ChromeModel,
  DocumentModel,
  ImageView,
  LinkView,
  PageModel,
  TileView,
} from '../../shared/types/public'
import { mediaFileName } from './media'
import type { Snapshot, SnapshotMedia } from './publish'

const SIZES = {
  avatar: '(min-width: 960px) 96px, 72px',
  thumbnail: '40px',
  tile: '(min-width: 960px) 300px, 50vw',
  image: '(min-width: 960px) 620px, 100vw',
} as const

export function isLive(
  node: Pick<BlockNode, 'visible' | 'visibleFrom' | 'visibleUntil'>,
  now: number,
): boolean {
  if (!node.visible) return false
  if (node.visibleFrom !== null && node.visibleFrom > now) return false
  if (node.visibleUntil !== null && node.visibleUntil <= now) return false
  return true
}

export function nextBoundary(snapshot: Snapshot, now: number): number {
  let next = Number.POSITIVE_INFINITY
  for (const node of snapshot.blocks.flatMap((block) => [block, ...block.children])) {
    for (const value of [node.visibleFrom, node.visibleUntil]) {
      if (value !== null && value > now && value < next) next = value
    }
  }
  return next
}

function imageView(
  media: SnapshotMedia | undefined,
  id: string,
  alt: string,
  sizes: string,
  maxWidth: number,
): ImageView | null {
  if (!media) return null
  const widths = media.widths.filter((width) => width <= maxWidth * 3)
  const usable = widths.length > 0 ? widths : media.widths.slice(0, 1)
  const set = (format: string) =>
    usable
      .map((width) => `/media/${mediaFileName(id, media.hash, width, format)} ${width}w`)
      .join(', ')
  const fallbackWidth = usable.find((width) => width >= maxWidth) ?? usable.at(-1) ?? media.width
  return {
    width: media.width,
    height: media.height,
    alt: media.decorative ? '' : alt || media.alt,
    avif: media.formats.includes('avif') ? set('avif') : '',
    webp: set('webp'),
    src: `/media/${mediaFileName(id, media.hash, fallbackWidth, 'webp')}`,
    sizes,
  }
}

function goHref(id: string, source: string): string {
  return source === DIRECT_SOURCE ? `/go/${id}` : `/go/${id}?s=${encodeURIComponent(source)}`
}

function iconFor(snapshot: Snapshot, ref: unknown): string | null {
  if (typeof ref !== 'string') return null
  if (ref.startsWith('media:')) {
    const id = ref.slice(6)
    const media = snapshot.media[id]
    if (!media) return null
    const width = media.widths.find((value) => value >= 48) ?? media.widths.at(-1) ?? 48
    return `<img src="/media/${mediaFileName(id, media.hash, width, 'webp')}" width="24" height="24" alt="" loading="lazy" decoding="async">`
  }
  return snapshot.icons[ref] ?? null
}

function chrome(snapshot: Snapshot, origin: string, path: string): ChromeModel {
  const { settings } = snapshot
  const lang = settings.site.lang
  const text = { ...PUBLIC_TEXT[lang], affiliate: settings.legal.affiliateLabel || 'Anzeige' }
  const legalHref = (target: 'impressum' | 'privacy', slug: string) =>
    settings.legal[target].mode === 'url' ? settings.legal[target].url : `/${slug}`
  const og = settings.site.ogImage ? snapshot.media[settings.site.ogImage] : undefined
  const avatar = settings.profile.avatar ? snapshot.media[settings.profile.avatar] : undefined
  const favicon =
    avatar && settings.profile.avatar
      ? `/media/${mediaFileName(settings.profile.avatar, avatar.hash, avatar.widths.find((width) => width >= 96) ?? avatar.widths.at(-1) ?? 48, 'webp')}`
      : null
  const date = new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(new Date(snapshot.publishedAt))
  return {
    lang,
    title: settings.site.title || settings.profile.displayName || 'Links',
    description: settings.site.description || settings.profile.bio,
    canonical: `${origin}${path}`,
    ogImage:
      og && settings.site.ogImage
        ? `${origin}/media/${mediaFileName(settings.site.ogImage, og.hash, 'og', 'jpg')}`
        : null,
    themeCss: snapshot.themeCss,
    favicon,
    background: settings.theme.background,
    rowStyle: settings.theme.rowStyle,
    profileAlign: settings.theme.profileAlign,
    text,
    icons: {
      arrow: snapshot.icons['tabler:arrow-up-right'] ?? '',
      copy: snapshot.icons['tabler:copy'] ?? '',
      chevron: snapshot.icons['tabler:chevron-down'] ?? '',
    },
    footer: {
      notices: settings.footer.notices.filter(Boolean),
      note: settings.footer.note,
      affiliateNote: null,
      legal: [
        { label: text.imprint, href: legalHref('impressum', 'impressum') },
        { label: text.privacy, href: legalHref('privacy', 'datenschutz') },
      ],
      revision:
        settings.footer.showRevision && snapshot.revision > 0
          ? `${text.revision} ${snapshot.revision} · ${date}`
          : null,
    },
  }
}

export function buildPageModel(
  snapshot: Snapshot,
  options: { source: string; now: number; origin: string; path: string; preview: boolean },
): PageModel {
  const base = chrome(snapshot, options.origin, options.path)
  const { settings } = snapshot
  let sectionCounter = 0
  let affiliate = false
  const nextIndex = () => String(++sectionCounter).padStart(2, '0')

  const link = (node: BlockNode): LinkView => {
    const data = node.data
    if (data.affiliate) affiliate = true
    const thumbnailId = typeof data.thumbnail === 'string' ? data.thumbnail : null
    return {
      kind: 'link',
      id: node.id,
      href: goHref(node.id, options.source),
      title: String(data.title ?? ''),
      subtitle: String(data.subtitle ?? ''),
      variant: (data.variant as LinkView['variant']) ?? 'icon',
      icon: data.variant === 'plain' ? null : iconFor(snapshot, data.icon),
      thumbnail: thumbnailId
        ? imageView(snapshot.media[thumbnailId], thumbnailId, '', SIZES.thumbnail, 40)
        : null,
      affiliate: Boolean(data.affiliate),
      badge: String(data.badge ?? ''),
      newTab: Boolean(data.newTab),
    }
  }

  const tile = (node: BlockNode): TileView => {
    const data = node.data
    if (data.affiliate) affiliate = true
    const imageId = typeof data.image === 'string' ? data.image : null
    return {
      kind: 'tile',
      id: node.id,
      href: goHref(node.id, options.source),
      label: String(data.label ?? ''),
      image: imageId ? imageView(snapshot.media[imageId], imageId, '', SIZES.tile, 300) : null,
      icon: iconFor(snapshot, data.icon),
      affiliate: Boolean(data.affiliate),
      newTab: Boolean(data.newTab),
    }
  }

  const blocks: BlockView[] = []
  for (const node of snapshot.blocks) {
    if (!isLive(node, options.now)) continue
    const data = node.data
    switch (node.type) {
      case 'link':
        blocks.push(link(node))
        break
      case 'tile':
        blocks.push(tile(node))
        break
      case 'group': {
        const children = node.children
          .filter((child) => isLive(child, options.now))
          .map((child) => (child.type === 'tile' ? tile(child) : link(child)))
        if (children.length === 0) break
        const title = String(data.title ?? '')
        blocks.push({
          kind: 'group',
          id: node.id,
          index: title ? nextIndex() : null,
          title,
          layout: (data.layout as 'list') ?? 'list',
          collapsible: Boolean(data.collapsible) && Boolean(title),
          open: data.open !== false,
          children,
        })
        break
      }
      case 'text':
        blocks.push({ kind: 'text', id: node.id, html: snapshot.textHtml[node.id] ?? '' })
        break
      case 'heading':
        blocks.push({
          kind: 'heading',
          id: node.id,
          index: data.level === 3 ? null : nextIndex(),
          text: String(data.text ?? ''),
          level: data.level === 3 ? 3 : 2,
        })
        break
      case 'image': {
        const mediaId = String(data.media ?? '')
        const image = imageView(
          snapshot.media[mediaId],
          mediaId,
          data.decorative ? '' : String(data.alt ?? ''),
          SIZES.image,
          620,
        )
        if (!image) break
        if (data.decorative) image.alt = ''
        const url = String(data.url ?? '')
        blocks.push({
          kind: 'image',
          id: node.id,
          image,
          caption: String(data.caption ?? ''),
          href: url ? goHref(node.id, options.source) : null,
          newTab: Boolean(data.newTab),
        })
        break
      }
      case 'code': {
        if (data.affiliate) affiliate = true
        const url = String(data.url ?? '')
        blocks.push({
          kind: 'code',
          id: node.id,
          label: String(data.label ?? ''),
          code: String(data.code ?? ''),
          partner: String(data.partner ?? ''),
          href: url ? goHref(node.id, options.source) : null,
          affiliate: Boolean(data.affiliate),
        })
        break
      }
      case 'notice':
        blocks.push({
          kind: 'notice',
          id: node.id,
          title: String(data.title ?? ''),
          html: snapshot.textHtml[node.id] ?? '',
          tone: data.tone === 'warning' ? 'warning' : 'info',
        })
        break
      case 'divider':
        blocks.push({ kind: 'divider', id: node.id })
        break
      case 'spacer':
        blocks.push({ kind: 'spacer', id: node.id, size: (data.size as 'sm') ?? 'md' })
        break
    }
  }

  const avatarId = settings.profile.avatar
  return {
    ...base,
    kind: 'page',
    preview: options.preview,
    footer: { ...base.footer, affiliateNote: affiliate ? settings.legal.affiliateNote : null },
    profile: {
      displayName: settings.profile.displayName,
      handle: settings.profile.handle,
      bio: settings.profile.bio,
      avatar: avatarId
        ? imageView(
            snapshot.media[avatarId],
            avatarId,
            settings.profile.displayName,
            SIZES.avatar,
            96,
          )
        : null,
      social: settings.profile.social
        .filter((item) => item.url)
        .map((item) => ({
          id: item.id,
          label: item.label,
          href: goHref(item.id, options.source),
          icon: iconFor(snapshot, item.icon) ?? '',
        })),
    },
    blocks,
  }
}

export function buildDocumentModel(
  snapshot: Snapshot,
  slug: string,
  options: { origin: string; path: string },
): DocumentModel | null {
  const page = snapshot.pages.find((item) => item.slug === slug)
  if (!page) return null
  const base = chrome(snapshot, options.origin, options.path)
  return {
    ...base,
    kind: 'document',
    title: `${page.title} · ${base.title}`,
    heading: page.title,
    html: page.html,
  }
}

export interface LinkTarget {
  url: string
  appendUtm: boolean
}

export function resolveLinkTarget(snapshot: Snapshot, id: string, now: number): LinkTarget | null {
  for (const social of snapshot.settings.profile.social) {
    if (social.id === id && social.url) return { url: social.url, appendUtm: false }
  }
  for (const node of snapshot.blocks) {
    const candidates =
      node.type === 'group'
        ? node.children.map((child) => ({ child, parent: node }))
        : [{ child: node, parent: null }]
    for (const { child, parent } of candidates) {
      if (child.id !== id) continue
      if (!isLive(child, now) || (parent && !isLive(parent, now))) return null
      const url = typeof child.data.url === 'string' ? child.data.url : ''
      if (!url) return null
      return { url, appendUtm: Boolean(child.data.appendUtm) }
    }
  }
  return null
}

export function resolveTextLink(
  snapshot: Snapshot,
  blockId: string,
  index: number,
  now: number,
): string | null {
  const node = snapshot.blocks.find((block) => block.id === blockId)
  if (!node || !isLive(node, now)) return null
  return snapshot.textLinks[blockId]?.[index] ?? null
}

export function withUtm(
  url: string,
  options: { source: string; medium: string; fallbackSource: string },
): string {
  if (!/^https?:/i.test(url)) return url
  const target = new URL(url)
  const source =
    options.source || (options.fallbackSource === DIRECT_SOURCE ? '' : options.fallbackSource)
  if (source && !target.searchParams.has('utm_source'))
    target.searchParams.set('utm_source', source)
  if (options.medium && !target.searchParams.has('utm_medium'))
    target.searchParams.set('utm_medium', options.medium)
  return target.href
}
