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
