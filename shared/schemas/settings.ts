import { z } from 'zod'
import { RESERVED_SLUGS, SLUG_PATTERN } from '../constants/routing'
import { checkLinkUrl } from '../utils/url-policy'
import { iconField, idField, mediaIdField } from './content'
import { themeSchema } from './theme'

const text = (max: number) => z.string().trim().max(max, { error: 'too_long' })
const linkUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === '' || checkLinkUrl(value).ok, { error: 'url_invalid' })

export const DEFAULT_AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'anthropic-ai',
  'Claude-Web',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
  'PerplexityBot',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
  'FacebookBot',
  'cohere-ai',
  'Diffbot',
  'Omgilibot',
  'ImagesiftBot',
  'Timpibot',
]

export const profileSchema = z.object({
  displayName: text(60).default(''),
  handle: text(40).default(''),
  bio: text(160).default(''),
  avatar: mediaIdField.nullable().default(null),
  social: z
    .array(z.object({ id: idField, label: text(40), url: linkUrl, icon: iconField }))
    .max(12)
    .default([]),
})

export const footerSchema = z.object({
  notices: z.array(text(300)).max(5).default([]),
  note: text(300).default(''),
  showRevision: z.boolean().default(true),
})

const legalTarget = z.object({
  mode: z.enum(['page', 'url']).default('page'),
  url: linkUrl.default(''),
})

export const legalSchema = z.object({
  impressum: legalTarget.default({ mode: 'page', url: '' }),
  privacy: legalTarget.default({ mode: 'page', url: '' }),
  affiliateLabel: text(20).default('Anzeige'),
  affiliateNote: text(400).default(
    'Mit „Anzeige“ markierte Links sind Affiliate-Links. Kaufst du darüber ein, erhalte ich eine Provision. Für dich ändert sich der Preis nicht.',
  ),
})

export const analyticsSettingsSchema = z.object({
  mode: z.enum(['aggregate', 'visitors']).default('aggregate'),
  retentionDays: z.number().int().min(1).max(365).default(30),
  utmSource: text(40).default(''),
  utmMedium: text(40).default('link_in_bio'),
})

const internalPath = z
  .string()
  .trim()
  .max(120)
  .refine(
    (value) =>
      /^\/[a-z0-9][a-z0-9\-/]{0,100}$/.test(value) ||
      (value !== '' && !value.startsWith('//') && checkLinkUrl(value).ok),
    { error: 'url_invalid' },
  )

export const siteSchema = z.object({
  title: text(70).default(''),
  description: text(200).default(''),
  ogImage: mediaIdField.nullable().default(null),
  lang: z.enum(['de', 'en']).default('de'),
  aiCrawlers: z.array(text(64)).max(60).default(DEFAULT_AI_CRAWLERS),
  animatedImages: z.boolean().default(false),
  nav: z
    .array(z.object({ id: idField, label: text(40), href: internalPath, icon: iconField }))
    .max(6)
    .default([]),
})

export const GITHUB_REPOSITORY =
  /^https:\/\/github\.com\/([A-Za-z0-9_.-]{1,100})\/([A-Za-z0-9_.-]{1,100}?)(?:\.git)?\/?$/
export const BRANCH_PATTERN = /^(?!.*\.\.)[A-Za-z0-9._/-]{1,100}$/

const pathSlug = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => SLUG_PATTERN.test(value), { error: 'slug_format' })
  .refine((value) => !RESERVED_SLUGS.has(value), { error: 'reserved' })

export const referencesSchema = z
  .object({
    enabled: z.boolean().default(false),
    title: text(70).default('Quellenangaben'),
    intro: text(400).default(''),
    path: pathSlug.default('quellen'),
    aliases: z.array(pathSlug).max(5).default(['quellenangaben', 'sources']),
    repository: z
      .string()
      .trim()
      .max(240)
      .refine((value) => value === '' || GITHUB_REPOSITORY.test(value), {
        error: 'repository_invalid',
      })
      .default(''),
    branch: z
      .string()
      .trim()
      .refine((value) => BRANCH_PATTERN.test(value), { error: 'branch_invalid' })
      .default('main'),
  })
  .superRefine((value, ctx) => {
    const seen = new Set([value.path])
    value.aliases.forEach((alias, index) => {
      if (seen.has(alias))
        ctx.addIssue({ code: 'custom', path: ['aliases', index], message: 'taken' })
      seen.add(alias)
    })
  })

export const CALCULATOR_KEYS = ['calories', 'peptide', 'halflife'] as const
export type CalculatorKey = (typeof CALCULATOR_KEYS)[number]

const calculatorEntry = z.object({
  enabled: z.boolean().default(false),
  title: text(70).default(''),
  intro: text(600).default(''),
  content: z.string().trim().max(8000, { error: 'too_long' }).default(''),
})

export const calculatorsSchema = z.object({
  path: pathSlug.default('rechner'),
  indexTitle: text(70).default('Rechner'),
  indexIntro: text(600).default(''),
  calories: calculatorEntry.default({ enabled: false, title: '', intro: '', content: '' }),
  peptide: calculatorEntry.default({ enabled: false, title: '', intro: '', content: '' }),
  halflife: calculatorEntry.default({ enabled: false, title: '', intro: '', content: '' }),
})

export const settingsSchemas = {
  profile: profileSchema,
  theme: themeSchema,
  footer: footerSchema,
  legal: legalSchema,
  analytics: analyticsSettingsSchema,
  site: siteSchema,
  references: referencesSchema,
  calculators: calculatorsSchema,
}

export type SettingKey = keyof typeof settingsSchemas
export const SETTING_KEYS = Object.keys(settingsSchemas) as SettingKey[]
export type Settings = { [K in SettingKey]: z.output<(typeof settingsSchemas)[K]> }

export const PRIVACY_RELEVANT: Partial<Record<SettingKey, string[]>> = {
  analytics: ['mode', 'retentionDays'],
  legal: ['affiliateNote'],
}
