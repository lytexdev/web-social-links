import { z } from 'zod'
import { BLOCK_TYPES, idField, slugField } from './content'

const blockRow = z.object({
  id: idField,
  parentId: idField.nullable(),
  type: z.enum(BLOCK_TYPES),
  position: z.number().int().min(0),
  data: z.record(z.string(), z.unknown()),
  visible: z.boolean().default(true),
  visibleFrom: z.number().int().nullable().default(null),
  visibleUntil: z.number().int().nullable().default(null),
})

export const exportSchema = z.object({
  format: z.literal('web-social-links'),
  version: z.literal(1),
  exportedAt: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).default({}),
  blocks: z.array(blockRow).max(500).default([]),
  pages: z
    .array(
      z.object({
        id: idField,
        slug: slugField,
        title: z.string().max(80),
        kind: z.enum(['legal', 'custom']),
        markdown: z.string().max(50_000),
      }),
    )
    .max(100)
    .default([]),
  sources: z
    .array(
      z.object({
        key: slugField,
        label: z.string().max(40),
        icon: z.string().max(100).nullable(),
        preset: z.boolean().default(false),
      }),
    )
    .max(200)
    .default([]),
  slugs: z
    .array(
      z.object({
        slug: slugField,
        kind: z.enum(['source', 'redirect']),
        sourceKey: slugField.nullable().default(null),
        linkId: idField.nullable().default(null),
        label: z.string().max(60).default(''),
      }),
    )
    .max(500)
    .default([]),
  media: z
    .array(
      z.object({
        id: idField,
        alt: z.string().max(200).default(''),
        decorative: z.boolean().default(false),
        file: z.string().max(100),
      }),
    )
    .max(1000)
    .default([]),
})

export type ExportData = z.infer<typeof exportSchema>
