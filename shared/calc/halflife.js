import { SUBSTANCES, findSubstance } from './substances.js'

export const HALFLIFE_FIELDS = {
  dose: { min: 0.01, max: 100_000, step: 1, fallback: 0 },
  hours: { min: 0, max: 2000, step: 0.5, fallback: 6 },
  interval: { min: 0, max: 336, step: 1, fallback: 0 },
}

export const DOSE_UNITS = ['mg', 'mcg', 'g']

export const HALFLIFE_DIGITS = {
  remaining: 2,
  percent: 1,
  half: 1,
  low: 1,
  high: 1,
  t50: 1,
  t25: 1,
  t10: 1,
  t97: 1,
  hours: 1,
  interval: 1,
  accumulation: 2,
  steadyPeak: 2,
  steadyTrough: 2,
  span: 0,
  axis1: 0,
  axis2: 0,
  axis3: 0,
  axis4: 0,
}

const WIDTH = 300
const HEIGHT = 100

function clamp(value, field) {
  const raw = String(value ?? '')
    .trim()
    .replace(',', '.')
  if (raw === '') return field.fallback
  const number = Number(raw)
  if (!Number.isFinite(number)) return field.fallback
  return Math.min(field.max, Math.max(field.min, number))
}

export function normalizeHalflife(input) {
  const substance = findSubstance(String(input.substance ?? ''))
  const unit = DOSE_UNITS.includes(input.unit) ? input.unit : 'mg'
  const typed = Number(
    String(input.dose ?? '')
      .trim()
      .replace(',', '.'),
  )
  const given = Number.isFinite(typed) && typed > 0
  return {
    substance: substance.key,
    dose: given ? clamp(typed, HALFLIFE_FIELDS.dose) : substance.dose || 100,
    unit,
    hours: clamp(input.hours, HALFLIFE_FIELDS.hours),
    interval: clamp(input.interval, HALFLIFE_FIELDS.interval),
  }
}

export function computeHalflife(raw) {
  const input = normalizeHalflife(raw)
  const substance = findSubstance(input.substance)
  const half = substance.half
  const model = substance.model && half > 0
  const factor = model ? 0.5 ** (input.hours / half) : 0
  const remaining = input.dose * factor
  const timeTo = (share) => (model ? half * (Math.log(1 / share) / Math.LN2) : 0)
  const repeated = model && input.interval > 0
  const accumulation = repeated ? 1 / (1 - 0.5 ** (input.interval / half)) : 1
  const span = model ? Math.max(input.hours * 1.3, half * 6, half) : 1
  const points = []
  if (model) {
    for (let step = 0; step <= 60; step++) {
      const x = (step / 60) * WIDTH
      const value = 0.5 ** (((step / 60) * span) / half)
      points.push(`${x.toFixed(1)},${(HEIGHT - value * HEIGHT).toFixed(1)}`)
    }
  }
  return {
    input,
    substance,
    values: {
      remaining,
      percent: factor * 100,
      half,
      low: substance.low,
      high: substance.high,
      t50: timeTo(0.5),
      t25: timeTo(0.25),
      t10: timeTo(0.1),
      t97: model ? half * 5 : 0,
      hours: input.hours,
      interval: input.interval,
      accumulation,
      steadyPeak: input.dose * accumulation,
      steadyTrough: input.dose * accumulation * 0.5 ** (input.interval / (half || 1)),
      span,
      axis1: span * 0.25,
      axis2: span * 0.5,
      axis3: span * 0.75,
      axis4: span,
    },
    flags: {
      model,
      noModel: !model,
      repeated,
      gone: model && factor * 100 < 1,
      hasNote: Boolean(substance.note.de || substance.note.en),
    },
    curve: points.join(' '),
    marker: {
      x: model ? Math.min(WIDTH, (input.hours / span) * WIDTH) : 0,
      y: HEIGHT - factor * HEIGHT,
    },
  }
}

export function substanceOptions(lang) {
  return SUBSTANCES.map((item) => ({
    key: item.key,
    category: item.category,
    label: lang === 'de' ? item.de : item.en,
  }))
}
