import type { CalculatorText } from '../constants/calculator-text'
import type {
  EvidenceLevel,
  ReferenceChange,
  ReferenceClaim,
  ReferenceGroup,
  ReferenceKind,
  ReferenceSection,
  ReferencePlatform,
} from './references'

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

export interface ReferenceText {
  home: string
  all: string
  search: string
  searchHint: string
  submit: string
  filters: string
  types: Record<'all' | ReferenceKind, string>
  kinds: Record<ReferenceKind, string>
  topics: string
  moreTopics: string
  reset: string
  results: string
  resultOne: string
  none: string
  claimsHeading: string
  sourcesHeading: string
  changesHeading: string
  notesHeading: string
  evidence: string
  scope: string
  limits: string
  refs: string
  jump: string
  researched: string
  published: string
  watch: Record<ReferencePlatform, string>
  profile: Record<ReferencePlatform, string>
  levels: Record<EvidenceLevel, string>
  legendTitle: string
  legend: Record<Exclude<EvidenceLevel, 'other'>, string>
  legendNote: string
}

export interface ReferenceListItem {
  href: string
  title: string
  kind: string
  meta: string
  date: string
  datetime: string
  topics: string[]
  search: string
}

export interface ReferenceIndexModel extends ChromeModel {
  kind: 'references'
  heading: string
  intro: string
  basePath: string
  labels: ReferenceText
  query: { q: string; topic: string; type: '' | ReferenceKind }
  types: Array<{ label: string; count: number; href: string; active: boolean }>
  topics: Array<{ name: string; count: number; href: string; active: boolean }>
  moreTopics: Array<{ name: string; count: number; href: string; active: boolean }>
  resetHref: string | null
  results: string
  groups: Array<{ label: string; items: ReferenceListItem[] }>
}

export interface ReferenceDocModel extends ChromeModel {
  kind: 'reference'
  basePath: string
  labels: ReferenceText
  doc: {
    title: string
    kind: string
    date: string
    datetime: string
    researched: string
    topics: Array<{ name: string; href: string }>
    links: Array<{ label: string; href: string }>
    introHtml: string
    claims: ReferenceClaim[]
    sourceGroups: ReferenceGroup[]
    sourceNotes: string[]
    sections: ReferenceSection[]
    changes: Array<ReferenceChange & { label: string }>
    notes: string[]
    counts: string
  }
}

export interface CalculatorIndexModel extends ChromeModel {
  kind: 'calculators'
  heading: string
  intro: string
  basePath: string
  labels: CalculatorText
  items: Array<{ href: string; title: string; intro: string }>
}

export interface CalculatorPageModel extends ChromeModel {
  kind: 'calculator'
  calculator: 'calories' | 'peptide' | 'halflife'
  heading: string
  intro: string
  basePath: string
  indexHref: string | null
  labels: CalculatorText
  form: Record<string, string>
  values: Record<string, string>
  flags: Record<string, boolean>
  fill: number
  alternatives: Array<{
    index: number
    solvent: string
    units: string
    conc: string
    fits: boolean
    current: boolean
  }>
  sizes: Array<{ value: number; label: string }>
  durations: Record<string, string>
  substances: Array<{ category: string; items: Array<{ key: string; label: string }> }>
  reference: { metabolites: string; blood: string; urine: string; note: string }
  curve: string
  marker: { x: number; y: number }
  disclaimer: string
}

export type PublicModel =
  | PageModel
  | DocumentModel
  | ReferenceIndexModel
  | ReferenceDocModel
  | CalculatorIndexModel
  | CalculatorPageModel
