export const PEPTIDE_FIELDS = {
  vial: { min: 0.1, max: 1000, step: 0.1, fallback: 5 },
  solvent: { min: 0.1, max: 30, step: 0.1, fallback: 2 },
  dose: { min: 0.1, max: 100_000, step: 1, fallback: 250 },
}

export const DOSE_UNITS = ['mcg', 'mg']
export const SYRINGE_SCALES = [
  { key: 'u100', unitsPerMl: 100 },
  { key: 'u40', unitsPerMl: 40 },
]
export const SYRINGE_SIZES = [0.3, 0.5, 1]
export const ALTERNATIVE_SOLVENTS = [0.5, 1, 2, 3, 5]

export const PEPTIDE_DIGITS = {
  concentrationMgMl: 2,
  concentrationMcgMl: 0,
  doseMcg: 1,
  doseMg: 3,
  volumeMl: 3,
  units: 1,
  capacityUnits: 0,
  vialMcg: 0,
  dosesPerVial: 1,
  wholeDoses: 0,
  restMcg: 0,
  mcgPerUnit: 1,
  altUnits: 1,
  altConc: 2,
}

function clamp(value, field) {
  const raw = String(value ?? '')
    .trim()
    .replace(',', '.')
  if (raw === '') return field.fallback
  const number = Number(raw)
  if (!Number.isFinite(number)) return field.fallback
  return Math.min(field.max, Math.max(field.min, number))
}

export function normalizePeptide(input) {
  const unit = DOSE_UNITS.includes(input.unit) ? input.unit : 'mcg'
  const scale = SYRINGE_SCALES.find((item) => item.key === input.scale) ?? SYRINGE_SCALES[0]
  const sizeValue = Number(input.size)
  const size = SYRINGE_SIZES.includes(sizeValue) ? sizeValue : 1
  return {
    vial: clamp(input.vial, PEPTIDE_FIELDS.vial),
    solvent: clamp(input.solvent, PEPTIDE_FIELDS.solvent),
    dose: clamp(input.dose, PEPTIDE_FIELDS.dose),
    unit,
    scale: scale.key,
    unitsPerMl: scale.unitsPerMl,
    size,
  }
}

export function computePeptide(raw) {
  const input = normalizePeptide(raw)
  const concentrationMgMl = input.vial / input.solvent
  const concentrationMcgMl = concentrationMgMl * 1000
  const doseMcg = input.unit === 'mg' ? input.dose * 1000 : input.dose
  const volumeMl = doseMcg / concentrationMcgMl
  const units = volumeMl * input.unitsPerMl
  const capacityUnits = input.size * input.unitsPerMl
  const vialMcg = input.vial * 1000
  const dosesPerVial = vialMcg / doseMcg
  const wholeDoses = Math.floor(dosesPerVial)
  const values = {
    concentrationMgMl,
    concentrationMcgMl,
    doseMcg,
    doseMg: doseMcg / 1000,
    volumeMl,
    units,
    capacityUnits,
    vialMcg,
    dosesPerVial,
    wholeDoses,
    restMcg: vialMcg - wholeDoses * doseMcg,
    mcgPerUnit: concentrationMcgMl / input.unitsPerMl,
  }
  const alternatives = ALTERNATIVE_SOLVENTS.map((solvent) => {
    const altUnits = (doseMcg / ((input.vial * 1000) / solvent)) * input.unitsPerMl
    return {
      solvent,
      units: altUnits,
      concentrationMgMl: input.vial / solvent,
      fits: altUnits <= capacityUnits && altUnits >= 2,
      current: Math.abs(solvent - input.solvent) < 0.001,
    }
  })
  return {
    input,
    values,
    flags: {
      overCapacity: units > capacityUnits,
      tooSmall: units > 0 && units < 2,
      fits: units <= capacityUnits && units >= 2,
    },
    alternatives,
    fill: Math.max(0, Math.min(1, units / capacityUnits)),
  }
}
