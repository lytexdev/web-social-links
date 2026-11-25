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
