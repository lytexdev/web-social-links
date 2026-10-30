export interface IconEntry {
  ref: string
  name: string
  category: string
  tags: string
}

const svgCache = new Map<string, string>()
let indexPromise: Promise<IconEntry[]> | null = null

export function useIcons() {
  const { request } = useApi()

  function loadIndex(): Promise<IconEntry[]> {
    indexPromise ??= request<{ version: string; icons: Array<[string, string, string, string]> }>(
      '/api/admin/icons/index',
    ).then((index) =>
      index.icons.map(([ref, name, category, tags]) => ({ ref, name, category, tags })),
    )
    indexPromise.catch(() => (indexPromise = null))
    return indexPromise
  }

  async function svgs(refs: string[]): Promise<Map<string, string>> {
    const missing = refs.filter((ref) => !svgCache.has(ref) && !ref.startsWith('media:'))
    for (let index = 0; index < missing.length; index += 150) {
      const batch = missing.slice(index, index + 150)
      const result = await request<Record<string, string>>(
        `/api/admin/icons/svg?refs=${encodeURIComponent(batch.join(','))}`,
      )
      for (const [ref, svg] of Object.entries(result)) svgCache.set(ref, svg)
    }
    return svgCache
  }

  function cached(ref: string): string | undefined {
    return svgCache.get(ref)
  }

  return { loadIndex, svgs, cached }
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
