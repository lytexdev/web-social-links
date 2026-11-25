import { describe, expect, it } from 'vitest'
import { computeCalories, normalizeCalories } from '../../shared/calc/calories.js'
import { formatValues } from '../../shared/calc/format.js'
import { computePeptide, normalizePeptide } from '../../shared/calc/peptide.js'
import { calculatorsSchema } from '../../shared/schemas/settings'

const MAN = {
  sex: 'male',
  age: '30',
  height: '180',
  weight: '80',
  fat: '',
  activity: 'light',
  sessions: '0',
  minutes: '60',
  intensity: 'medium',
}

describe('calorie calculator', () => {
  it('uses Mifflin-St Jeor without a body fat value', () => {
    const { values, flags } = computeCalories(MAN)
    expect(values.bmr).toBeCloseTo(1780, 6)
    expect(flags.usesKatch).toBe(false)
    expect(values.activityKcal).toBeCloseTo(1780 * 0.375, 6)
    expect(values.sportKcal).toBe(0)
    expect(values.tdee).toBeCloseTo(1780 * 1.375, 6)
  })

  it('subtracts 166 kcal for women at the same body data', () => {
    const woman = computeCalories({ ...MAN, sex: 'female' })
    expect(computeCalories(MAN).values.bmr - woman.values.bmr).toBe(166)
  })

  it('switches to Katch-McArdle as soon as a body fat value is given', () => {
    const { values, flags } = computeCalories({ ...MAN, fat: '20' })
    expect(flags.usesKatch).toBe(true)
    expect(values.lbm).toBeCloseTo(64, 6)
    expect(values.bmr).toBeCloseTo(370 + 21.6 * 64, 6)
  })

  it('spreads the weekly sport over seven days through the MET value', () => {
    const { values } = computeCalories({ ...MAN, sessions: '3', intensity: 'hard' })
    const perSession = ((8 * 3.5 * 80) / 200) * 60
    expect(values.sportKcal).toBeCloseTo((perSession * 3) / 7, 6)
    expect(values.tdee).toBeCloseTo(values.bmr * 1.375 + values.sportKcal, 6)
  })

  it('derives the targets from the total expenditure', () => {
    const { values } = computeCalories(MAN)
    expect(values.cut20).toBeCloseTo(values.tdee * 0.8, 6)
    expect(values.cut10).toBeCloseTo(values.tdee * 0.9, 6)
    expect(values.gain10).toBeCloseTo(values.tdee * 1.1, 6)
    expect(values.bmi).toBeCloseTo(80 / 1.8 ** 2, 6)
  })

  it('falls back to defaults for empty input and clamps the rest', () => {
    expect(normalizeCalories({})).toMatchObject({ age: 30, height: 175, weight: 75, fat: 0 })
    expect(normalizeCalories({ age: '  ', weight: 'abc' })).toMatchObject({ age: 30, weight: 75 })
    expect(normalizeCalories({ age: '999', height: '1', weight: '12,5' })).toMatchObject({
      age: 100,
      height: 120,
      weight: 35,
    })
    expect(normalizeCalories({ sex: 'other', activity: 'nope', intensity: 'nope' })).toMatchObject({
      sex: 'male',
      activity: 'light',
      intensity: 'medium',
    })
  })
})

describe('peptide calculator', () => {
  it('turns the concentration into units on a U-100 syringe', () => {
    const { values, flags, fill } = computePeptide({
      vial: '5',
      solvent: '2',
      dose: '250',
      unit: 'mcg',
      scale: 'u100',
      size: '1',
    })
    expect(values.concentrationMgMl).toBe(2.5)
    expect(values.volumeMl).toBe(0.1)
    expect(values.units).toBe(10)
    expect(values.mcgPerUnit).toBe(25)
    expect(values.wholeDoses).toBe(20)
    expect(values.restMcg).toBe(0)
    expect(flags.fits).toBe(true)
    expect(fill).toBeCloseTo(0.1, 6)
  })

  it('reads 40 units per ml on a U-40 syringe and converts mg doses', () => {
    const { values } = computePeptide({
      vial: '10',
      solvent: '1',
      dose: '0.5',
      unit: 'mg',
      scale: 'u40',
      size: '0.5',
    })
    expect(values.doseMcg).toBe(500)
    expect(values.volumeMl).toBe(0.05)
    expect(values.units).toBe(2)
    expect(values.capacityUnits).toBe(20)
  })

  it('warns when the amount misses the usable range of the syringe', () => {
    const over = computePeptide({ vial: '10', solvent: '10', dose: '5', unit: 'mg', size: '0.3' })
    expect(over.flags.overCapacity).toBe(true)
    expect(over.fill).toBe(1)
    const small = computePeptide({ vial: '10', solvent: '0.5', dose: '20', unit: 'mcg' })
    expect(small.flags.tooSmall).toBe(true)
  })

  it('keeps a remainder that no longer covers a full draw', () => {
    const { values } = computePeptide({ vial: '5', solvent: '2', dose: '300', unit: 'mcg' })
    expect(values.wholeDoses).toBe(16)
    expect(values.restMcg).toBeCloseTo(200, 6)
  })

  it('lists other solvent amounts and marks the current one', () => {
    const { alternatives } = computePeptide({ vial: '5', solvent: '2', dose: '250' })
    expect(alternatives.map((item) => item.solvent)).toEqual([0.5, 1, 2, 3, 5])
    expect(alternatives[0]).toMatchObject({ concentrationMgMl: 10, units: 2.5, fits: true })
    expect(alternatives[4]?.units).toBe(25)
    expect(alternatives.filter((item) => item.current).map((item) => item.solvent)).toEqual([2])
  })

  it('marks solvent amounts that leave the readable range', () => {
    const { alternatives } = computePeptide({ vial: '10', solvent: '2', dose: '50', size: '0.3' })
    expect(alternatives.map((item) => item.fits)).toEqual([false, false, false, false, true])
  })

  it('falls back to defaults and accepts a comma as the decimal mark', () => {
    expect(normalizePeptide({})).toMatchObject({ vial: 5, solvent: 2, dose: 250, unit: 'mcg' })
    expect(normalizePeptide({ solvent: '1,5' })).toMatchObject({ solvent: 1.5 })
    expect(normalizePeptide({ scale: 'u40', size: '7' })).toMatchObject({
      unitsPerMl: 40,
      size: 1,
    })
  })
})

describe('calculator output', () => {
  it('formats every value with its own number of decimals', () => {
    const formatted = formatValues('de-DE', { a: 1234.567, b: 1234.567 }, { a: 0, b: 2 })
    expect(formatted).toEqual({ a: '1.235', b: '1.234,57' })
  })

  it('validates the settings and refuses a reserved address', () => {
    expect(calculatorsSchema.parse({})).toMatchObject({ path: 'rechner', indexTitle: 'Rechner' })
    expect(calculatorsSchema.parse({}).calories.enabled).toBe(false)
    expect(calculatorsSchema.safeParse({ path: 'api' }).error?.issues[0]?.message).toBe('reserved')
  })
})
