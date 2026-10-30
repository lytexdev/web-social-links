import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const bundled = new URL('../.output/server/index.mjs', import.meta.url)
const bundledModules = join(dirname(fileURLToPath(bundled)), 'node_modules')
const useBundle = existsSync(bundled)

export const runtimeRequire = createRequire(useBundle ? bundled : import.meta.url)

function esmEntry(exportsField) {
  if (typeof exportsField === 'string') return exportsField
  const root = exportsField?.['.'] ?? exportsField
  const node = root?.node ?? root
  const target = node?.import ?? node?.default ?? root?.import ?? root?.default
  return typeof target === 'string' ? target : target?.default
}

export async function runtimeImport(name) {
  if (!useBundle) return import(name)
  const directory = join(bundledModules, name)
  const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))
  const entry = esmEntry(manifest.exports) ?? manifest.module ?? manifest.main
  return import(pathToFileURL(join(directory, entry)).href)
}

export function databasePath() {
  const dataDir =
    process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? '/data' : './data')
  const file = join(dataDir, 'app.sqlite')
  if (!existsSync(file)) {
    process.stderr.write(`No database at ${file}. Set DATA_DIR or start the app once.\n`)
    process.exit(1)
  }
  return { dataDir, file }
}
