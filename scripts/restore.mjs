import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { runtimeImport, runtimeRequire } from './runtime-modules.mjs'

const Database = runtimeRequire('better-sqlite3')
const { unzipSync } = await runtimeImport('fflate')

const source = process.argv[2]
const dataDir = resolve(
  process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? '/data' : './data'),
)
if (!source || !existsSync(join(source, 'app.sqlite')) || !existsSync(join(source, 'media.zip'))) {
  process.stderr.write(
    'usage: node scripts/restore.mjs <backup directory with app.sqlite and media.zip>\n',
  )
  process.exit(2)
}

const check = new Database(join(source, 'app.sqlite'), { readonly: true })
const integrity = check.pragma('integrity_check', { simple: true })
check.close()
if (integrity !== 'ok') {
  process.stderr.write(`The backup database failed the integrity check: ${integrity}\n`)
  process.exit(1)
}

const files = unzipSync(new Uint8Array(readFileSync(join(source, 'media.zip'))))
const mediaDir = join(dataDir, 'media')
const staging = join(dataDir, `media.restore-${Date.now()}`)
mkdirSync(staging, { recursive: true, mode: 0o750 })
for (const [name, content] of Object.entries(files)) {
  if (basename(name) !== name) continue
  writeFileSync(join(staging, name), content, { mode: 0o640 })
}

for (const suffix of ['', '-wal', '-shm'])
  rmSync(join(dataDir, `app.sqlite${suffix}`), { force: true })
writeFileSync(join(dataDir, 'app.sqlite'), readFileSync(join(source, 'app.sqlite')), {
  mode: 0o640,
})
rmSync(mediaDir, { recursive: true, force: true })
renameSync(staging, mediaDir)

process.stdout.write(
  `Restored ${Object.keys(files).length} media files and the database into ${dataDir}\n`,
)
