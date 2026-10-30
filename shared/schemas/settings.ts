import { z } from 'zod'
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

export const siteSchema = z.object({
  title: text(70).default(''),
  description: text(200).default(''),
  ogImage: mediaIdField.nullable().default(null),
  lang: z.enum(['de', 'en']).default('de'),
  aiCrawlers: z.array(text(64)).max(60).default(DEFAULT_AI_CRAWLERS),
  animatedImages: z.boolean().default(false),
})

export const settingsSchemas = {
  profile: profileSchema,
  theme: themeSchema,
  footer: footerSchema,
  legal: legalSchema,
  analytics: analyticsSettingsSchema,
  site: siteSchema,
}

export type SettingKey = keyof typeof settingsSchemas
export const SETTING_KEYS = Object.keys(settingsSchemas) as SettingKey[]
export type Settings = { [K in SettingKey]: z.output<(typeof settingsSchemas)[K]> }

export const PRIVACY_RELEVANT: Partial<Record<SettingKey, string[]>> = {
  analytics: ['mode', 'retentionDays'],
  legal: ['affiliateNote'],
}
