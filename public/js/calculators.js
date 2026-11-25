import { CALORIES_DIGITS, computeCalories } from './calc/calories.js'
import { formatDuration, formatNumber, formatValues } from './calc/format.js'
import { HALFLIFE_DIGITS, computeHalflife } from './calc/halflife.js'
import { findSubstance } from './calc/substances.js'
import { createPicker } from './picker.js'
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
    latest = result
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
    const prepNote = page.querySelector('[data-prep-note]')
    if (prepNote && result.input?.preparation) {
      const substance = findSubstance(String(result.input.substance))
      const chosen = substance.preparations.find((item) => item.key === result.input.preparation)
      prepNote.textContent = chosen?.note?.[lang] ?? ''
    }
    const routeNote = page.querySelector('[data-route-note]')
    if (routeNote && result.input?.route) {
      routeNote.textContent = routeNotes[result.input.route] ?? ''
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
    chartDraw()
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

  const lang = document.documentElement.lang === 'de' ? 'de' : 'en'
  const routeLabels = JSON.parse(page.getAttribute('data-route-labels') ?? '{}')
  const routeNotes = JSON.parse(page.getAttribute('data-route-notes') ?? '{}')
  const pickerField = page.querySelector('[data-picker]')
  const substanceSelect = page.querySelector('[data-picker-select]')
  const preparationSelect = page.querySelector('[data-preparation]')
  const routeSelect = page.querySelector('[data-route]')
  const preparationField = page.querySelector('[data-field="preparation"]')
  const routeField = page.querySelector('[data-field="route"]')

  const fillOptions = (select, options, keep) => {
    if (!select) return
    const previous = select.value
    select.textContent = ''
    for (const option of options) {
      const node = document.createElement('option')
      node.value = option.value
      node.textContent = option.label
      select.append(node)
    }
    if (keep && options.some((option) => option.value === previous)) select.value = previous
    else if (options[0]) select.value = options[0].value
  }

  const syncDependent = (keep) => {
    if (!substanceSelect) return
    const substance = findSubstance(substanceSelect.value)
    fillOptions(
      preparationSelect,
      substance.preparations.map((item) => ({ value: item.key, label: item[lang] })),
      keep,
    )
    fillOptions(
      routeSelect,
      substance.routes.map((key) => ({ value: key, label: routeLabels[key] ?? key })),
      keep,
    )
    if (preparationField) preparationField.hidden = substance.preparations.length === 0
    if (routeField) routeField.hidden = substance.routes.length < 2
  }

  let latest = null
  let chartDraw = () => {}
  let timer = 0
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(apply, 120)
  }
  if (pickerField) {
    const labels = JSON.parse(page.getAttribute('data-picker-labels') ?? '{}')
    const picker = createPicker(pickerField, labels, () => {
      syncDependent(false)
      apply()
      picker?.sync()
    })
    syncDependent(true)
  }

  const chart = page.querySelector('[data-chart]')
  if (chart) {
    const probe = chart.querySelector('[data-probe]')
    const probeLine = chart.querySelector('[data-probe-line]')
    const probeDot = chart.querySelector('[data-probe-dot]')
    const readout = chart.querySelector('[data-chart-readout]')
    const template = page.getAttribute('data-chart-at') ?? ''
    const hint = readout?.textContent ?? ''
    let fraction = -1

    const draw = () => {
      if (!probe || !probeLine || !probeDot || !readout) return
      if (fraction < 0 || !latest?.flags.model) {
        probe.setAttribute('hidden', '')
        readout.textContent = hint
        return
      }
      const half = latest.values.half
      const span = latest.values.span
      const hours = fraction * span
      const share = 0.5 ** (hours / half)
      probe.removeAttribute('hidden')
      probeLine.setAttribute('x1', String(fraction * 300))
      probeLine.setAttribute('x2', String(fraction * 300))
      probeDot.setAttribute('cx', String(fraction * 300))
      probeDot.setAttribute('cy', String(100 - share * 100))
      readout.textContent = template
        .replace('{time}', formatDuration(locale, hours, durationWords))
        .replace('{percent}', formatNumber(locale, share * 100, 1))
    }

    const fromEvent = (event) => {
      const box = chart.getBoundingClientRect()
      fraction = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
      draw()
    }
    chart.addEventListener('pointermove', fromEvent)
    chart.addEventListener('pointerdown', fromEvent)
    chart.addEventListener('pointerleave', () => {
      fraction = -1
      draw()
    })
    chart.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 0.1 : 0.02
      if (event.key === 'ArrowRight') fraction = Math.min(1, (fraction < 0 ? 0 : fraction) + step)
      else if (event.key === 'ArrowLeft') fraction = Math.max(0, (fraction < 0 ? 0 : fraction) - step)
      else if (event.key === 'Home') fraction = 0
      else if (event.key === 'End') fraction = 1
      else if (event.key === 'Escape') fraction = -1
      else return
      event.preventDefault()
      draw()
    })
    chart.addEventListener('blur', () => {
      fraction = -1
      draw()
    })
    chartDraw = draw
  }

  form.addEventListener('input', schedule)
  form.addEventListener('change', (event) => {
    if (event.target === substanceSelect) syncDependent(false)
    apply()
  })
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    apply()
  })
  apply()
}
