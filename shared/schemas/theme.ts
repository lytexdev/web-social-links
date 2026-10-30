import { z } from 'zod'
import { contrastRatio } from '../utils/contrast'

const hex = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^#[0-9a-f]{6}$/, { error: 'hex_color' })

export const paletteSchema = z.object({
  bg: hex,
  surface: hex,
  line: hex,
  text: hex,
  muted: hex,
  accent: hex,
  onAccent: hex,
})

export type Palette = z.infer<typeof paletteSchema>

export const PRESETS: Record<'datasheet' | 'paper', { dark: Palette; light: Palette }> = {
  datasheet: {
    dark: {
      bg: '#0d0e10',
      surface: '#15171a',
      line: '#26292e',
      text: '#ecedee',
      muted: '#9ba1a6',
      accent: '#c8f135',
      onAccent: '#0d0e10',
    },
    light: {
      bg: '#f4f2ee',
      surface: '#ece9e3',
      line: '#d9d5ce',
      text: '#141414',
      muted: '#5e5b55',
      accent: '#4b6600',
      onAccent: '#f4f2ee',
    },
  },
  paper: {
    dark: {
      bg: '#141414',
      surface: '#1c1c1b',
      line: '#2e2d2a',
      text: '#f4f2ee',
      muted: '#a9a59d',
      accent: '#e8d9a8',
      onAccent: '#141414',
    },
    light: {
      bg: '#f4f2ee',
      surface: '#ece9e3',
      line: '#d9d5ce',
      text: '#141414',
      muted: '#5e5b55',
      accent: '#7a3b12',
      onAccent: '#f4f2ee',
    },
  },
}

export const themeSchema = z.object({
  preset: z.enum(['datasheet', 'paper']).default('datasheet'),
  scheme: z.enum(['dark', 'light', 'auto']).default('dark'),
  dark: paletteSchema.default(PRESETS.datasheet.dark),
  light: paletteSchema.default(PRESETS.datasheet.light),
  background: z.enum(['plain', 'dots']).default('dots'),
  rowStyle: z.enum(['hairline', 'outlined', 'filled']).default('hairline'),
  radius: z.union([z.literal(0), z.literal(6), z.literal(12), z.literal(999)]).default(6),
  density: z.enum(['compact', 'normal']).default('normal'),
  profileAlign: z.enum(['left', 'center']).default('left'),
  avatarShape: z.enum(['rounded', 'circle']).default('rounded'),
})

export type Theme = z.infer<typeof themeSchema>

export interface ContrastCheck {
  scheme: 'dark' | 'light'
  pair: string
  ratio: number
  required: number
  ok: boolean
}

const PAIRS: Array<[keyof Palette, keyof Palette, number, string]> = [
  ['text', 'bg', 4.5, 'text/bg'],
  ['text', 'surface', 4.5, 'text/surface'],
  ['muted', 'bg', 4.5, 'muted/bg'],
  ['muted', 'surface', 4.5, 'muted/surface'],
  ['onAccent', 'accent', 4.5, 'onAccent/accent'],
  ['accent', 'bg', 3, 'accent/bg'],
  ['accent', 'surface', 3, 'accent/surface'],
]

export function activeSchemes(theme: Pick<Theme, 'scheme'>): Array<'dark' | 'light'> {
  return theme.scheme === 'auto' ? ['dark', 'light'] : [theme.scheme]
}

export function checkThemeContrast(theme: Theme): ContrastCheck[] {
  const checks: ContrastCheck[] = []
  for (const scheme of activeSchemes(theme)) {
    const palette = theme[scheme]
    for (const [foreground, background, required, pair] of PAIRS) {
      const ratio = contrastRatio(palette[foreground], palette[background])
      checks.push({ scheme, pair, ratio, required, ok: ratio >= required })
    }
  }
  return checks
}

function paletteVariables(palette: Palette): string {
  return [
    `--wsl-bg:${palette.bg}`,
    `--wsl-surface:${palette.surface}`,
    `--wsl-line:${palette.line}`,
    `--wsl-text:${palette.text}`,
    `--wsl-muted:${palette.muted}`,
    `--wsl-accent:${palette.accent}`,
    `--wsl-on-accent:${palette.onAccent}`,
    `--wsl-focus:${palette.accent}`,
  ].join(';')
}

export function themeCss(theme: Theme): string {
  const radius = theme.radius === 999 ? '999px' : `${theme.radius}px`
  const shared = [
    `--wsl-radius:${radius}`,
    `--wsl-avatar-radius:${theme.avatarShape === 'circle' ? '50%' : '18px'}`,
    `--wsl-row-min:${theme.density === 'compact' ? '3.5rem' : '4rem'}`,
    `--wsl-gap:${theme.density === 'compact' ? '1.5rem' : '2rem'}`,
    `--wsl-dot-opacity:${theme.background === 'dots' ? '1' : '0'}`,
  ].join(';')
  const primary = theme.scheme === 'light' ? theme.light : theme.dark
  const scheme = theme.scheme === 'light' ? 'light' : 'dark'
  let css = `:root:root{${paletteVariables(primary)};${shared};color-scheme:${scheme}}`
  if (theme.scheme === 'auto') {
    css += `@media (prefers-color-scheme: light){:root:root{${paletteVariables(theme.light)};color-scheme:light}}`
  }
  return css
}
