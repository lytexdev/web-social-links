import { eq, sql } from 'drizzle-orm'
import { useDb } from '../db/client'
import { kv } from '../db/schema'

export function kvGet(key: string): string | null {
  return useDb().select().from(kv).where(eq(kv.key, key)).get()?.value ?? null
}

export function kvSet(key: string, value: string): void {
  const now = Date.now()
  useDb()
    .insert(kv)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({ target: kv.key, set: { value, updatedAt: now } })
    .run()
}

export function markDraftChanged(): void {
  const now = Date.now()
  useDb()
    .insert(kv)
    .values({ key: 'draft_changes', value: '1', updatedAt: now })
    .onConflictDoUpdate({
      target: kv.key,
      set: { value: sql`CAST(CAST(${kv.value} AS INTEGER) + 1 AS TEXT)`, updatedAt: now },
    })
    .run()
}

export function draftChanges(): number {
  return Number(kvGet('draft_changes') ?? '0')
}
