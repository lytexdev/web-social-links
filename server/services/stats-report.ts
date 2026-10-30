import { z } from 'zod'
import type { BlockNode } from '../../shared/schemas/content'
import { useEnv } from '../utils/env'
import { calendarDay, flushEvents } from './analytics'
import { listBlocks } from './blocks'
import { latestSnapshot } from './publish'
import { getSetting } from './settings'
import { listSources } from './sources'
import {
  DIMENSIONS,
  byDimension,
  byLink,
  bySource,
  dailySeries,
  hourlySeries,
  hourlyTotals,
  rollupRecent,
  totals,
  type StatsQuery,
  type Totals,
} from './stats'

const DAY_MS = 86_400_000
const dayField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const statsQuerySchema = z.object({
  range: z.enum(['24h', '7d', '30d', '90d', 'custom']).default('7d'),
  from: dayField.optional(),
  to: dayField.optional(),
  source: z
    .string()
    .regex(/^[a-z0-9-]{1,32}$/)
    .optional(),
})

export type StatsInput = z.infer<typeof statsQuerySchema>

function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function spanDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY_MS) + 1
}

export function resolvePeriods(
  input: StatsInput,
  now = Date.now(),
): { current: StatsQuery; previous: StatsQuery } {
  const today = calendarDay(now, useEnv().timeZone)
  const source = input.source ?? null
  let from: string
  let to = today
  if (input.range === 'custom' && input.from && input.to) {
    from = input.from <= input.to ? input.from : input.to
    to = input.from <= input.to ? input.to : input.from
    if (spanDays(from, to) > 366) from = shiftDay(to, -365)
  } else {
    const days =
      input.range === '30d' ? 30 : input.range === '90d' ? 90 : input.range === '24h' ? 1 : 7
    from = shiftDay(today, -(days - 1))
  }
  const length = spanDays(from, to)
  return {
    current: { from, to, source },
    previous: { from: shiftDay(from, -length), to: shiftDay(from, -1), source },
  }
}

function linkLabels(): Map<string, string> {
  const labels = new Map<string, string>()
  const add = (node: BlockNode) => {
    const value = node.data.title ?? node.data.label ?? node.data.code ?? node.data.caption
    if (typeof value === 'string' && value) labels.set(node.id, value)
  }
  for (const node of latestSnapshot()?.blocks ?? []) [node, ...node.children].forEach(add)
  for (const node of listBlocks()) [node, ...node.children].forEach(add)
  for (const social of [
    ...(latestSnapshot()?.settings.profile.social ?? []),
    ...getSetting('profile').social,
  ]) {
    labels.set(social.id, social.label || social.url)
  }
  return labels
}

export function buildReport(input: StatsInput, now = Date.now()) {
  flushEvents()
  rollupRecent(now)
  const { current, previous } = resolvePeriods(input, now)
  const hourly = input.range === '24h'
  const summary: Totals = hourly
    ? hourlyTotals(now - DAY_MS, now + 1, current.source)
    : totals(current)
  const before: Totals = hourly
    ? hourlyTotals(now - 2 * DAY_MS, now - DAY_MS, current.source)
    : totals(previous)
  const labels = linkLabels()
  const sourceLabels = new Map(listSources().map((source) => [source.key, source.label]))
  const views = summary.views
  return {
    period: current,
    previousPeriod: previous,
    visitorsMode: getSetting('analytics').mode === 'visitors',
    summary,
    previous: before,
    series: hourly ? hourlySeries(now - DAY_MS + 1, current.source) : dailySeries(current),
    sources: bySource(current).map((row) => ({
      ...row,
      label: sourceLabels.get(row.key) ?? row.key,
    })),
    links: byLink(current).map((row) => ({
      ...row,
      label: labels.get(row.key) ?? row.key,
      ctr: views > 0 ? row.clicks / views : 0,
    })),
    dimensions: Object.fromEntries(
      DIMENSIONS.map((dimension) => [dimension, byDimension(current, dimension)]),
    ),
  }
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n;]/.test(text) || /^[=+\-@]/.test(text)
    ? `"${text.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`
    : text
}

export function buildCsv(input: StatsInput, now = Date.now()): string {
  const report = buildReport(input, now)
  const rows: Array<Array<string | number>> = [
    ['section', 'key', 'label', 'views', 'clicks', 'previews', 'uniques'],
  ]
  rows.push([
    'total',
    '',
    '',
    report.summary.views,
    report.summary.clicks,
    report.summary.previews,
    report.summary.uniques,
  ])
  for (const point of report.series)
    rows.push(['series', point.bucket, '', point.views, point.clicks, '', ''])
  for (const source of report.sources)
    rows.push(['source', source.key, source.label, source.views, source.clicks, '', ''])
  for (const link of report.links)
    rows.push(['link', link.key, link.label, '', link.clicks, '', ''])
  for (const [dimension, entries] of Object.entries(report.dimensions)) {
    for (const entry of entries)
      rows.push([dimension, entry.key, '', entry.views, entry.clicks, '', ''])
  }
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`
}
