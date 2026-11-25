export function createPicker(field, labels, onChange) {
  const select = field.querySelector('[data-picker-select]')
  const label = field.querySelector('label')
  if (!select || !label) return null

  const entries = [...select.querySelectorAll('option')].map((option) => ({
    value: option.value,
    text: option.textContent.trim(),
    group: option.parentElement.getAttribute('label') ?? '',
  }))

  const box = document.createElement('div')
  box.className = 'c-combo'
  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'c-input'
  input.id = `${select.id}-search`
  input.autocomplete = 'off'
  input.spellcheck = false
  input.setAttribute('role', 'combobox')
  input.setAttribute('aria-expanded', 'false')
  input.setAttribute('aria-autocomplete', 'list')
  input.setAttribute('aria-controls', `${select.id}-list`)
  input.setAttribute('placeholder', labels.search)
  const list = document.createElement('ul')
  list.className = 'c-combo-list'
  list.id = `${select.id}-list`
  list.setAttribute('role', 'listbox')
  list.setAttribute('aria-label', label.textContent.trim())
  list.hidden = true
  box.append(input, list)
  select.after(box)
  select.hidden = true
  select.setAttribute('tabindex', '-1')
  select.setAttribute('aria-hidden', 'true')
  label.setAttribute('for', input.id)

  let active = -1
  let shown = entries

  const current = () => entries.find((item) => item.value === select.value)
  const sync = () => {
    input.value = current()?.text ?? ''
  }

  const render = (term) => {
    const needle = term.trim().toLowerCase()
    shown = needle
      ? entries.filter(
          (item) =>
            item.text.toLowerCase().includes(needle) || item.group.toLowerCase().includes(needle),
        )
      : entries
    list.textContent = ''
    if (shown.length === 0) {
      const empty = document.createElement('li')
      empty.className = 'c-combo-empty'
      empty.textContent = labels.none
      list.append(empty)
      return
    }
    for (const [index, item] of shown.entries()) {
      const option = document.createElement('li')
      option.id = `${select.id}-option-${index}`
      option.className = 'c-combo-option'
      option.setAttribute('role', 'option')
      option.setAttribute('aria-selected', String(item.value === select.value))
      option.dataset.value = item.value
      option.textContent = item.text
      if (item.group) option.dataset.group = item.group
      list.append(option)
    }
  }

  const open = () => {
    render(input.value === current()?.text ? '' : input.value)
    list.hidden = false
    input.setAttribute('aria-expanded', 'true')
  }
  const close = () => {
    list.hidden = true
    input.setAttribute('aria-expanded', 'false')
    input.removeAttribute('aria-activedescendant')
    active = -1
    sync()
  }
  const highlight = (index) => {
    const options = [...list.querySelectorAll('[role="option"]')]
    if (options.length === 0) return
    active = (index + options.length) % options.length
    for (const [position, option] of options.entries()) {
      option.classList.toggle('is-active', position === active)
    }
    const option = options[active]
    input.setAttribute('aria-activedescendant', option.id)
    option.scrollIntoView({ block: 'nearest' })
  }
  const choose = (value) => {
    select.value = value
    close()
    onChange()
  }

  input.addEventListener('focus', open)
  input.addEventListener('input', () => {
    open()
    highlight(0)
  })
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (list.hidden) open()
      highlight(active + (event.key === 'ArrowDown' ? 1 : -1))
    } else if (event.key === 'Enter') {
      const option = [...list.querySelectorAll('[role="option"]')][active]
      if (!list.hidden && option) {
        event.preventDefault()
        choose(option.dataset.value)
      }
    } else if (event.key === 'Escape') {
      close()
    }
  })
  list.addEventListener('mousedown', (event) => {
    const option = event.target.closest('[role="option"]')
    if (option) {
      event.preventDefault()
      choose(option.dataset.value)
    }
  })
  document.addEventListener('click', (event) => {
    if (!box.contains(event.target)) close()
  })

  sync()
  return { sync }
}
