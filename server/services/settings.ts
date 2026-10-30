import { eq } from 'drizzle-orm'
import type { z } from 'zod'
import {
  PRIVACY_RELEVANT,
  SETTING_KEYS,
  settingsSchemas,
  type SettingKey,
  type Settings,
} from '../../shared/schemas/settings'
import { useDb } from '../db/client'
import { settings } from '../db/schema'
import { apiError } from '../utils/http'
import { recordAudit } from './audit'
import { kvSet, markDraftChanged } from './kv'

function parseOrDefault<K extends SettingKey>(key: K, value: unknown): Settings[K] {
  const schema = settingsSchemas[key] as unknown as z.ZodType<Settings[K]>
  const result = schema.safeParse(value ?? {})
  return result.success ? result.data : schema.parse({})
}

export function getSetting<K extends SettingKey>(key: K): Settings[K] {
  const row = useDb().select().from(settings).where(eq(settings.key, key)).get()
  return parseOrDefault(key, row?.draft)
}

export function getAllSettings(): Settings {
  const rows = new Map(
    useDb()
      .select()
      .from(settings)
      .all()
      .map((row) => [row.key, row.draft]),
  )
  return Object.fromEntries(
    SETTING_KEYS.map((key) => [key, parseOrDefault(key, rows.get(key))]),
  ) as Settings
}

function fieldIssues(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) fields[issue.path.join('.') || '_'] ??= issue.message
  return fields
}

export function writeSetting<K extends SettingKey>(key: K, value: Settings[K]): void {
  const now = Date.now()
  useDb()
    .insert(settings)
    .values({ key, draft: value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { draft: value, updatedAt: now } })
    .run()
}

export function saveSetting<K extends SettingKey>(
  key: K,
  input: unknown,
  userId: string | null,
): { value: Settings[K]; privacyReview: boolean } {
  const schema = settingsSchemas[key] as unknown as z.ZodType<Settings[K]>
  const result = schema.safeParse(input)
  if (!result.success) {
    throw apiError(422, 'validation_failed', 'Some fields are invalid', {
      fields: fieldIssues(result.error),
    })
  }
  const previous = getSetting(key) as Record<string, unknown>
  writeSetting(key, result.data)
  markDraftChanged()
  const relevant = PRIVACY_RELEVANT[key] ?? []
  const next = result.data as Record<string, unknown>
  const privacyReview = relevant.some(
    (field) => JSON.stringify(previous[field]) !== JSON.stringify(next[field]),
  )
  if (privacyReview) kvSet('privacy_review', '1')
  recordAudit(userId, 'update', 'settings', key)
  return { value: result.data, privacyReview }
}
