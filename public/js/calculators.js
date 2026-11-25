import { CALORIES_DIGITS, computeCalories } from './calc/calories.js'
import { formatDuration, formatNumber, formatValues } from './calc/format.js'
import { HALFLIFE_DIGITS, computeHalflife } from './calc/halflife.js'
import { PEPTIDE_DIGITS, computePeptide } from './calc/peptide.js'

const form = document.querySelector('.c-form')
const page = document.querySelector('[data-calculator]')
if (form && page) {
  const kind = page.getAttribute('data-calculator')
  const engines = {
    calories: [computeCalories, CALORIES_DIGITS],
    peptide: [computePeptide, PEPTIDE_DIGITS],
    halflife: [computeHalflife, HALFLIFE_DIGITS],
  }
  const [compute, digits] = engines[kind] ?? engines.peptide
  const durationWords = JSON.parse(page.getAttribute('data-duration-words') ?? '{}')
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
    if (remember?.checked) writeStore(Object.fromEntries(data.entries()))
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
    for (const node of page.querySelectorAll('[data-calc-duration]')) {
      node.textContent = formatDuration(
        locale,
        result.values[node.getAttribute('data-calc-duration')],
        durationWords,
      )
    }
    for (const node of page.querySelectorAll('[data-calc-text]')) {
      const field = result.substance?.[node.getAttribute('data-calc-text')]
      if (field) node.textContent = field[document.documentElement.lang] ?? ''
    }
    for (const node of page.querySelectorAll('[data-calc-curve]')) {
      node.setAttribute('points', result.curve ?? '')
    }
    for (const node of page.querySelectorAll('[data-calc-marker]')) {
      node.setAttribute('cx', String(result.marker?.x ?? 0))
      node.setAttribute('cy', String(result.marker?.y ?? 0))
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

  const tools = page.querySelector('[data-tools]')
  const remember = page.querySelector('[data-remember]')
  const copyButton = page.querySelector('[data-copy-url]')
  const copyLabel = page.querySelector('[data-copy-label]')
  const copyStatus = page.querySelector('[data-copy-status]')
  const storageKey = `wsl-calc-${kind}`
  if (tools) tools.hidden = false

  const readStore = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    } catch {
      return null
    }
  }
  const writeStore = (value) => {
    try {
      if (value) localStorage.setItem(storageKey, JSON.stringify(value))
      else localStorage.removeItem(storageKey)
    } catch {
      return
    }
  }

  if (remember) {
    const stored = readStore()
    remember.checked = Boolean(stored)
    if (stored && !location.search) {
      for (const [name, value] of Object.entries(stored)) {
        const field = form.elements[name]
        if (field && typeof value === 'string') field.value = value
      }
    }
    remember.addEventListener('change', () => {
      if (!remember.checked) writeStore(null)
      else writeStore(Object.fromEntries(new FormData(form).entries()))
    })
  }

  if (copyButton && copyLabel && navigator.clipboard) {
    const original = copyLabel.textContent
    copyButton.addEventListener('click', async () => {
      await navigator.clipboard.writeText(location.href)
      copyLabel.textContent = copyButton.getAttribute('data-copied')
      if (copyStatus) copyStatus.textContent = copyButton.getAttribute('data-copied')
      setTimeout(() => {
        copyLabel.textContent = original
        if (copyStatus) copyStatus.textContent = ''
      }, 2000)
    })
  } else if (copyButton) {
    copyButton.hidden = true
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
