export function formatNumber(locale, value, digits) {
  if (!Number.isFinite(value)) return ''
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatValues(locale, values, digits) {
  const result = {}
  for (const [key, value] of Object.entries(values)) {
    result[key] = formatNumber(locale, value, digits[key] ?? 1)
  }
  return result
}

export function formatDuration(locale, hours, words) {
  if (!Number.isFinite(hours)) return ''
  if (hours > 0 && hours < 1) {
    return `${formatNumber(locale, hours * 60, 0)} ${words.minutes}`
  }
  if (hours < 48) return `${formatNumber(locale, hours, 1)} ${words.hours}`
  return `${formatNumber(locale, hours / 24, hours / 24 < 10 ? 1 : 0)} ${words.days}`
}

export function formatDurations(locale, values, keys, words) {
  const result = {}
  for (const key of keys) result[key] = formatDuration(locale, values[key], words)
  return result
}
