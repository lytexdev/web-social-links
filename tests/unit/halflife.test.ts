import { describe, expect, it } from 'vitest'
import { formatDuration } from '../../shared/calc/format.js'
import {
  ALCOHOL_RATE,
  computeHalflife,
  effectShare,
  normalizeHalflife,
  substanceOptions,
} from '../../shared/calc/halflife.js'
import {
  ROUTES,
  SUBSTANCE_CATEGORIES,
  SUBSTANCES,
  findSubstance,
} from '../../shared/calc/substances.js'

const WORDS = { minutes: 'Minuten', hours: 'Stunden', days: 'Tage' }

describe('half-life calculator', () => {
  it('halves the amount with every half-life', () => {
    const { values } = computeHalflife({ substance: 'caffeine', dose: '200', hours: '5' })
    expect(values.half).toBe(5)
    expect(values.remaining).toBeCloseTo(100, 6)
    expect(values.percent).toBeCloseTo(50, 6)
    const later = computeHalflife({ substance: 'caffeine', dose: '200', hours: '15' })
    expect(later.values.remaining).toBeCloseTo(25, 6)
  })

  it('derives the points in time from the half-life', () => {
    const { values, flags } = computeHalflife({ substance: 'caffeine', dose: '100', hours: '0' })
    expect(values.percent).toBe(100)
    expect(values.t50).toBeCloseTo(5, 6)
    expect(values.t25).toBeCloseTo(10, 6)
    expect(values.t10).toBeCloseTo(16.61, 2)
    expect(values.t97).toBe(25)
    expect(flags.gone).toBe(false)
  })

  it('adds up repeated intake to a steady state', () => {
    const { values, flags } = computeHalflife({
      substance: 'caffeine',
      dose: '100',
      hours: '1',
      interval: '5',
    })
    expect(flags.repeated).toBe(true)
    expect(values.accumulation).toBeCloseTo(2, 6)
    expect(values.steadyPeak).toBeCloseTo(200, 6)
    expect(values.steadyTrough).toBeCloseTo(100, 6)
    expect(computeHalflife({ substance: 'caffeine' }).flags.repeated).toBe(false)
  })

  it('refuses to model a substance without a measured half-life', () => {
    const { values, flags, curve } = computeHalflife({ substance: 'hhc', hours: '24' })
    expect(flags.model).toBe(false)
    expect(flags.noModel).toBe(true)
    expect(values.remaining).toBe(0)
    expect(values.t97).toBe(0)
    expect(curve).toBe('')
    expect(flags.hasEffect).toBe(true)
  })

  it('marks an amount below one percent as gone', () => {
    expect(computeHalflife({ substance: 'caffeine', hours: '40' }).flags.gone).toBe(true)
  })

  it('draws a curve that starts full and falls', () => {
    const { curve, marker } = computeHalflife({ substance: 'caffeine', dose: '100', hours: '5' })
    const points = curve.split(' ').map((pair) => pair.split(',').map(Number))
    expect(points).toHaveLength(61)
    expect(points[0]).toEqual([0, 0])
    expect(points[60]?.[0]).toBe(300)
    expect(points[60]?.[1]).toBeGreaterThan(90)
    expect(marker.y).toBeCloseTo(50, 6)
    expect(marker.x).toBeGreaterThan(0)
  })

  it('falls back to defaults and clamps impossible input', () => {
    expect(normalizeHalflife({})).toMatchObject({
      substance: 'caffeine',
      dose: 100,
      unit: 'mg',
      hours: 6,
      interval: 0,
    })
    expect(normalizeHalflife({ substance: 'gibtesnicht' }).substance).toBe('caffeine')
    expect(normalizeHalflife({ hours: '-5', dose: '0' })).toMatchObject({ hours: 0, dose: 100 })
    expect(normalizeHalflife({ hours: '7,5', unit: 'mcg' })).toMatchObject({
      hours: 7.5,
      unit: 'mcg',
    })
  })

  it('writes long durations in days', () => {
    expect(formatDuration('de-DE', 0.75, WORDS)).toBe('45 Minuten')
    expect(formatDuration('de-DE', 25, WORDS)).toBe('25 Stunden')
    expect(formatDuration('de-DE', 1800, WORDS)).toBe('75 Tage')
  })
})

describe('substance data', () => {
  it('describes every substance in both languages', () => {
    for (const item of SUBSTANCES) {
      for (const field of ['de', 'en'] as const) {
        expect(item[field], item.key).toBeTruthy()
        expect(item.metabolites[field], item.key).toBeTruthy()
        expect(item.blood[field], item.key).toBeTruthy()
        expect(item.urine[field], item.key).toBeTruthy()
        expect(typeof item.note[field], item.key).toBe('string')
      }
      expect(SUBSTANCE_CATEGORIES, item.key).toContain(item.category)
      expect(item.routes.length, item.key).toBeGreaterThan(0)
      for (const route of item.routes) expect(ROUTES, item.key).toContain(route)
      for (const preparation of item.preparations) {
        expect(preparation.de, item.key).toBeTruthy()
        expect(preparation.en, item.key).toBeTruthy()
      }
      if (item.model) {
        expect(item.half, item.key).toBeGreaterThan(0)
        expect(item.low, item.key).toBeLessThanOrEqual(item.half)
        expect(item.high, item.key).toBeGreaterThanOrEqual(item.half)
      }
    }
  })

  it('carries the substances that are only studied clinically with their own note', () => {
    for (const key of ['lsd', 'psilocybin']) {
      const item = findSubstance(key)
      expect(item.key).toBe(key)
      expect(item.category).toBe('psychedelics')
      expect(item.note.de).toContain('Betäubungsmittelgesetz')
      expect(item.model).toBe(true)
    }
    expect(normalizeHalflife({ substance: 'lsd' }).unit).toBe('mcg')
    expect(normalizeHalflife({ substance: 'lsd', unit: 'mg' }).unit).toBe('mg')
  })

  it('scales the dose to the active content of a preparation', () => {
    const { values, flags } = computeHalflife({
      substance: 'ashwagandha',
      dose: '600',
      preparation: 'sensoril',
      hours: '0',
    })
    expect(values.share).toBe(10)
    expect(values.activeDose).toBeCloseTo(60, 6)
    expect(values.remaining).toBeCloseTo(60, 6)
    expect(flags.hasShare).toBe(true)
    expect(flags.hasPreparations).toBe(true)
    const plain = computeHalflife({ substance: 'caffeine', dose: '600' })
    expect(plain.values.activeDose).toBe(600)
    expect(plain.flags.hasShare).toBe(false)
    expect(plain.flags.hasPreparations).toBe(false)
  })

  it('falls back to the first preparation and an allowed route', () => {
    expect(normalizeHalflife({ substance: 'methylphenidate' }).preparation).toBe('ir')
    expect(
      normalizeHalflife({ substance: 'methylphenidate', preparation: 'nope' }).preparation,
    ).toBe('ir')
    expect(normalizeHalflife({ substance: 'nicotine', route: 'inhaled' }).route).toBe('inhaled')
    expect(normalizeHalflife({ substance: 'nicotine', route: 'intravenous' }).route).toBe('inhaled')
    expect(normalizeHalflife({ substance: 'caffeine', route: 'inhaled' }).route).toBe('oral')
    expect(computeHalflife({ substance: 'nicotine' }).flags.hasRoutes).toBe(true)
    expect(computeHalflife({ substance: 'caffeine' }).flags.hasRoutes).toBe(false)
  })

  it('keeps the keys unique and finds them again', () => {
    const keys = SUBSTANCES.map((item) => item.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(findSubstance('nicotine').key).toBe('nicotine')
    expect(findSubstance('nope').key).toBe('caffeine')
  })

  it('covers the requested substances', () => {
    const keys = SUBSTANCES.map((item) => item.key)
    for (const key of [
      'melatonin',
      'lsd',
      'psilocybin',
      'sertraline',
      'fluoxetine',
      'escitalopram',
      'citalopram',
      'lithium',
      'methyleneblue',
      'stjohnswort',
      'piracetam',
      'phenylpiracetam',
      'aniracetam',
      'oxiracetam',
      'nefiracetam',
      'huperzinea',
      'nattokinase',
      'ashwagandha',
      'ltheanine',
      'somatropin',
      'tadalafil',
      'sildenafil',
    ]) {
      expect(keys, key).toContain(key)
    }
    expect(findSubstance('lithium').preparations.map((item) => item.key)).toEqual([
      'carbonate',
      'orotate',
    ])
  })

  it('offers every substance under a category in the chosen language', () => {
    const german = substanceOptions('de')
    const english = substanceOptions('en')
    expect(german).toHaveLength(SUBSTANCES.length)
    expect(german.find((item) => item.key === 'caffeine')?.label).toBe('Koffein')
    expect(english.find((item) => item.key === 'caffeine')?.label).toBe('Caffeine')
  })
})

describe('course of the effect', () => {
  it('rises to the peak and fades after the stated duration', () => {
    const { effect, values, flags } = computeHalflife({ substance: 'caffeine', hours: '0.75' })
    expect(flags.hasEffect).toBe(true)
    expect(values.onset).toBe(0.25)
    expect(values.peak).toBe(0.75)
    expect(values.effectEnd).toBe(5)
    expect(values.effectNow).toBeCloseTo(100, 6)
    expect(effectShare(effect, 0)).toBe(0)
    expect(effectShare(effect, 0.25)).toBe(0)
    expect(effectShare(effect, 0.4)).toBeGreaterThan(0)
    expect(effectShare(effect, 0.4)).toBeLessThan(1)
    expect(effectShare(effect, 5)).toBeCloseTo(0.1, 1)
    expect(effectShare(effect, 12)).toBeLessThan(0.02)
  })

  it('draws the effect curve over its own time span', () => {
    const { effectCurve, values, effectMarker } = computeHalflife({
      substance: 'caffeine',
      hours: '0.75',
    })
    const points = effectCurve.split(' ').map((pair) => pair.split(',').map(Number))
    expect(points).toHaveLength(61)
    expect(points[0]).toEqual([0, 100])
    expect(values.effectSpan).toBeCloseTo(6.25, 6)
    expect(effectMarker.y).toBeCloseTo(0, 6)
    expect(effectMarker.x).toBeCloseTo((0.75 / 6.25) * 300, 6)
  })

  it('takes the course from the route and from the preparation', () => {
    const smoked = computeHalflife({ substance: 'thc', route: 'smoked' })
    const eaten = computeHalflife({ substance: 'thc', route: 'oral' })
    expect(smoked.values.peak).toBe(0.17)
    expect(eaten.values.peak).toBe(2)
    expect(eaten.values.effectEnd).toBeGreaterThan(smoked.values.effectEnd)
    expect(computeHalflife({ substance: 'alcohol' }).flags.hasEffect).toBe(false)
  })
})

describe('material amounts', () => {
  it('works out the substance in cannabis flower and what reaches the blood', () => {
    const { values, flags, material } = computeHalflife({
      substance: 'thc',
      route: 'smoked',
      amount: '0.5',
      potency: '20',
      hours: '0',
    })
    expect(flags.hasMaterial).toBe(true)
    expect(flags.hasBio).toBe(true)
    expect(material).toEqual({ kind: 'flower', active: 'thc' })
    expect(values.content).toBeCloseTo(100, 6)
    expect(values.bio).toBe(25)
    expect(values.absorbed).toBeCloseTo(25, 6)
    expect(values.activeDose).toBeCloseTo(25, 6)
  })

  it('keeps less of an edible and splits the two cannabis half-lives', () => {
    const eaten = computeHalflife({
      substance: 'thc',
      route: 'oral',
      amount: '0.5',
      potency: '20',
      hours: '0',
    })
    expect(eaten.values.absorbed).toBeCloseTo(6, 6)
    expect(computeHalflife({ substance: 'thc', preparation: 'occasional' }).values.half).toBe(30)
    const regular = computeHalflife({ substance: 'thc', preparation: 'regular' })
    expect(regular.values.half).toBe(120)
    expect(regular.values.low).toBe(72)
    expect(regular.values.high).toBe(240)
  })

  it('falls back to the default amount and the default content', () => {
    expect(normalizeHalflife({ substance: 'kratom' })).toMatchObject({ amount: 3, potency: 1.3 })
    expect(normalizeHalflife({ substance: 'kratom', amount: '', potency: '' })).toMatchObject({
      amount: 3,
      potency: 1.3,
    })
    expect(computeHalflife({ substance: 'kratom' }).values.content).toBeCloseTo(39, 6)
    expect(computeHalflife({ substance: 'caffeine' }).flags.hasMaterial).toBe(false)
  })
})

describe('alcohol', () => {
  const drink = { substance: 'alcohol', amount: '500', potency: '5', weight: '80' }

  it('turns a drink into grams and per mille with the Widmark formula', () => {
    const male = computeHalflife({ ...drink, sex: 'male', hours: '0' })
    expect(male.flags.zero).toBe(true)
    expect(male.flags.firstOrder).toBe(false)
    expect(male.flags.hasBody).toBe(true)
    expect(male.unit).toBe('\u2030')
    expect(male.values.content).toBeCloseTo(19.725, 3)
    expect(male.values.bac).toBeCloseTo(19.725 / (80 * 0.68), 6)
    const female = computeHalflife({ ...drink, sex: 'female', hours: '0' })
    expect(female.values.bac).toBeGreaterThan(male.values.bac)
  })

  it('takes off a fixed amount per hour instead of halving', () => {
    const peak = computeHalflife({ ...drink, hours: '0.5' }).values.remaining
    const later = computeHalflife({ ...drink, hours: '1.5' }).values.remaining
    expect(peak - later).toBeCloseTo(ALCOHOL_RATE, 6)
    expect(computeHalflife({ ...drink, hours: '0.25' }).values.remaining).toBeCloseTo(peak / 2, 6)
    expect(computeHalflife({ ...drink, hours: '48' }).values.remaining).toBe(0)
    expect(computeHalflife({ ...drink, hours: '0' }).values.soberIn).toBeCloseTo(
      0.5 + peak / ALCOHOL_RATE,
      6,
    )
    expect(computeHalflife({ ...drink, interval: '4' }).flags.repeated).toBe(false)
  })
})
