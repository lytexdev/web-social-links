import { describe, expect, it } from 'vitest'
import { formatDuration } from '../../shared/calc/format.js'
import { computeHalflife, normalizeHalflife, substanceOptions } from '../../shared/calc/halflife.js'
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

  it('refuses to model a substance without a single half-life', () => {
    const { values, flags, curve } = computeHalflife({ substance: 'thc', hours: '24' })
    expect(flags.model).toBe(false)
    expect(flags.noModel).toBe(true)
    expect(values.remaining).toBe(0)
    expect(values.t97).toBe(0)
    expect(curve).toBe('')
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
