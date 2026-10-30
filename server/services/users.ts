import { count, eq } from 'drizzle-orm'
import { useDb } from '../db/client'
import { recoveryCodes, users } from '../db/schema'
import { logger } from '../utils/logger'
import { useEnv } from '../utils/env'
import { randomId } from './crypto'
import { hashPasswordAtStartup } from './password'
import { generateRecoveryCode, hashRecoveryCode, RECOVERY_CODE_COUNT } from './recovery-codes'

export type UserRow = typeof users.$inferSelect

export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])$/

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().slice(0, 64)
}

export function findUserByUsername(username: string): UserRow | undefined {
  return useDb()
    .select()
    .from(users)
    .where(eq(users.username, normalizeUsername(username)))
    .get()
}

export function getUser(id: string): UserRow | undefined {
  return useDb().select().from(users).where(eq(users.id, id)).get()
}

export function updateUser(id: string, changes: Partial<Omit<UserRow, 'id' | 'createdAt'>>): void {
  useDb()
    .update(users)
    .set({ ...changes, updatedAt: Date.now() })
    .where(eq(users.id, id))
    .run()
}

export function seedOwner(): 'created' | 'existing' {
  const db = useDb()
  const existing = db.select({ value: count() }).from(users).get()
  if ((existing?.value ?? 0) > 0) return 'existing'
  const env = useEnv()
  const now = Date.now()
  db.insert(users)
    .values({
      id: randomId(),
      username: env.initialAdminUsername,
      passwordHash: hashPasswordAtStartup(env.initialAdminPassword),
      mustChangePassword: true,
      passwordChangedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .run()
  return 'created'
}

export function warnAboutInitialCredentials(): void {
  const pending = useDb().select().from(users).where(eq(users.mustChangePassword, true)).all()
  for (const user of pending) {
    logger.warn('initial_credentials_active', {
      user: user.username,
      note: 'The owner account still uses its initial password. Log in at /admin and change it now.',
    })
  }
}

export function replaceRecoveryCodes(userId: string): string[] {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => generateRecoveryCode())
  const db = useDb()
  db.transaction((tx) => {
    tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId)).run()
    for (const code of codes) {
      const codeHash = hashRecoveryCode(code)
      if (!codeHash) throw new Error('Generated recovery code failed validation')
      tx.insert(recoveryCodes).values({ id: randomId(), userId, codeHash, usedAt: null }).run()
    }
  })
  return codes
}

export function remainingRecoveryCodes(userId: string): number {
  return useDb()
    .select()
    .from(recoveryCodes)
    .where(eq(recoveryCodes.userId, userId))
    .all()
    .filter((row) => row.usedAt === null).length
}
