const input = document.querySelector('[data-r-search]')
const count = document.querySelector('[data-r-count]')
const empty = document.querySelector('[data-r-empty]')
const groups = [...document.querySelectorAll('[data-r-group]')]

const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

if (input && count && groups.length > 0) {
  const items = groups.map((group) => ({
    group,
    rows: [...group.querySelectorAll('[data-r-item]')].map((row) => ({
      row,
      text: row.getAttribute('data-search') || '',
    })),
  }))
  let timer = 0
  const apply = () => {
    const terms = normalize(input.value).split(' ').filter(Boolean)
    let total = 0
    for (const { group, rows } of items) {
      let visible = 0
      for (const { row, text } of rows) {
        const match = terms.every((term) => text.includes(term))
        row.hidden = !match
        if (match) visible++
      }
      group.hidden = visible === 0
      total += visible
    }
    const template = total === 1 ? count.dataset.one : count.dataset.many
    count.textContent = (template || '').replace('{count}', total.toLocaleString(document.documentElement.lang))
    if (empty) empty.hidden = total > 0
  }
  input.addEventListener('input', () => {
    clearTimeout(timer)
    timer = setTimeout(apply, 120)
  })
}
