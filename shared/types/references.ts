export type ReferenceKind = 'video' | 'short'

export type EvidenceLevel = 'high' | 'moderate' | 'low' | 'preliminary' | 'refuted' | 'other'

export type ReferencePlatform = 'youtube' | 'tiktok' | 'instagram'

export interface ReferenceLink {
  platform: ReferencePlatform
  url: string
  exact: boolean
}

export interface ReferenceClaim {
  html: string
  evidence: string
  level: EvidenceLevel
  refs: number[]
  limitsHtml: string
}

export interface ReferenceSource {
  n: number
  html: string
}

export interface ReferenceGroup {
  heading: string
  items: ReferenceSource[]
}

export interface ReferenceSection {
  heading: string
  html: string
}

export interface ReferenceChange {
  date: string | null
  html: string
}

export type ReferenceWarningCode =
  | 'title_missing'
  | 'date_invalid'
  | 'link_missing'
  | 'link_generic'
  | 'claims_missing'
  | 'sources_missing'
  | 'ref_unknown'

export interface ReferenceWarning {
  code: ReferenceWarningCode
  detail?: string
}

export interface ReferenceDoc {
  slug: string
  path: string
  kind: ReferenceKind
  title: string
  published: string | null
  researched: string | null
  topics: string[]
  links: ReferenceLink[]
  introHtml: string
  claims: ReferenceClaim[]
  sourceGroups: ReferenceGroup[]
  sourceNotes: string[]
  sections: ReferenceSection[]
  changes: ReferenceChange[]
  notes: string[]
  warnings: ReferenceWarning[]
  searchText: string
}

export interface ReferenceSyncStatus {
  at: number | null
  ok: boolean
  error: string | null
  documents: number
  added: number
  updated: number
  removed: number
  skipped: number
}
