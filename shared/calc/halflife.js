import { ROUTES, SUBSTANCES, findSubstance } from './substances.js'

export const HALFLIFE_FIELDS = {
  dose: { min: 0.01, max: 100_000, step: 1, fallback: 0 },
  hours: { min: 0, max: 2000, step: 0.5, fallback: 6 },
  interval: { min: 0, max: 336, step: 1, fallback: 0 },
  amount: { min: 0.01, max: 5000, step: 0.1, fallback: 1 },
  potency: { min: 0.01, max: 100, step: 0.1, fallback: 10 },
  weight: { min: 30, max: 250, step: 1, fallback: 75 },
}

export const DOSE_UNITS = ['mg', 'mcg', 'g']
export const SEXES = ['male', 'female']
export const ALCOHOL_RATE = 0.15
export const ALCOHOL_RISE = 0.5

const ETHANOL_DENSITY = 0.789
const WIDMARK = { male: 0.68, female: 0.55 }

export const HALFLIFE_DIGITS = {
  remaining: 2,
  activeDose: 2,
  share: 1,
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
  amount: 2,
  potency: 1,
  content: 1,
  bio: 0,
  absorbed: 2,
  weight: 0,
  bac: 2,
  rate: 2,
  soberIn: 1,
  onset: 2,
  peak: 2,
  effectEnd: 1,
  effectNow: 0,
  effectSpan: 0,
  eAxis1: 0,
  eAxis2: 0,
  eAxis3: 0,
  eAxis4: 0,
}

const WIDTH = 300
const HEIGHT = 100
const STEPS = 60

function clamp(value, field) {
  const raw = String(value ?? '')
    .trim()
    .replace(',', '.')
  if (raw === '') return field.fallback
  const number = Number(raw)
  if (!Number.isFinite(number)) return field.fallback
  return Math.min(field.max, Math.max(field.min, number))
}

export function findPreparation(substance, key) {
  return substance.preparations.find((item) => item.key === key) ?? substance.preparations[0]
}

function routeInfo(substance, route) {
  return substance.routeData?.[route] ?? {}
}

export function effectRates(onset, peak, end) {
  const rise = Math.max(0.02, peak - onset)
  const tail = Math.max(rise * 1.2, end - peak)
  const ke = Math.LN10 / tail
  const target = rise * ke
  if (!(target < 1)) return { ka: ke * 1.5, ke }
  let low = 1.0001
  let high = 1e7
  for (let step = 0; step < 80; step++) {
    const mid = Math.sqrt(low * high)
    if (Math.log(mid) / (mid - 1) > target) low = mid
    else high = mid
  }
  return { ka: Math.sqrt(low * high) * ke, ke }
}

function shapeAt(rates, hours) {
  if (hours <= 0) return 0
  return Math.exp(-rates.ke * hours) - Math.exp(-rates.ka * hours)
}

export function effectShare(effect, hours) {
  if (!effect || effect.peakValue <= 0) return 0
  return Math.max(0, shapeAt(effect, hours - effect.onset) / effect.peakValue)
}

function effectModel(substance, preparation, route) {
  const source = routeInfo(substance, route).effect ?? preparation?.effect ?? substance.effect
  if (!source || !(source.end > source.onset)) return null
  const rates = effectRates(source.onset, source.peak, source.end)
  const peakValue = shapeAt(rates, Math.max(0.02, source.peak - source.onset))
  return { ...source, ...rates, peakValue, span: source.end * 1.25 }
}

export function normalizeHalflife(input) {
  const substance = findSubstance(String(input.substance ?? ''))
  const preparation = findPreparation(substance, String(input.preparation ?? ''))
  const wanted = String(input.route ?? '')
  const route = substance.routes.includes(wanted) ? wanted : (substance.routes[0] ?? 'oral')
  const unit = DOSE_UNITS.includes(input.unit) ? input.unit : (substance.unit ?? 'mg')
  const typed = Number(
    String(input.dose ?? '')
      .trim()
      .replace(',', '.'),
  )
  const given = Number.isFinite(typed) && typed > 0
  const material = substance.material
  const sex = SEXES.includes(String(input.sex ?? '')) ? String(input.sex) : 'male'
  return {
    substance: substance.key,
    dose: given ? clamp(typed, HALFLIFE_FIELDS.dose) : substance.dose || 100,
    unit,
    hours: clamp(input.hours, HALFLIFE_FIELDS.hours),
    interval: clamp(input.interval, HALFLIFE_FIELDS.interval),
    preparation: preparation?.key ?? '',
    route,
    amount: material
      ? clamp(input.amount === undefined || input.amount === '' ? material.amount : input.amount, {
          ...HALFLIFE_FIELDS.amount,
          fallback: material.amount,
        })
      : 0,
    potency: material
      ? clamp(
          input.potency === undefined || input.potency === '' ? material.potency : input.potency,
          { ...HALFLIFE_FIELDS.potency, fallback: material.potency },
        )
      : 0,
    weight: clamp(input.weight, HALFLIFE_FIELDS.weight),
    sex,
  }
}

export function computeHalflife(raw) {
  const input = normalizeHalflife(raw)
  const substance = findSubstance(input.substance)
  const preparation = findPreparation(substance, input.preparation)
  const material = substance.material
  const zero = substance.kinetics === 'zero'
  const share = preparation?.share ?? 0
  const bio = routeInfo(substance, input.route).bio ?? 0
  const content = material
    ? material.kind === 'drink'
      ? input.amount * (input.potency / 100) * ETHANOL_DENSITY
      : input.amount * 1000 * (input.potency / 100)
    : 0
  const absorbed = bio > 0 ? content * (bio / 100) : content
  const dose = material ? content : input.dose
  const activeDose = material ? absorbed : share > 0 ? (input.dose * share) / 100 : input.dose
  const half = preparation?.half ?? substance.half
  const model = substance.model && half > 0
  const bac = zero ? activeDose / (input.weight * (WIDMARK[input.sex] ?? WIDMARK.male)) : 0
  const rate = substance.half || ALCOHOL_RATE
  const peakLevel = zero ? bac : activeDose
  const levelAt = (hours) => {
    if (!model) return 0
    if (!zero) return activeDose * 0.5 ** (hours / half)
    if (hours <= 0) return 0
    if (hours < ALCOHOL_RISE) return bac * (hours / ALCOHOL_RISE)
    return Math.max(0, bac - rate * (hours - ALCOHOL_RISE))
  }
  const timeTo = (part) => {
    if (!model) return 0
    if (!zero) return half * (Math.log(1 / part) / Math.LN2)
    return ALCOHOL_RISE + (bac * (1 - part)) / rate
  }
  const remaining = levelAt(input.hours)
  const factor = peakLevel > 0 ? remaining / peakLevel : 0
  const repeated = model && !zero && input.interval > 0
  const accumulation = repeated ? 1 / (1 - 0.5 ** (input.interval / half)) : 1
  const soberIn = zero ? timeTo(0) : 0
  const effect = effectModel(substance, preparation, input.route)
  const span = model
    ? zero
      ? Math.max(input.hours * 1.3, soberIn * 1.2, 1)
      : Math.max(input.hours * 1.3, half * 6, half)
    : 1
  const points = []
  if (model) {
    for (let step = 0; step <= STEPS; step++) {
      const x = (step / STEPS) * WIDTH
      const value = peakLevel > 0 ? levelAt((step / STEPS) * span) / peakLevel : 0
      points.push(`${x.toFixed(1)},${(HEIGHT - value * HEIGHT).toFixed(1)}`)
    }
  }
  const effectPoints = []
  if (effect) {
    for (let step = 0; step <= STEPS; step++) {
      const x = (step / STEPS) * WIDTH
      const value = effectShare(effect, (step / STEPS) * effect.span)
      effectPoints.push(`${x.toFixed(1)},${(HEIGHT - value * HEIGHT).toFixed(1)}`)
    }
  }
  const effectNow = effect ? effectShare(effect, input.hours) * 100 : 0
  return {
    input,
    substance,
    unit: substance.displayUnit ?? input.unit,
    values: {
      remaining,
      percent: factor * 100,
      half,
      low: preparation?.low ?? substance.low,
      high: preparation?.high ?? substance.high,
      t50: timeTo(0.5),
      t25: timeTo(0.25),
      t10: timeTo(0.1),
      t97: model ? (zero ? soberIn : half * 5) : 0,
      hours: input.hours,
      interval: input.interval,
      activeDose,
      share,
      accumulation,
      steadyPeak: activeDose * accumulation,
      steadyTrough: activeDose * accumulation * 0.5 ** (input.interval / (half || 1)),
      span,
      axis1: span * 0.25,
      axis2: span * 0.5,
      axis3: span * 0.75,
      axis4: span,
      amount: input.amount,
      potency: input.potency,
      content,
      bio,
      absorbed,
      weight: input.weight,
      bac,
      rate,
      soberIn,
      dose,
      onset: effect?.onset ?? 0,
      peak: effect?.peak ?? 0,
      effectEnd: effect?.end ?? 0,
      effectNow,
      effectSpan: effect?.span ?? 1,
      eAxis1: (effect?.span ?? 1) * 0.25,
      eAxis2: (effect?.span ?? 1) * 0.5,
      eAxis3: (effect?.span ?? 1) * 0.75,
      eAxis4: effect?.span ?? 1,
    },
    flags: {
      model,
      noModel: !model,
      zero,
      firstOrder: model && !zero,
      repeated,
      gone: model && factor * 100 < 1,
      hasNote: Boolean(substance.note.de || substance.note.en),
      hasPreparations: substance.preparations.length > 0,
      hasShare: share > 0,
      hasRoutes: substance.routes.length > 1,
      hasPreparationNote: Boolean(preparation?.note),
      hasMaterial: Boolean(material),
      hasBio: bio > 0,
      hasBody: Boolean(substance.body),
      hasEffect: Boolean(effect),
      effectPeaked: Boolean(effect) && input.hours > (effect?.peak ?? 0),
      nothing: !model && !effect,
    },
    curve: points.join(' '),
    marker: {
      x: model ? Math.min(WIDTH, (input.hours / span) * WIDTH) : 0,
      y: HEIGHT - factor * HEIGHT,
    },
    effect,
    effectCurve: effectPoints.join(' '),
    effectMarker: {
      x: effect ? Math.min(WIDTH, (input.hours / effect.span) * WIDTH) : 0,
      y: HEIGHT - (effectNow / 100) * HEIGHT,
    },
    material: material ? { kind: material.kind, active: material.active } : null,
  }
}

export function routeOptions(substance, lang) {
  return ROUTES.filter((key) => substance.routes.includes(key)).map((key) => ({ key, lang }))
}

export function substanceOptions(lang) {
  return SUBSTANCES.map((item) => ({
    key: item.key,
    category: item.category,
    label: lang === 'de' ? item.de : item.en,
  }))
}
