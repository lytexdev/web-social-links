import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PLATFORM_PRESETS } from '../../shared/constants/platforms'
import { searchIcons, type IconEntry } from '../../shared/utils/icon-search'

const INDEX = 'server/assets/icons/index.json'
const SVG = 'server/assets/icons/svg.json'

describe.skipIf(!existsSync(INDEX))('icon index', () => {
  const index = JSON.parse(readFileSync(INDEX, 'utf8')) as {
    icons: Array<[string, string, string, string]>
  }
  const svgs = JSON.parse(readFileSync(SVG, 'utf8')) as Record<string, string>
  const entries: IconEntry[] = index.icons.map(([ref, name, category, tags]) => ({
    ref,
    name,
    category,
    tags,
  }))

  it.each(PLATFORM_PRESETS.map((preset) => [preset.key, preset.icon]))(
    '%s resolves to %s',
    (_key, icon) => {
      expect(svgs[icon]).toMatch(/^<(path|circle|rect|line|polyline|polygon|ellipse|g)\b/)
    },
  )

  it('finds icons by name, tag and alias', () => {
    expect(searchIcons(entries, 'brand-instagram')[0]?.ref).toBe('tabler:brand-instagram')
    expect(searchIcons(entries, 'ig').some((entry) => entry.ref === 'tabler:brand-instagram')).toBe(
      true,
    )
    expect(searchIcons(entries, 'twitter').some((entry) => entry.ref === 'tabler:brand-x')).toBe(
      true,
    )
    expect(searchIcons(entries, 'heart').length).toBeGreaterThan(1)
    expect(searchIcons(entries, 'substack').some((entry) => entry.ref === 'si:substack')).toBe(true)
  })

  it('stays below the transfer budget for the picker', () => {
    expect(JSON.stringify(index).length).toBeLessThan(1_200_000)
  })
})
