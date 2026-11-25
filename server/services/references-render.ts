import type { H3Event } from 'h3'
import { getQuery, sendRedirect } from 'h3'
import { REFERENCE_TEXT } from '../../shared/constants/reference-text'
import { referencesSchema } from '../../shared/schemas/settings'
import type {
  ReferenceDocModel,
  ReferenceIndexModel,
  ReferenceListItem,
} from '../../shared/types/public'
import type { ReferenceDoc, ReferenceKind } from '../../shared/types/references'
import type { Snapshot } from './publish'
import { findReference, referenceDocsList } from './references'
import { normalizeSearch } from './references-parse'
import { chrome } from './render'

const DOC_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/
const TOPIC_LIMIT = 14

export function referenceSettings(snapshot: Snapshot) {
  return referencesSchema.parse(snapshot.settings.references ?? {})
}

function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))
}

function locale(lang: 'de' | 'en'): string {
  return lang === 'de' ? 'de-DE' : 'en-GB'
}

function formatDate(value: string | null, lang: 'de' | 'en', month = false): string {
  if (!value) return ''
  const date = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(
    locale(lang),
    month
      ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
      : { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' },
  ).format(date)
}

function count(lang: 'de' | 'en', n: number, one: string, many: string): string {
  return n === 1 ? one : `${new Intl.NumberFormat(locale(lang)).format(n)} ${many}`
}

function docCounts(doc: ReferenceDoc, lang: 'de' | 'en'): string {
  const sources = doc.sourceGroups.reduce((sum, group) => sum + group.items.length, 0)
  const words =
    lang === 'de'
      ? { claim: ['1 Aussage', 'Aussagen'], source: ['1 Quelle', 'Quellen'] }
      : { claim: ['1 claim', 'claims'], source: ['1 source', 'sources'] }
  return [
    count(lang, doc.claims.length, words.claim[0] ?? '', words.claim[1] ?? ''),
    count(lang, sources, words.source[0] ?? '', words.source[1] ?? ''),
  ].join(' · ')
}

function href(base: string, query: { q?: string; topic?: string; type?: string }): string {
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.type) params.set('type', query.type)
  if (query.topic) params.set('topic', query.topic)
  const search = params.toString()
  return search ? `${base}?${search}` : base
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function buildReferenceIndex(
  snapshot: Snapshot,
  options: { origin: string; path: string; query: Record<string, unknown> },
): ReferenceIndexModel {
  const settings = referenceSettings(snapshot)
  const base = chrome(snapshot, options.origin, options.path)
  const lang = base.lang
  const labels = REFERENCE_TEXT[lang]
  const basePath = `/${settings.path}`
  const docs = referenceDocsList()
  const q = text(options.query.q, 100)
  const typeValue = text(options.query.type, 10)
  const type: '' | ReferenceKind = typeValue === 'video' || typeValue === 'short' ? typeValue : ''
  const topicValue = text(options.query.topic, 60)
  const topicNames = new Map<string, number>()
  for (const doc of docs) {
    if (type && doc.kind !== type) continue
    for (const topic of doc.topics) topicNames.set(topic, (topicNames.get(topic) ?? 0) + 1)
  }
  const topic = topicNames.has(topicValue) ? topicValue : ''
  const terms = normalizeSearch(q).split(' ').filter(Boolean)

  const filtered = docs.filter(
    (doc) =>
      (!type || doc.kind === type) &&
      (!topic || doc.topics.includes(topic)) &&
      terms.every((term) => doc.searchText.includes(term)),
  )

  const groups: ReferenceIndexModel['groups'] = []
  for (const doc of filtered) {
    const label = formatDate(doc.published, lang, true) || labels.kinds[doc.kind]
    let group = groups.at(-1)
    if (group?.label !== label) {
      group = { label, items: [] }
      groups.push(group)
    }
    const item: ReferenceListItem = {
      href: `${basePath}/${doc.slug}`,
      title: doc.title,
      kind: labels.kinds[doc.kind],
      meta: docCounts(doc, lang),
      date: formatDate(doc.published, lang),
      datetime: doc.published ?? '',
      topics: doc.topics.slice(0, 4),
      search: doc.searchText.slice(0, 3000),
    }
    group.items.push(item)
  }

  const kinds = (['', 'video', 'short'] as const).map((value) => ({
    label: labels.types[value || 'all'],
    count: value ? docs.filter((doc) => doc.kind === value).length : docs.length,
    href: href(basePath, { q, type: value, topic }),
    active: type === value,
  }))
  const sortedTopics = [...topicNames.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], lang))
    .map(([name, total]) => ({
      name,
      count: total,
      href: href(basePath, { q, type, topic: name === topic ? '' : name }),
      active: name === topic,
    }))
  const shown = sortedTopics.slice(0, TOPIC_LIMIT)
  const activeHidden = sortedTopics.slice(TOPIC_LIMIT).find((item) => item.active)
  if (activeHidden) shown.push(activeHidden)

  return {
    ...base,
    kind: 'references',
    title: base.title ? `${settings.title} · ${base.title}` : settings.title,
    description: settings.intro || base.description,
    heading: settings.title,
    intro: settings.intro,
    basePath,
    labels,
    query: { q, topic, type },
    types: kinds,
    topics: shown,
    moreTopics: sortedTopics.slice(TOPIC_LIMIT).filter((item) => !item.active),
    resetHref: q || type || topic ? basePath : null,
    results:
      filtered.length === 1
        ? labels.resultOne
        : format(labels.results, {
            count: new Intl.NumberFormat(locale(lang)).format(filtered.length),
          }),
    groups,
  }
}

export function buildReferenceDoc(
  snapshot: Snapshot,
  doc: ReferenceDoc,
  options: { origin: string; path: string },
): ReferenceDocModel {
  const settings = referenceSettings(snapshot)
  const base = chrome(snapshot, options.origin, options.path)
  const lang = base.lang
  const labels = REFERENCE_TEXT[lang]
  const basePath = `/${settings.path}`
  return {
    ...base,
    kind: 'reference',
    title: `${doc.title} · ${settings.title}`,
    description: doc.topics.join(', ') || base.description,
    basePath,
    labels,
    doc: {
      title: doc.title,
      kind: labels.kinds[doc.kind],
      date: formatDate(doc.published, lang),
      datetime: doc.published ?? '',
      researched: formatDate(doc.researched, lang),
      topics: doc.topics.map((name) => ({ name, href: href(basePath, { topic: name }) })),
      links: doc.links.map((link) => ({
        label: link.exact ? labels.watch[link.platform] : labels.profile[link.platform],
        href: link.url,
      })),
      introHtml: doc.introHtml,
      claims: doc.claims,
      sourceGroups: doc.sourceGroups,
      sourceNotes: doc.sourceNotes,
      sections: doc.sections,
      changes: doc.changes.map((change) => ({
        ...change,
        label: formatDate(change.date, lang),
      })),
      notes: doc.notes,
      counts: docCounts(doc, lang),
    },
  }
}

export function resolveReferences(
  event: H3Event,
  path: string,
  snapshot: Snapshot,
  origin: string,
): 'handled' | 'missing' | 'other' | Promise<void> {
  const settings = referenceSettings(snapshot)
  if (!settings.enabled) return 'other'
  const segments = path.split('/').filter(Boolean)
  const first = segments[0]?.toLowerCase() ?? ''
  if (settings.aliases.includes(first)) {
    const rest = segments.slice(1).join('/')
    const query = event.path.includes('?') ? event.path.slice(event.path.indexOf('?')) : ''
    return sendRedirect(event, `/${settings.path}${rest ? `/${rest}` : ''}${query}`, 301)
  }
  if (first !== settings.path || segments[0] !== first) return 'other'
  if (segments.length === 1) {
    event.context.publicModel = buildReferenceIndex(snapshot, {
      origin,
      path,
      query: getQuery(event),
    })
    return 'handled'
  }
  const slug = segments[1] ?? ''
  if (segments.length !== 2 || !DOC_SLUG.test(slug)) return 'missing'
  const doc = findReference(slug)
  if (!doc) return 'missing'
  event.context.publicModel = buildReferenceDoc(snapshot, doc, { origin, path })
  return 'handled'
}
