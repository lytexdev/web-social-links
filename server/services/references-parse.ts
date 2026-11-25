import type {
  EvidenceLevel,
  ReferenceChange,
  ReferenceClaim,
  ReferenceDoc,
  ReferenceGroup,
  ReferenceKind,
  ReferenceLink,
  ReferencePlatform,
  ReferenceSection,
  ReferenceWarning,
} from '../../shared/types/references'
import { checkLinkUrl } from '../../shared/utils/url-policy'
import { renderReferenceBlock, renderReferenceInline } from './markdown'

export const REFERENCE_PATH = /^(videos|shorts)\/(\d{4})\/([^/]{1,120})\.md$/

const KINDS: Record<string, ReferenceKind> = { videos: 'video', shorts: 'short' }
const DATE = /^\d{4}-\d{2}-\d{2}$/
const PLACEHOLDER = /VIDEO_ID|REEL_ID|YOUTUBE_ID/
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

const LEVELS: Array<[EvidenceLevel, string[]]> = [
  [
    'high',
    [
      'hoch',
      'stark',
      'etabliert',
      'gesichert',
      'belegt',
      'bestätigt',
      'dokumentiert',
      'zutreffend',
      'high',
      'strong',
      'established',
    ],
  ],
  ['moderate', ['moderat', 'mittel', 'teilweise', 'moderate', 'partly']],
  [
    'low',
    ['niedrig', 'schwach', 'gering', 'begrenzt', 'nicht übertragbar', 'low', 'weak', 'limited'],
  ],
  [
    'preliminary',
    [
      'vorläufig',
      'präklinisch',
      'mechanistisch',
      'theoretisch',
      'hypothese',
      'plausibel',
      'nicht verifiziert',
      'preliminary',
      'preclinical',
    ],
  ],
  [
    'refuted',
    [
      'widerlegt',
      'unzureichend',
      'nicht belegt',
      'unbelegt',
      'keine evidenz',
      'fehlende evidenz',
      'widerspricht',
      'falsch',
      'überholt',
      'refuted',
      'insufficient',
      'not supported',
    ],
  ],
]

export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function evidenceLevel(text: string): EvidenceLevel {
  const lower = text.toLowerCase()
  let best: EvidenceLevel = 'other'
  let position = Number.POSITIVE_INFINITY
  for (const [level, words] of LEVELS) {
    for (const word of words) {
      const index = lower.indexOf(word)
      if (index !== -1 && index < position) {
        position = index
        best = level
      }
    }
  }
  return best
}

export function referenceSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/ß/g, 'ss')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100)
      .replace(/-+$/, '') || 'eintrag'
  )
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"')
  }
  return trimmed
}

function parseList(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return trimmed ? [unquote(trimmed)] : []
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string')
  } catch {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((item) => unquote(item))
      .filter(Boolean)
  }
  return []
}

export function splitFrontmatter(text: string): { data: Record<string, string>; body: string } {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(normalized)
  if (!match) return { data: {}, body: normalized }
  const data: Record<string, string> = {}
  for (const line of (match[1] ?? '').split('\n')) {
    const field = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line)
    if (field?.[1]) data[field[1]] = field[2] ?? ''
  }
  return { data, body: normalized.slice(match[0].length) }
}

export function splitRow(line: string): string[] {
  let source = line.trim()
  if (source.startsWith('|')) source = source.slice(1)
  if (source.endsWith('|') && !source.endsWith('\\|')) source = source.slice(0, -1)
  const cells: string[] = []
  let current = ''
  let code = false
  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    if (char === '\\' && source[index + 1] === '|') {
      current += '|'
      index++
    } else if (char === '`') {
      code = !code
      current += char
    } else if (char === '|' && !code) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

function safeUrl(value: string): string | null {
  const url = value.trim().replace(/\s+/g, '')
  if (!/^https:\/\//i.test(url) || PLACEHOLDER.test(url)) return null
  return checkLinkUrl(url).ok ? url : null
}

function platformLink(platform: ReferencePlatform, value: string): ReferenceLink | null {
  const url = safeUrl(value)
  if (!url) return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
  const path = parsed.pathname
  if (platform === 'tiktok') {
    if (host !== 'tiktok.com' && !host.endsWith('.tiktok.com')) return null
    return { platform, url, exact: /^\/@[^/]+\/video\/\d+/.test(path) || host === 'vm.tiktok.com' }
  }
  if (platform === 'instagram') {
    if (host !== 'instagram.com') return null
    return { platform, url, exact: /^\/(reel|reels|p)\/[A-Za-z0-9_-]+/.test(path) }
  }
  if (host !== 'youtube.com' && host !== 'youtu.be' && host !== 'm.youtube.com') return null
  return {
    platform,
    url,
    exact: host === 'youtu.be' || parsed.searchParams.has('v') || path.startsWith('/shorts/'),
  }
}

function pickLinks(
  frontmatter: Record<string, string>,
  bodyLinks: Partial<Record<ReferencePlatform, string>>,
): ReferenceLink[] {
  const links: ReferenceLink[] = []
  const youtubeId = unquote(frontmatter.youtube_id ?? '')
  const candidates: Record<ReferencePlatform, string[]> = {
    youtube: [
      YOUTUBE_ID.test(youtubeId) ? `https://www.youtube.com/watch?v=${youtubeId}` : '',
      unquote(frontmatter.youtube_url ?? ''),
      bodyLinks.youtube ?? '',
    ],
    tiktok: [unquote(frontmatter.tiktok_url ?? ''), bodyLinks.tiktok ?? ''],
    instagram: [unquote(frontmatter.instagram_url ?? ''), bodyLinks.instagram ?? ''],
  }
  for (const platform of ['youtube', 'tiktok', 'instagram'] as const) {
    const found = candidates[platform]
      .map((value) => (value ? platformLink(platform, value) : null))
      .filter((link): link is ReferenceLink => link !== null)
    const best = found.find((link) => link.exact) ?? found[0]
    if (best) links.push(best)
  }
  return links
}

function sectionType(heading: string, lines: string[]): 'claims' | 'sources' | 'changes' | 'other' {
  const lower = heading.toLowerCase()
  if (
    /kernaussage|evidenz|aussagen|claims|evidence/.test(lower) &&
    lines.some((line) => line.trim().startsWith('|'))
  )
    return 'claims'
  if (/korrektur|changelog|update|änderung|changes/.test(lower)) return 'changes'
  if (/quellen|studien|literatur|referenz|sources|references|studies/.test(lower)) return 'sources'
  return 'other'
}

function parseClaims(lines: string[]): ReferenceClaim[] {
  const rows = lines.filter((line) => line.trim().startsWith('|')).map(splitRow)
  const header = rows[0]
  if (!header) return []
  const find = (pattern: RegExp, fallback: number) => {
    const index = header.findIndex((cell) => pattern.test(cell.toLowerCase()))
    return index === -1 ? fallback : index
  }
  const columns = {
    claim: find(/aussage|claim|kernaussage/, 0),
    evidence: find(/evidenz|evidence/, 1),
    refs: find(/quelle|source|ref/, 2),
    limits: find(/einschränk|limit|grenze|caveat/, 3),
  }
  const claims: ReferenceClaim[] = []
  for (const row of rows.slice(1)) {
    if (row.every((cell) => /^:?-{2,}:?$/.test(cell) || cell === '')) continue
    const claim = row[columns.claim] ?? ''
    if (!claim) continue
    const evidence = row[columns.evidence] ?? ''
    const refs = [...(row[columns.refs] ?? '').matchAll(/\d{1,3}/g)]
      .map((match) => Number(match[0]))
      .filter((value, index, all) => value > 0 && all.indexOf(value) === index)
    claims.push({
      html: renderReferenceInline(claim),
      evidence,
      level: evidenceLevel(evidence),
      refs,
      limitsHtml: renderReferenceInline(row[columns.limits] ?? ''),
    })
  }
  return claims
}

function quoteText(lines: string[]): string {
  return lines
    .map((line) => line.replace(/^\s*>\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseSources(lines: string[]): { groups: ReferenceGroup[]; notes: string[] } {
  const groups: ReferenceGroup[] = []
  const notes: string[] = []
  let group: ReferenceGroup = { heading: '', items: [] }
  let item: { n: number; text: string } | null = null
  let quote: string[] = []
  let paragraph: string[] = []

  const closeItem = () => {
    if (item) group.items.push({ n: item.n, html: renderReferenceInline(item.text.trim()) })
    item = null
  }
  const closeQuote = () => {
    const text = quoteText(quote)
    if (text) notes.push(renderReferenceInline(text))
    quote = []
  }
  const closeParagraph = () => {
    const text = paragraph.join(' ').trim()
    if (text) notes.push(renderReferenceInline(text))
    paragraph = []
  }
  const closeGroup = () => {
    closeItem()
    if (group.items.length > 0) groups.push(group)
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const heading = /^#{3,6}\s+(.*)$/.exec(line)
    const numbered = /^\s*(\d{1,3})\.\s+(.*)$/.exec(line)
    if (heading) {
      closeQuote()
      closeParagraph()
      closeGroup()
      group = { heading: heading[1]?.trim() ?? '', items: [] }
    } else if (numbered) {
      closeQuote()
      closeParagraph()
      closeItem()
      item = { n: Number(numbered[1]), text: numbered[2] ?? '' }
    } else if (/^\s*>/.test(line)) {
      closeItem()
      closeParagraph()
      quote.push(line)
    } else if (line.trim() === '') {
      closeItem()
      closeQuote()
      closeParagraph()
    } else if (item) {
      item.text += ` ${line.trim()}`
    } else {
      paragraph.push(line.trim())
    }
  }
  closeQuote()
  closeParagraph()
  closeGroup()
  return { groups, notes }
}

function parseChanges(lines: string[]): { changes: ReferenceChange[]; notes: string[] } {
  const changes: ReferenceChange[] = []
  const notes: string[] = []
  let quote: string[] = []
  let current: { date: string | null; text: string } | null = null
  const close = () => {
    if (current?.text.trim()) {
      changes.push({ date: current.date, html: renderReferenceInline(current.text.trim()) })
    }
    current = null
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    const entry = /^\s*[-*]\s+(.*)$/.exec(line)
    if (/^\s*>/.test(line)) {
      close()
      quote.push(line)
      continue
    }
    if (quote.length > 0) {
      const text = quoteText(quote)
      if (text) notes.push(renderReferenceInline(text))
      quote = []
    }
    if (entry) {
      close()
      const dated = /^\**(\d{4}-\d{2}-\d{2})\**:?\**\s*(.*)$/.exec(entry[1] ?? '')
      current = dated
        ? { date: dated[1] ?? null, text: dated[2] ?? '' }
        : { date: null, text: entry[1] ?? '' }
    } else if (current && line.trim()) {
      current.text += ` ${line.trim()}`
    } else if (line.trim()) {
      close()
      current = { date: null, text: line.trim() }
      close()
    } else {
      close()
    }
  }
  close()
  const text = quoteText(quote)
  if (text) notes.push(renderReferenceInline(text))
  changes.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  return { changes, notes }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ')
}

export function parseReference(path: string, text: string): ReferenceDoc | null {
  const location = REFERENCE_PATH.exec(path)
  if (!location) return null
  const kind = KINDS[location[1] ?? ''] ?? 'video'
  const { data, body } = splitFrontmatter(text)
  const warnings: ReferenceWarning[] = []

  const lines = body.split('\n')
  const preamble: string[] = []
  const sections: Array<{ heading: string; lines: string[] }> = []
  let firstHeading = ''
  for (const line of lines) {
    const h2 = /^##\s+(.*)$/.exec(line)
    const h1 = /^#\s+(.*)$/.exec(line)
    if (h2) sections.push({ heading: h2[1]?.trim() ?? '', lines: [] })
    else if (h1 && sections.length === 0) firstHeading ||= h1[1]?.trim() ?? ''
    else if (sections.length === 0) preamble.push(line)
    else sections.at(-1)?.lines.push(line)
  }

  const bodyLinks: Partial<Record<ReferencePlatform, string>> = {}
  let researched: string | null = null
  const intro: string[] = []
  for (const line of preamble) {
    const labelled = /^\s*\*\*([^*]{1,40}?):?\*\*:?\s*(.*?)\s*$/.exec(line)
    if (labelled) {
      const label = (labelled[1] ?? '').toLowerCase().replace(/:$/, '')
      const value = labelled[2] ?? ''
      if (label === 'video' || label === 'youtube') bodyLinks.youtube = value
      else if (label === 'tiktok') bodyLinks.tiktok = value
      else if (label === 'instagram') bodyLinks.instagram = value
      else if (label.startsWith('stand')) researched = DATE.test(value) ? value : null
      else intro.push(line.trim())
      continue
    }
    if (line.trim()) intro.push(line.trim())
  }

  const title =
    unquote(data.title ?? '') || firstHeading.replace(/\s+[\u2013\u2014-]\s+Quellen.*$/, '')
  if (!title) warnings.push({ code: 'title_missing' })
  const publishedRaw = unquote(data.published ?? '')
  const published =
    DATE.test(publishedRaw) && !Number.isNaN(Date.parse(publishedRaw)) ? publishedRaw : null
  if (!published) warnings.push({ code: 'date_invalid', detail: publishedRaw })

  const links = pickLinks(data, bodyLinks)
  if (links.length === 0) warnings.push({ code: 'link_missing' })
  else if (!links.some((link) => link.exact)) warnings.push({ code: 'link_generic' })

  let claims: ReferenceClaim[] = []
  const sourceGroups: ReferenceGroup[] = []
  const sourceNotes: string[] = []
  const other: ReferenceSection[] = []
  let changes: ReferenceChange[] = []
  const notes: string[] = []

  for (const section of sections) {
    const type = sectionType(section.heading, section.lines)
    if (type === 'claims' && claims.length === 0) {
      claims = parseClaims(section.lines)
      const rest = section.lines
        .filter((line) => !line.trim().startsWith('|'))
        .join('\n')
        .trim()
      if (rest) other.push({ heading: '', html: renderReferenceBlock(rest) })
    } else if (type === 'sources') {
      const parsed = parseSources(section.lines)
      sourceGroups.push(...parsed.groups)
      sourceNotes.push(...parsed.notes)
    } else if (type === 'changes') {
      const parsed = parseChanges(section.lines)
      changes = [...changes, ...parsed.changes]
      notes.push(...parsed.notes)
    } else {
      const content = section.lines.join('\n').trim()
      if (content) other.push({ heading: section.heading, html: renderReferenceBlock(content) })
    }
  }

  if (claims.length === 0) warnings.push({ code: 'claims_missing' })
  const known = new Set(sourceGroups.flatMap((group) => group.items.map((item) => item.n)))
  if (known.size === 0) warnings.push({ code: 'sources_missing' })
  else {
    const unknown = [...new Set(claims.flatMap((claim) => claim.refs))].filter((n) => !known.has(n))
    if (unknown.length > 0) warnings.push({ code: 'ref_unknown', detail: unknown.join(', ') })
  }

  const topics = parseList(data.topics ?? '')
    .map((topic) => topic.trim())
    .filter((topic) => topic.length > 0 && topic.length <= 60)
    .slice(0, 20)

  return {
    slug: referenceSlug(location[3] ?? ''),
    path,
    kind,
    title: title.slice(0, 300) || (location[3] ?? ''),
    published,
    researched,
    topics,
    links,
    introHtml: intro.length > 0 ? renderReferenceInline(intro.join(' ')) : '',
    claims,
    sourceGroups,
    sourceNotes,
    sections: other,
    changes,
    notes,
    warnings,
    searchText: normalizeSearch(
      [
        title,
        topics.join(' '),
        ...claims.map((claim) => `${stripTags(claim.html)} ${claim.evidence}`),
      ].join(' '),
    ),
  }
}
