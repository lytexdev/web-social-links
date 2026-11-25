export const CALORIES_FIELDS = {
  age: { min: 14, max: 100, step: 1, fallback: 30 },
  height: { min: 120, max: 230, step: 1, fallback: 175 },
  weight: { min: 35, max: 250, step: 0.5, fallback: 75 },
  fat: { min: 3, max: 60, step: 0.5, fallback: 0 },
  sessions: { min: 0, max: 14, step: 1, fallback: 3 },
  minutes: { min: 10, max: 240, step: 5, fallback: 60 },
}

export const SEXES = ['male', 'female']

export const ACTIVITY_LEVELS = [
  { key: 'sitting', pal: 1.2 },
  { key: 'light', pal: 1.375 },
  { key: 'moderate', pal: 1.55 },
  { key: 'high', pal: 1.725 },
  { key: 'veryHigh', pal: 1.9 },
]

export const SPORT_INTENSITIES = [
  { key: 'easy', met: 4 },
  { key: 'medium', met: 6 },
  { key: 'hard', met: 8 },
]

export const CALORIES_DIGITS = {
  bmr: 0,
  lbm: 1,
  activityKcal: 0,
  sportKcal: 0,
  tdee: 0,
  cut20: 0,
  cut10: 0,
  gain10: 0,
  bmi: 1,
  pal: 3,
  met: 0,
  weeklyLoss: 2,
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

function round(value, digits) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function normalizeCalories(input) {
  const sex = SEXES.includes(input.sex) ? input.sex : 'male'
  const activity =
    ACTIVITY_LEVELS.find((level) => level.key === input.activity) ?? ACTIVITY_LEVELS[1]
  const intensity =
    SPORT_INTENSITIES.find((item) => item.key === input.intensity) ?? SPORT_INTENSITIES[1]
  const rawFat = Number(
    String(input.fat ?? '')
      .trim()
      .replace(',', '.'),
  )
  const fat = Number.isFinite(rawFat) && rawFat > 0 ? clamp(rawFat, CALORIES_FIELDS.fat) : 0
  return {
    sex,
    age: Math.round(clamp(input.age, CALORIES_FIELDS.age)),
    height: Math.round(clamp(input.height, CALORIES_FIELDS.height)),
    weight: round(clamp(input.weight, CALORIES_FIELDS.weight), 1),
    fat: round(fat, 1),
    activity: activity.key,
    pal: activity.pal,
    sessions: Math.round(clamp(input.sessions, CALORIES_FIELDS.sessions)),
    minutes: Math.round(clamp(input.minutes, CALORIES_FIELDS.minutes)),
    intensity: intensity.key,
    met: intensity.met,
  }
}

export function computeCalories(raw) {
  const input = normalizeCalories(raw)
  const usesKatch = input.fat > 0
  const lbm = usesKatch ? input.weight * (1 - input.fat / 100) : 0
  const bmr = usesKatch
    ? 370 + 21.6 * lbm
    : 10 * input.weight + 6.25 * input.height - 5 * input.age + (input.sex === 'male' ? 5 : -161)
  const activityKcal = bmr * input.pal - bmr
  const sportKcal =
    input.sessions > 0
      ? ((input.met * 3.5 * input.weight) / 200) * input.minutes * (input.sessions / 7)
      : 0
  const tdee = bmr + activityKcal + sportKcal
  const heightM = input.height / 100
  return {
    input,
    values: {
      bmr,
      lbm,
      activityKcal,
      sportKcal,
      tdee,
      cut20: tdee * 0.8,
      cut10: tdee * 0.9,
      gain10: tdee * 1.1,
      bmi: input.weight / (heightM * heightM),
      pal: input.pal,
      met: input.met,
      weeklyLoss: (tdee * 0.2 * 7) / 7700,
    },
    flags: { usesKatch, mifflin: !usesKatch, hasSport: input.sessions > 0 },
  }
}
