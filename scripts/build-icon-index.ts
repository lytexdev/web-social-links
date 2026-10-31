import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ICON_ALIASES } from '../shared/constants/icons.ts'
import { EXTRA_ICONS } from './extra-icons.ts'

interface TablerMeta {
  name: string
  category: string
  tags: Array<string | number>
  styles: Record<string, unknown>
}

interface SimpleIconMeta {
  title: string
  slug: string
  aliases?: { aka?: string[] }
}

const root = join(import.meta.dirname, '..')
const tablerRoot = join(root, 'node_modules', '@tabler', 'icons')
const simpleRoot = join(root, 'node_modules', 'simple-icons')
const outDir = join(root, 'server', 'assets', 'icons')

function body(svg: string): string {
  return svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/g, '')
    .replace(/\s*\n\s*/g, '')
    .replace(/\s+\/>/g, '/>')
    .trim()
}

const index: Array<[string, string, string, string]> = []
const svgs: Record<string, string> = {}

const tabler = JSON.parse(readFileSync(join(tablerRoot, 'icons.json'), 'utf8')) as Record<
  string,
  TablerMeta
>
for (const meta of Object.values(tabler)) {
  const tags = [...meta.tags.map(String), ...(ICON_ALIASES[meta.name] ?? [])].join(' ')
  const category = meta.category || (meta.name.startsWith('brand-') ? 'Brand' : '')
  for (const style of ['outline', 'filled'] as const) {
    if (!meta.styles[style]) continue
    const ref = `${style === 'outline' ? 'tabler' : 'tabler-filled'}:${meta.name}`
    svgs[ref] = body(readFileSync(join(tablerRoot, 'icons', style, `${meta.name}.svg`), 'utf8'))
    index.push([ref, meta.name, category, tags])
  }
}

const simple = JSON.parse(
  readFileSync(join(simpleRoot, 'data', 'simple-icons.json'), 'utf8'),
) as SimpleIconMeta[]
for (const meta of simple) {
  const ref = `si:${meta.slug}`
  svgs[ref] = body(readFileSync(join(simpleRoot, 'icons', `${meta.slug}.svg`), 'utf8'))
  index.push([
    ref,
    meta.title,
    'Brand',
    [meta.slug, ...(meta.aliases?.aka ?? []), ...(ICON_ALIASES[`brand-${meta.slug}`] ?? [])]
      .join(' ')
      .toLowerCase(),
  ])
}

for (const icon of EXTRA_ICONS) {
  const ref = `extra:${icon.name}`
  svgs[ref] = icon.body
  index.push([ref, icon.name, icon.category, icon.tags.join(' ')])
}

const version = createHash('sha256')
  .update(JSON.stringify(index))
  .update(JSON.stringify(svgs))
  .digest('hex')
  .slice(0, 16)

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'index.json'), JSON.stringify({ version, icons: index }))
writeFileSync(join(outDir, 'svg.json'), JSON.stringify(svgs))
process.stdout.write(`icon index: ${index.length} icons\n`)
