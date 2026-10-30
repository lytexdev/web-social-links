import type { IconEntry } from '#shared/utils/icon-search'

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
