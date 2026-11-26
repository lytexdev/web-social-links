document.querySelectorAll('[data-copy]').forEach((button) => {
  const id = button.getAttribute('data-copy')
  const source = document.getElementById(id)
  const status = document.querySelector(`[data-copy-status="${id}"]`)
  if (!source || !navigator.clipboard) return
  button.hidden = false
  const label = button.lastElementChild
  const original = label.textContent
  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(source.textContent.trim())
    label.textContent = button.getAttribute('data-copied')
    if (status) status.textContent = button.getAttribute('data-copied')
    setTimeout(() => {
      label.textContent = original
      if (status) status.textContent = ''
    }, 2000)
  })
})

document.querySelectorAll('[data-code-go]').forEach((link) => {
  const id = link.getAttribute('data-code-go')
  const source = document.getElementById(id)
  if (!source || !navigator.clipboard) return
  const note = document.querySelector(`[data-code-note="${id}"]`)
  if (note) note.hidden = false
  link.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    const open = () => {
      window.location.href = link.href
    }
    navigator.clipboard.writeText(source.textContent.trim()).then(open, open)
  })
})

const toTop = document.querySelector('[data-to-top]')
if (toTop) {
  const sync = () => {
    toTop.hidden = window.scrollY < 400
  }
  sync()
  window.addEventListener('scroll', sync, { passive: true })
  toTop.addEventListener('click', (event) => {
    event.preventDefault()
    const target = document.getElementById('main')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (target) {
      target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    }
  })
}

const themeToggle = document.querySelector('[data-theme-toggle]')
if (themeToggle) {
  const sun = themeToggle.querySelector('[data-theme-sun]')
  const moon = themeToggle.querySelector('[data-theme-moon]')
  const root = document.documentElement
  const stored = (() => {
    try {
      return localStorage.getItem('wsl-theme')
    } catch {
      return null
    }
  })()
  const base = themeToggle.getAttribute('data-scheme')
  const current = () =>
    root.dataset.theme ??
    (base === 'auto'
      ? window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      : base)
  const paint = () => {
    const light = current() === 'light'
    if (sun) sun.hidden = light
    if (moon) moon.hidden = !light
    themeToggle.setAttribute(
      'aria-label',
      themeToggle.getAttribute(light ? 'data-label-dark' : 'data-label-light'),
    )
  }
  if (stored === 'light' || stored === 'dark') root.dataset.theme = stored
  themeToggle.hidden = false
  paint()
  themeToggle.addEventListener('click', () => {
    const next = current() === 'light' ? 'dark' : 'light'
    root.dataset.theme = next
    try {
      localStorage.setItem('wsl-theme', next)
    } catch {
      paint()
      return
    }
    paint()
  })
}
