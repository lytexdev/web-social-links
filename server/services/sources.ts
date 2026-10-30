import { asc, eq } from 'drizzle-orm'
import { DIRECT_SOURCE, PLATFORM_PRESETS } from '../../shared/constants/platforms'
import { RESERVED_SLUGS } from '../../shared/constants/routing'
import { useDb } from '../db/client'
import { slugs, sources } from '../db/schema'
import { apiError } from '../utils/http'
import { recordAudit } from './audit'

export type SourceRow = typeof sources.$inferSelect
export type SlugRow = typeof slugs.$inferSelect

export function seedSources(): void {
  const db = useDb()
  if (db.select().from(sources).limit(1).all().length > 0) return
  const now = Date.now()
  db.transaction(() => {
    for (const preset of PLATFORM_PRESETS) {
      db.insert(sources)
        .values({
          key: preset.key,
          label: preset.label,
          icon: preset.icon,
          preset: true,
          createdAt: now,
        })
        .run()
      if (!RESERVED_SLUGS.has(preset.slug)) {
        db.insert(slugs)
          .values({
            slug: preset.slug,
            kind: 'source',
            sourceKey: preset.key,
            linkId: null,
            label: preset.label,
            createdAt: now,
          })
          .onConflictDoNothing()
          .run()
      }
    }
  })
}

export function listSources(): SourceRow[] {
  return useDb().select().from(sources).orderBy(asc(sources.label)).all()
}

export function sourceKeys(): Set<string> {
  return new Set([DIRECT_SOURCE, ...listSources().map((row) => row.key)])
}

export function createSource(
  input: { key: string; label: string; icon: string | null },
  userId: string,
): SourceRow {
  if (input.key === DIRECT_SOURCE)
    throw apiError(409, 'source_reserved', 'This key is reserved', { fields: { key: 'reserved' } })
  const exists = useDb().select().from(sources).where(eq(sources.key, input.key)).get()
  if (exists) throw apiError(409, 'source_taken', 'This key is taken', { fields: { key: 'taken' } })
  const row: SourceRow = { ...input, preset: false, createdAt: Date.now() }
  useDb().insert(sources).values(row).run()
  recordAudit(userId, 'create', 'source', input.key)
  return row
}

export function updateSource(
  key: string,
  patch: { label?: string; icon?: string | null },
  userId: string,
): void {
  const updated = useDb().update(sources).set(patch).where(eq(sources.key, key)).run()
  if (updated.changes === 0) throw apiError(404, 'not_found', 'Source not found')
  recordAudit(userId, 'update', 'source', key)
}

export function deleteSource(key: string, userId: string): void {
  const removed = useDb().delete(sources).where(eq(sources.key, key)).run()
  if (removed.changes === 0) throw apiError(404, 'not_found', 'Source not found')
  recordAudit(userId, 'delete', 'source', key)
}

export function listSlugs(): SlugRow[] {
  return useDb().select().from(slugs).orderBy(asc(slugs.slug)).all()
}

export function findSlug(slug: string): SlugRow | undefined {
  return useDb().select().from(slugs).where(eq(slugs.slug, slug)).get()
}

export function createSlug(
  input:
    | { kind: 'source'; slug: string; sourceKey: string; label: string }
    | { kind: 'redirect'; slug: string; linkId: string; label: string },
  userId: string,
): SlugRow {
  if (RESERVED_SLUGS.has(input.slug)) {
    throw apiError(409, 'slug_reserved', 'This slug is reserved', { fields: { slug: 'reserved' } })
  }
  const existing = findSlug(input.slug)
  if (existing) {
    const target = existing.kind === 'source' ? existing.sourceKey : existing.linkId
    throw apiError(409, 'slug_taken', `/${input.slug} already points to ${target}`, {
      fields: { slug: `taken:${existing.label || target}` },
    })
  }
  if (
    input.kind === 'source' &&
    !useDb().select().from(sources).where(eq(sources.key, input.sourceKey)).get()
  ) {
    throw apiError(422, 'validation_failed', 'Unknown source', { fields: { sourceKey: 'invalid' } })
  }
  const row: SlugRow = {
    slug: input.slug,
    kind: input.kind,
    sourceKey: input.kind === 'source' ? input.sourceKey : null,
    linkId: input.kind === 'redirect' ? input.linkId : null,
    label: input.label,
    createdAt: Date.now(),
  }
  useDb().insert(slugs).values(row).run()
  recordAudit(userId, 'create', 'slug', input.slug)
  return row
}

export function deleteSlug(slug: string, userId: string): void {
  const removed = useDb().delete(slugs).where(eq(slugs.slug, slug)).run()
  if (removed.changes === 0) throw apiError(404, 'not_found', 'Slug not found')
  recordAudit(userId, 'delete', 'slug', slug)
}
