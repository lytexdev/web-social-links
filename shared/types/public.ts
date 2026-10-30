export interface ImageView {
  width: number
  height: number
  alt: string
  avif: string
  webp: string
  src: string
  sizes: string
}

export interface LinkView {
  kind: 'link'
  id: string
  href: string
  title: string
  subtitle: string
  variant: 'plain' | 'icon' | 'thumbnail' | 'featured'
  icon: string | null
  thumbnail: ImageView | null
  affiliate: boolean
  badge: string
  newTab: boolean
}

export interface TileView {
  kind: 'tile'
  id: string
  href: string
  label: string
  image: ImageView | null
  icon: string | null
  affiliate: boolean
  newTab: boolean
}

export type BlockView =
  | LinkView
  | TileView
  | {
      kind: 'group'
      id: string
      index: string | null
      title: string
      layout: 'list' | 'grid-2' | 'grid-3' | 'icons'
      collapsible: boolean
      open: boolean
      children: Array<LinkView | TileView>
    }
  | { kind: 'text'; id: string; html: string }
  | { kind: 'heading'; id: string; index: string | null; text: string; level: 2 | 3 }
  | {
      kind: 'image'
      id: string
      image: ImageView
      caption: string
      href: string | null
      newTab: boolean
    }
  | {
      kind: 'code'
      id: string
      label: string
      code: string
      partner: string
      href: string | null
      affiliate: boolean
    }
  | { kind: 'notice'; id: string; title: string; html: string; tone: 'info' | 'warning' }
  | { kind: 'divider'; id: string }
  | { kind: 'spacer'; id: string; size: 'sm' | 'md' | 'lg' }

export interface SocialView {
  id: string
  label: string
  href: string
  icon: string
}

export interface PublicText {
  affiliate: string
  newTab: string
  copy: string
  copied: string
  channels: string
  imprint: string
  privacy: string
  revision: string
  back: string
  code: string
  skip: string
  legalNav: string
  preview: string
}

export interface ChromeModel {
  lang: 'de' | 'en'
  title: string
  description: string
  canonical: string
  ogImage: string | null
  themeCss: string
  favicon: string | null
  background: 'plain' | 'dots'
  rowStyle: 'hairline' | 'outlined' | 'filled'
  profileAlign: 'left' | 'center'
  text: PublicText
  icons: { arrow: string; copy: string; chevron: string }
  footer: {
    notices: string[]
    note: string
    affiliateNote: string | null
    legal: Array<{ label: string; href: string }>
    revision: string | null
  }
}

export interface PageModel extends ChromeModel {
  kind: 'page'
  preview: boolean
  profile: {
    displayName: string
    handle: string
    bio: string
    avatar: ImageView | null
    social: SocialView[]
  }
  blocks: BlockView[]
}

export interface DocumentModel extends ChromeModel {
  kind: 'document'
  heading: string
  html: string
}

export type PublicModel = PageModel | DocumentModel
