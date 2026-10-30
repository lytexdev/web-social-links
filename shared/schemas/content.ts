import { z } from 'zod'
import { ICON_REF_PATTERN } from '../constants/icons'
import { SLUG_PATTERN } from '../constants/routing'
import { checkLinkUrl } from '../utils/url-policy'

export const BLOCK_TYPES = [
  'link',
  'tile',
  'group',
  'text',
  'heading',
  'image',
  'code',
  'notice',
  'divider',
  'spacer',
] as const
export type BlockType = (typeof BLOCK_TYPES)[number]
export const GROUP_CHILD_TYPES: readonly BlockType[] = ['link', 'tile']

export const idField = z.string().regex(/^[A-Za-z0-9_-]{12}$/, { error: 'invalid' })
export const mediaIdField = idField
export const iconField = z.string().regex(ICON_REF_PATTERN, { error: 'invalid' })

function text(max: number, strict: boolean, required = false) {
  const base = z.string().trim().max(max, { error: 'too_long' })
  return strict && required ? base.min(1, { error: 'required' }) : base
}

function url(strict: boolean) {
  return z
    .string()
    .trim()
    .max(2048, { error: 'too_long' })
    .refine((value) => (!strict && value === '') || checkLinkUrl(value).ok, {
      error: (issue) => {
        const value = typeof issue.input === 'string' ? issue.input : ''
        if (value === '') return 'required'
        const result = checkLinkUrl(value)
        return result.ok ? 'invalid' : `url_${result.reason}`
      },
    })
}

function optionalUrl(strict: boolean) {
  return z
    .string()
    .trim()
    .max(2048, { error: 'too_long' })
    .refine((value) => value === '' || !strict || checkLinkUrl(value).ok, { error: 'url_invalid' })
    .default('')
}

function buildBlockSchemas(strict: boolean) {
  const media = strict ? mediaIdField : mediaIdField.or(z.literal(''))
  return {
    link: z.object({
      title: text(80, strict, true),
      subtitle: text(120, strict).default(''),
      url: url(strict),
      variant: z.enum(['plain', 'icon', 'thumbnail', 'featured']).default('icon'),
      icon: iconField.nullable().default(null),
      thumbnail: mediaIdField.nullable().default(null),
      affiliate: z.boolean().default(false),
      badge: text(24, strict).default(''),
      appendUtm: z.boolean().default(false),
      newTab: z.boolean().default(false),
      brandColor: z.boolean().default(false),
    }),
    tile: z.object({
      label: text(60, strict, true),
      url: url(strict),
      image: mediaIdField.nullable().default(null),
      icon: iconField.nullable().default(null),
      affiliate: z.boolean().default(false),
      newTab: z.boolean().default(false),
    }),
    group: z.object({
      title: text(60, strict).default(''),
      layout: z.enum(['list', 'grid-2', 'grid-3', 'icons']).default('list'),
      collapsible: z.boolean().default(false),
      open: z.boolean().default(true),
    }),
    text: z.object({ markdown: z.string().max(2000, { error: 'too_long' }).default('') }),
    heading: z.object({
      text: text(80, strict, true),
      level: z.union([z.literal(2), z.literal(3)]).default(2),
    }),
    image: z.object({
      media: media,
      alt: text(200, strict).default(''),
      decorative: z.boolean().default(false),
      caption: text(200, strict).default(''),
      url: optionalUrl(strict),
      newTab: z.boolean().default(false),
    }),
    code: z.object({
      label: text(60, strict, true),
      code: text(40, strict, true),
      partner: text(60, strict).default(''),
      url: optionalUrl(strict),
      affiliate: z.boolean().default(false),
    }),
    notice: z.object({
      title: text(60, strict).default(''),
      markdown: z.string().max(1000, { error: 'too_long' }).default(''),
      tone: z.enum(['info', 'warning']).default('info'),
    }),
    divider: z.object({}),
    spacer: z.object({ size: z.enum(['sm', 'md', 'lg']).default('md') }),
  } satisfies Record<BlockType, z.ZodType>
}

export const draftBlockData = buildBlockSchemas(false)
export const strictBlockData = buildBlockSchemas(true)

export type BlockDataMap = { [K in BlockType]: z.output<(typeof strictBlockData)[K]> }

export const blockTypeField = z.enum(BLOCK_TYPES)

const timestamp = z.number().int().min(0).max(4_102_444_800_000).nullable()

export const blockCreateSchema = z.object({
  type: blockTypeField,
  parentId: idField.nullable().default(null),
  index: z.number().int().min(0).max(500).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
})

export const blockUpdateSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  visible: z.boolean().optional(),
  visibleFrom: timestamp.optional(),
  visibleUntil: timestamp.optional(),
})

export const blockOrderSchema = z.object({
  order: z
    .array(z.object({ id: idField, children: z.array(idField).max(100).default([]) }))
    .max(300),
})

export interface BlockNode {
  id: string
  parentId: string | null
  type: BlockType
  position: number
  data: Record<string, unknown>
  visible: boolean
  visibleFrom: number | null
  visibleUntil: number | null
  children: BlockNode[]
}

export const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(SLUG_PATTERN, { error: 'slug_format' })

export const pageInputSchema = z.object({
  slug: slugField,
  title: z.string().trim().min(1, { error: 'required' }).max(80, { error: 'too_long' }),
  markdown: z.string().max(50_000, { error: 'too_long' }).default(''),
})

export const pageUpdateSchema = pageInputSchema.partial()

export const sourceInputSchema = z.object({
  key: slugField,
  label: z.string().trim().min(1, { error: 'required' }).max(40, { error: 'too_long' }),
  icon: iconField.nullable().default(null),
})

export const slugInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('source'),
    slug: slugField,
    sourceKey: slugField,
    label: z.string().trim().max(60).default(''),
  }),
  z.object({
    kind: z.literal('redirect'),
    slug: slugField,
    linkId: idField,
    label: z.string().trim().max(60).default(''),
  }),
])
