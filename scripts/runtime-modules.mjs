import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const bundled = new URL('../.output/server/index.mjs', import.meta.url)
export const runtimeRequire = createRequire(existsSync(bundled) ? bundled : import.meta.url)

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
