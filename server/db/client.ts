import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database }

let instance: Db | null = null

export function openDatabase(file: string, migrationsFolder: string): Db {
  const sqlite = new Database(file)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('synchronous = NORMAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('busy_timeout = 5000')
  const db = drizzle({ client: sqlite, schema })
  migrate(db, { migrationsFolder })
  return db
}

export function setDb(db: Db | null): void {
  instance = db
}

export function useDb(): Db {
  if (!instance) throw new Error('Database accessed before it was opened')
  return instance
}

export function closeDatabase(): void {
  if (!instance) return
  instance.$client.pragma('wal_checkpoint(TRUNCATE)')
  instance.$client.close()
  instance = null
}
