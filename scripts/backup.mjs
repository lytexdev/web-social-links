import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { databasePath, runtimeImport, runtimeRequire } from './runtime-modules.mjs'

const Database = runtimeRequire('better-sqlite3')
const { zipSync } = await runtimeImport('fflate')

const { dataDir, file } = databasePath()
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-')
const target = join(dataDir, 'backups', `backup-${stamp}`)
mkdirSync(target, { recursive: true, mode: 0o750 })

const db = new Database(file, { readonly: true, fileMustExist: true })
await db.backup(join(target, 'app.sqlite'))
db.close()

const mediaDir = join(dataDir, 'media')
const entries = {}
for (const name of readdirSync(mediaDir))
  entries[name] = new Uint8Array(readFileSync(join(mediaDir, name)))
writeFileSync(join(target, 'media.zip'), zipSync(entries, { level: 0 }))

process.stdout.write(`Backup written to ${target}\n`)
