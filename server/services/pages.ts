import { asc, eq } from 'drizzle-orm'
import { RESERVED_SLUGS } from '../../shared/constants/routing'
import { useDb } from '../db/client'
import { pages } from '../db/schema'
import { apiError } from '../utils/http'
import { recordAudit } from './audit'
import { randomId } from './crypto'
import { markDraftChanged } from './kv'
import { IMPRESSUM_TEMPLATE, PRIVACY_TEMPLATE } from './legal-templates'

export type PageRow = typeof pages.$inferSelect
export const LEGAL_SLUGS = ['impressum', 'datenschutz'] as const

export function seedLegalPages(): void {
  const db = useDb()
  const now = Date.now()
  const seeds = [
    { slug: 'impressum', title: 'Impressum', markdown: IMPRESSUM_TEMPLATE },
    { slug: 'datenschutz', title: 'Datenschutzerklärung', markdown: PRIVACY_TEMPLATE },
  ]
  for (const seed of seeds) {
    db.insert(pages)
      .values({ id: randomId(), ...seed, kind: 'legal', createdAt: now, updatedAt: now })
      .onConflictDoNothing()
      .run()
  }
}

export function listPages(): PageRow[] {
  return useDb().select().from(pages).orderBy(asc(pages.kind), asc(pages.title)).all()
}

export function getPage(id: string): PageRow {
  const row = useDb().select().from(pages).where(eq(pages.id, id)).get()
  if (!row) throw apiError(404, 'not_found', 'Page not found')
  return row
}

export function getPageBySlug(slug: string): PageRow | undefined {
  return useDb().select().from(pages).where(eq(pages.slug, slug)).get()
}

function assertSlugFree(slug: string, exceptId?: string): void {
  if (RESERVED_SLUGS.has(slug) && !LEGAL_SLUGS.includes(slug as (typeof LEGAL_SLUGS)[number])) {
    throw apiError(409, 'slug_reserved', 'This slug is reserved', { fields: { slug: 'reserved' } })
  }
  const existing = getPageBySlug(slug)
  if (existing && existing.id !== exceptId) {
    throw apiError(409, 'slug_taken', 'This slug is taken', { fields: { slug: 'taken' } })
  }
}

export function createPage(
  input: { slug: string; title: string; markdown: string },
  userId: string,
): PageRow {
  assertSlugFree(input.slug)
  if (LEGAL_SLUGS.includes(input.slug as (typeof LEGAL_SLUGS)[number])) {
    throw apiError(409, 'slug_reserved', 'This slug is reserved', { fields: { slug: 'reserved' } })
  }
  const now = Date.now()
  const row: PageRow = { id: randomId(), ...input, kind: 'custom', createdAt: now, updatedAt: now }
  useDb().insert(pages).values(row).run()
  markDraftChanged()
  recordAudit(userId, 'create', 'page', row.id, input.slug)
  return row
}

export function updatePage(
  id: string,
  patch: { slug?: string; title?: string; markdown?: string },
  userId: string,
): PageRow {
  const row = getPage(id)
  if (patch.slug && patch.slug !== row.slug) {
    if (row.kind === 'legal') throw apiError(409, 'slug_locked', 'Legal pages keep their address')
    assertSlugFree(patch.slug, id)
  }
  useDb()
    .update(pages)
    .set({ ...patch, updatedAt: Date.now() })
    .where(eq(pages.id, id))
    .run()
  markDraftChanged()
  recordAudit(userId, 'update', 'page', id)
  return getPage(id)
}

export function deletePage(id: string, userId: string): void {
  const row = getPage(id)
  if (row.kind === 'legal') throw apiError(409, 'legal_page', 'Legal pages cannot be deleted')
  useDb().delete(pages).where(eq(pages.id, id)).run()
  markDraftChanged()
  recordAudit(userId, 'delete', 'page', id, row.slug)
}

export function replaceAllPages(
  rows: ReadonlyArray<Pick<PageRow, 'id' | 'slug' | 'title' | 'kind' | 'markdown'>>,
): void {
  const db = useDb()
  const now = Date.now()
  db.delete(pages).run()
  for (const row of rows)
    db.insert(pages)
      .values({ ...row, createdAt: now, updatedAt: now })
      .run()
}
