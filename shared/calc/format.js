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
