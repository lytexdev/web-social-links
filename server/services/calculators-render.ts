import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { CALCULATOR_TEXT } from '../../shared/constants/calculator-text'
import {
  CALCULATOR_KEYS,
  calculatorsSchema,
  type CalculatorKey,
} from '../../shared/schemas/settings'
import type { CalculatorIndexModel, CalculatorPageModel } from '../../shared/types/public'
import { CALORIES_DIGITS, computeCalories } from '../../shared/calc/calories.js'
import { HALFLIFE_DIGITS, computeHalflife, substanceOptions } from '../../shared/calc/halflife.js'
import { SUBSTANCE_CATEGORIES } from '../../shared/calc/substances.js'
import { formatDurations, formatNumber, formatValues } from '../../shared/calc/format.js'
import { PEPTIDE_DIGITS, SYRINGE_SIZES, computePeptide } from '../../shared/calc/peptide.js'
import type { Snapshot } from './publish'
import { renderDocumentMarkdown } from './markdown'
import { chrome } from './render'

type Alternative = {
  solvent: number
  units: number
  concentrationMgMl: number
  fits: boolean
  current: boolean
}

type Preparation = {
  key: string
  de: string
  en: string
  share?: number
  note?: Record<string, string>
}

type Substance = {
  metabolites: Record<string, string>
  blood: Record<string, string>
  urine: Record<string, string>
  note?: Record<string, string>
  routes?: string[]
  preparations?: Preparation[]
}

type Computed = {
  input: Record<string, string | number>
  values: Record<string, number>
  flags: Record<string, boolean>
  fill?: number
  alternatives?: Alternative[]
  substance?: Substance
  curve?: string
  marker?: { x: number; y: number }
  effectCurve?: string
  effectMarker?: { x: number; y: number }
  material?: { kind: string; active: string } | null
  unit?: string
  doseShare?: number
  dots?: string[]
}

const DURATION_KEYS = [
  't50',
  't25',
  't10',
  't97',
  'axis1',
  'axis2',
  'axis3',
  'axis4',
  'onset',
  'peak',
  'effectEnd',
  'soberIn',
  'eAxis1',
  'eAxis2',
  'eAxis3',
  'eAxis4',
]

export function calculatorSettings(snapshot: Snapshot) {
  return calculatorsSchema.parse(snapshot.settings.calculators ?? {})
}

export function enabledCalculators(snapshot: Snapshot): CalculatorKey[] {
  const settings = calculatorSettings(snapshot)
  return CALCULATOR_KEYS.filter((key) => settings[key].enabled)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, 40) : ''
}

function compute(key: CalculatorKey, query: Record<string, unknown>): Computed {
  const read = (name: string) => text(query[name])
  if (key === 'calories') {
    return computeCalories({
      sex: read('sex'),
      age: read('age'),
      height: read('height'),
      weight: read('weight'),
      fat: read('fat'),
      activity: read('activity'),
      sessions: read('sessions'),
      minutes: read('minutes'),
      intensity: read('intensity'),
    }) as Computed
  }
  if (key === 'halflife') {
    return computeHalflife({
      substance: read('substance'),
      preparation: read('preparation'),
      route: read('route'),
      dose: read('dose'),
      unit: read('unit'),
      hours: read('hours'),
      interval: read('interval'),
      amount: read('amount'),
      potency: read('potency'),
      weight: read('weight'),
      sex: read('sex'),
    }) as Computed
  }
  return computePeptide({
    vial: read('vial'),
    solvent: read('solvent'),
    dose: read('dose'),
    unit: read('unit'),
    scale: read('scale'),
    size: read('size'),
  }) as Computed
}

function preparationNote(result: Computed, lang: 'de' | 'en'): string {
  const chosen = String(result.input.preparation ?? '')
  const found = (result.substance?.preparations ?? []).find((item) => item.key === chosen)
  return found?.note?.[lang] ?? ''
}

function decimal(value: number, lang: 'de' | 'en'): string {
  return String(value).replace('.', lang === 'de' ? ',' : '.')
}

function digitsFor(key: CalculatorKey): Record<string, number> {
  if (key === 'calories') return CALORIES_DIGITS
  if (key === 'halflife') return HALFLIFE_DIGITS
  return PEPTIDE_DIGITS
}

export function buildCalculator(
  snapshot: Snapshot,
  key: CalculatorKey,
  options: { origin: string; path: string; query: Record<string, unknown> },
): CalculatorPageModel {
  const settings = calculatorSettings(snapshot)
  const base = chrome(snapshot, options.origin, options.path)
  const labels = CALCULATOR_TEXT[base.lang]
  const entry = settings[key]
  const heading = entry.title || labels.index.title
  const result = compute(key, options.query)
  const locale = base.lang === 'de' ? 'de-DE' : 'en-GB'
  const form = Object.fromEntries(
    Object.entries(result.input).map(([name, value]) => [name, String(value)]),
  )
  const others = enabledCalculators(snapshot).filter((item) => item !== key)
  return {
    ...base,
    kind: 'calculator',
    calculator: key,
    title: base.title ? `${heading} · ${base.title}` : heading,
    description: entry.intro || base.description,
    heading,
    intro: entry.intro,
    basePath: `/${settings.path}`,
    indexHref: others.length > 0 ? `/${settings.path}` : null,
    labels,
    form,
    values: formatValues(locale, result.values, digitsFor(key)) as Record<string, string>,
    flags: result.flags,
    fill: result.fill ?? 0,
    doseShare: result.doseShare ?? 0,
    sprayDots: result.dots ?? [],
    alternatives: (result.alternatives ?? []).map((item, index) => ({
      index,
      solvent: decimal(item.solvent, base.lang),
      units: formatNumber(locale, item.units, 1),
      conc: formatNumber(locale, item.concentrationMgMl, 2),
      fits: item.fits,
      current: item.current,
    })),
    durations:
      key === 'halflife'
        ? (formatDurations(
            locale,
            result.values,
            DURATION_KEYS,
            labels.halflife.duration,
          ) as Record<string, string>)
        : {},
    substances:
      key === 'halflife'
        ? SUBSTANCE_CATEGORIES.map((category: string) => ({
            category,
            items: (
              substanceOptions(base.lang) as Array<{ key: string; category: string; label: string }>
            )
              .filter((item) => item.category === category)
              .map(({ key: value, label }) => ({ key: value, label })),
          }))
        : [],
    preparations: (result.substance?.preparations ?? []).map((item) => ({
      key: item.key,
      label: base.lang === 'de' ? item.de : item.en,
    })),
    routeKeys: result.substance?.routes ?? [],
    reference: {
      metabolites: result.substance?.metabolites[base.lang] ?? '',
      blood: result.substance?.blood[base.lang] ?? '',
      urine: result.substance?.urine[base.lang] ?? '',
      note: result.substance?.note?.[base.lang] ?? '',
      preparationNote: preparationNote(result, base.lang),
    },
    curve: result.curve ?? '',
    marker: result.marker ?? { x: 0, y: 0 },
    effectCurve: result.effectCurve ?? '',
    effectMarker: result.effectMarker ?? { x: 0, y: 0 },
    material: result.material
      ? {
          amount: labels.halflife.material.amount[result.material.kind] ?? '',
          potency: labels.halflife.material.potency[result.material.active] ?? '',
        }
      : null,
    doseUnit: result.unit ?? String(result.input.unit ?? ''),
    sizes: SYRINGE_SIZES.map((value: number) => ({
      value,
      label: decimal(value, base.lang),
    })),
    contentHtml: entry.content ? renderDocumentMarkdown(entry.content) : '',
    disclaimer: labels[key].disclaimer,
  }
}

export function buildCalculatorIndex(
  snapshot: Snapshot,
  options: { origin: string; path: string },
): CalculatorIndexModel {
  const settings = calculatorSettings(snapshot)
  const base = chrome(snapshot, options.origin, options.path)
  const labels = CALCULATOR_TEXT[base.lang]
  const heading = settings.indexTitle || labels.index.title
  return {
    ...base,
    kind: 'calculators',
    title: base.title ? `${heading} · ${base.title}` : heading,
    description: settings.indexIntro || base.description,
    heading,
    intro: settings.indexIntro,
    basePath: `/${settings.path}`,
    labels,
    items: enabledCalculators(snapshot).map((key) => ({
      href: `/${settings.path}/${SEGMENT_FOR[key]}`,
      title: settings[key].title || labels.index.title,
      intro: settings[key].intro,
    })),
  }
}

const SEGMENT_FOR: Record<CalculatorKey, string> = {
  calories: 'kalorien',
  peptide: 'peptide',
  halflife: 'wirkstoff-abbau',
}

const SEGMENTS: Record<string, CalculatorKey> = {
  kalorien: 'calories',
  calories: 'calories',
  peptide: 'peptide',
  peptides: 'peptide',
  'wirkstoff-abbau': 'halflife',
  halflife: 'halflife',
}

export function resolveCalculators(
  event: H3Event,
  path: string,
  snapshot: Snapshot,
  origin: string,
): 'handled' | 'missing' | 'other' {
  const settings = calculatorSettings(snapshot)
  const available = enabledCalculators(snapshot)
  if (available.length === 0) return 'other'
  const segments = path.split('/').filter(Boolean)
  if (segments[0] !== settings.path) return 'other'
  if (segments.length === 1) {
    event.context.publicModel = buildCalculatorIndex(snapshot, { origin, path })
    return 'handled'
  }
  const key = segments.length === 2 ? SEGMENTS[segments[1] ?? ''] : undefined
  if (!key || !available.includes(key)) return 'missing'
  event.context.publicModel = buildCalculator(snapshot, key, {
    origin,
    path,
    query: getQuery(event),
  })
  return 'handled'
}
