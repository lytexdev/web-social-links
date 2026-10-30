import { readFileSync } from 'node:fs'

const TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
]
const SUBJECT = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9-]+\\))?!?: \\S.*$`)
const BANNED_SUBJECT = /^(wip|fix stuff|update|misc changes?)$/i
const BANNED_TRAILER = /^(co-authored-by:|generated with|signed-off-by: .*\b(bot|ai)\b)/i

const path = process.argv[2]
if (!path) {
  process.stderr.write('usage: check-commit-msg.mjs <file>\n')
  process.exit(2)
}

const lines = readFileSync(path, 'utf8')
  .split('\n')
  .filter((line) => !line.startsWith('#'))
while (lines.length > 0 && lines.at(-1)?.trim() === '') lines.pop()

const errors = []
const subject = lines[0] ?? ''
const description = subject.replace(/^[^:]*:\s*/, '')

if (subject.startsWith('Merge ') || subject.startsWith('Revert "')) process.exit(0)
if (!SUBJECT.test(subject))
  errors.push(`subject must follow Conventional Commits: type(scope): summary`)
if (subject.length > 72) errors.push(`subject has ${subject.length} characters, limit is 72`)
if (BANNED_SUBJECT.test(description) || /\bwip\b/i.test(subject))
  errors.push('subject is not descriptive')
if (/\.$/.test(subject)) errors.push('subject must not end with a period')
if (lines.length > 1 && lines[1] !== '') errors.push('second line must be empty')

lines.forEach((line, index) => {
  if (/\p{Extended_Pictographic}/u.test(line)) errors.push(`line ${index + 1} contains an emoji`)
  if (BANNED_TRAILER.test(line)) errors.push(`line ${index + 1} contains a forbidden trailer`)
  if (index > 1 && line.length > 72 && !/^\S+:\/\/\S+$/.test(line.trim())) {
    errors.push(`line ${index + 1} has ${line.length} characters, wrap at 72`)
  }
})

if (errors.length > 0) {
  process.stderr.write(`${errors.join('\n')}\n`)
  process.exit(1)
}
