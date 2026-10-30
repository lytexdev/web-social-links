import { ICON_REF_PATTERN } from '../../shared/constants/icons'

interface IconIndex {
  version: string
  icons: Array<[string, string, string, string]>
}

let indexCache: IconIndex | null = null
let svgCache: Record<string, string> | null = null

export async function iconIndex(): Promise<IconIndex> {
  indexCache ??= (await useStorage('assets:server').getItem<IconIndex>('icons:index.json')) ?? {
    version: '0',
    icons: [],
  }
  return indexCache
}

async function svgBodies(): Promise<Record<string, string>> {
  svgCache ??=
    (await useStorage('assets:server').getItem<Record<string, string>>('icons:svg.json')) ?? {}
  return svgCache
}

export function wrapIcon(ref: string, body: string, size = 24): string {
  const outline = ref.startsWith('tabler:')
  const paint = outline
    ? 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
    : 'fill="currentColor"'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" ${paint} aria-hidden="true" focusable="false">${body}</svg>`
}

export async function iconSvgs(refs: Iterable<string>): Promise<Record<string, string>> {
  const bodies = await svgBodies()
  const result: Record<string, string> = {}
  for (const ref of refs) {
    if (!ICON_REF_PATTERN.test(ref) || ref.startsWith('media:')) continue
    const body = bodies[ref]
    if (body !== undefined) result[ref] = wrapIcon(ref, body)
  }
  return result
}

export async function iconExists(ref: string): Promise<boolean> {
  if (!ICON_REF_PATTERN.test(ref)) return false
  if (ref.startsWith('media:')) return true
  return ref in (await svgBodies())
}
