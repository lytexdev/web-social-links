import { cpSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const source = join(root, 'shared', 'calc')
const target = join(root, 'public', 'js', 'calc')

mkdirSync(target, { recursive: true })
const files = readdirSync(source).filter((name) => name.endsWith('.js'))
for (const name of files) cpSync(join(source, name), join(target, name))
process.stdout.write(`public modules: ${files.length} files\n`)
