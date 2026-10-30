export interface IconEntry {
  ref: string
  name: string
  category: string
  tags: string
}

export function searchIcons(index: IconEntry[], query: string): IconEntry[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return index
  const scored: Array<{ entry: IconEntry; score: number }> = []
  for (const entry of index) {
    const name = entry.name.toLowerCase()
    const tags = entry.tags.toLowerCase()
    let score = 0
    for (const term of terms) {
      if (name === term || name === `brand-${term}`) score += 100
      else if (name.startsWith(term) || name.startsWith(`brand-${term}`)) score += 50
      else if (name.includes(term)) score += 25
      else if (` ${tags} `.includes(` ${term} `)) score += 20
      else if (tags.includes(term)) score += 8
      else {
        score = 0
        break
      }
    }
    if (score > 0) scored.push({ entry, score })
  }
  return scored
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
    .map((item) => item.entry)
}
