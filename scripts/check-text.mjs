import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'

const SELF = 'scripts/check-text.mjs'
const BINARY = new Set([
  '.png',
  '.ico',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.gif',
  '.woff',
  '.woff2',
  '.sqlite',
])
const SKIPPED = new Set(['pnpm-lock.yaml', 'LICENSE'])
const HASH_COMMENT_FILES = new Set(['.sh', '.yaml', '.yml'])
const HASH_COMMENT_NAMES = new Set([
  'Dockerfile',
  '.env.example',
  '.gitignore',
  '.prettierignore',
  '.dockerignore',
])
const PROSE =
  /^(README|SECURITY|CONTRIBUTING|CHANGELOG|THIRD_PARTY_NOTICES)\.md$|^app\/i18n\/|^\.github\/.*\.md$/
const MARKETING = [
  'seamless',
  'seamlessly',
  'robust',
  'powerful',
  'blazing',
  'leverage',
  'leverages',
  'comprehensive',
  'elevate',
  'unlock',
  'nahtlos',
  'nahtlose',
  'leistungsstark',
  'leistungsstarke',
]

const checks = [
  { test: (line) => /\p{Extended_Pictographic}/u.test(line), message: 'emoji' },
  { test: (line) => /[\u2013\u2014]/.test(line), message: 'en or em dash, rephrase without it' },
]

function trackedFiles() {
  const output = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    {
      encoding: 'utf8',
    },
  )
  return output.split('\0').filter((file) => file.length > 0)
}

function commentPattern(file) {
  const extension = extname(file)
  if (extension === '.vue') return { regex: /<!--/, message: 'HTML comment' }
  if (extension === '.css') return { regex: /\/\*/, message: 'CSS comment' }
  if (HASH_COMMENT_FILES.has(extension) || HASH_COMMENT_NAMES.has(basename(file))) {
    return { regex: /^\s*#(?!!)/, message: 'comment' }
  }
  return null
}

const problems = []

for (const file of trackedFiles()) {
  if (BINARY.has(extname(file)) || SKIPPED.has(basename(file))) continue
  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  const comment = commentPattern(file)
  const prose = PROSE.test(file)
  const marketing = new RegExp(`\\b(${MARKETING.join('|')})\\b`, 'i')
  content.split('\n').forEach((line, index) => {
    const where = `${file}:${index + 1}`
    for (const check of checks) if (check.test(line)) problems.push(`${where} ${check.message}`)
    if (file !== SELF && /\b(TODO|FIXME|XXX|HACK)\b/.test(line))
      problems.push(`${where} task marker`)
    if (comment?.regex.test(line) && !(index === 0 && line.startsWith('# syntax='))) {
      problems.push(`${where} ${comment.message}`)
    }
    if (prose && marketing.test(line)) problems.push(`${where} marketing vocabulary`)
  })
}

if (problems.length > 0) {
  process.stderr.write(`${problems.join('\n')}\n`)
  process.exit(1)
}
