import { CALORIES_DIGITS, computeCalories } from './calc/calories.js'
import { formatNumber, formatValues } from './calc/format.js'
import { PEPTIDE_DIGITS, computePeptide } from './calc/peptide.js'

const form = document.querySelector('.c-form')
const page = document.querySelector('[data-calculator]')
if (form && page) {
  const kind = page.getAttribute('data-calculator')
  const compute = kind === 'calories' ? computeCalories : computePeptide
  const digits = kind === 'calories' ? CALORIES_DIGITS : PEPTIDE_DIGITS
  const locale = document.documentElement.lang === 'de' ? 'de-DE' : 'en-GB'
  const format = (value, decimals) => formatNumber(locale, value, decimals)
  const submit = form.querySelector('.c-submit')
  if (submit) submit.hidden = true

  const apply = () => {
    const data = new FormData(form)
    const entries = {}
    for (const [name, value] of data.entries()) entries[name] = value
    const result = compute(entries)
    const query = new URLSearchParams()
    for (const [name, value] of data.entries()) if (value !== '') query.set(name, String(value))
    history.replaceState(null, '', `${location.pathname}?${query.toString()}`)
    const values = formatValues(locale, result.values, digits)
    for (const node of page.querySelectorAll('[data-calc]')) {
      const key = node.getAttribute('data-calc')
      if (key in values) node.textContent = values[key]
    }
    for (const node of page.querySelectorAll('[data-calc-when]')) {
      const raw = node.getAttribute('data-calc-when')
      const negated = raw.startsWith('!')
      const key = negated ? raw.slice(1) : raw
      node.hidden = negated ? Boolean(result.flags[key]) : !result.flags[key]
    }
    for (const node of page.querySelectorAll('[data-calc-fill]')) {
      node.setAttribute('width', String(Math.round((result.fill ?? 0) * 240)))
    }
    for (const row of page.querySelectorAll('[data-alt]')) {
      const alternative = (result.alternatives ?? [])[Number(row.getAttribute('data-alt'))]
      if (!alternative) continue
      const units = row.querySelector('[data-alt-units]')
      const conc = row.querySelector('[data-alt-conc]')
      const fits = row.querySelector('[data-alt-fits]')
      const unfit = row.querySelector('[data-alt-unfit]')
      if (units) units.textContent = format(alternative.units, 1)
      if (conc) conc.textContent = format(alternative.concentrationMgMl, 2)
      if (fits) fits.hidden = !alternative.fits
      if (unfit) unfit.hidden = alternative.fits
      if (alternative.current) row.setAttribute('data-current', 'true')
      else row.removeAttribute('data-current')
    }
  }

  let timer = 0
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(apply, 120)
  }
  form.addEventListener('input', schedule)
  form.addEventListener('change', apply)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    apply()
  })
  apply()
}
