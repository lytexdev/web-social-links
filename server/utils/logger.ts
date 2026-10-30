type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const REDACTED_KEY =
  /pass(word|wd|phrase)?|secret|token|cookie|authorization|session|totp|otp|recovery|credential|private|^key$|body/i
const MAX_DEPTH = 4
const MAX_STRING = 2000

type Fields = Record<string, unknown>

function isLevel(value: unknown): value is Level {
  return typeof value === 'string' && value in LEVELS
}

function threshold(): number {
  const configured = process.env.LOG_LEVEL
  return LEVELS[isLevel(configured) ? configured : 'info']
}

export function sanitize(value: unknown, depth = 0): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: sanitize(value.message, depth + 1) }
  }
  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}...` : value
  }
  if (typeof value === 'bigint') return value.toString()
  if (value === null || typeof value !== 'object') return value
  if (depth >= MAX_DEPTH) return '[depth]'
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item, depth + 1))
  if (Buffer.isBuffer(value)) return '[buffer]'
  const result: Fields = {}
  for (const [key, entry] of Object.entries(value)) {
    result[key] = REDACTED_KEY.test(key) ? '[redacted]' : sanitize(entry, depth + 1)
  }
  return result
}

function write(level: Level, evt: string, fields?: Fields): void {
  if (LEVELS[level] < threshold()) return
  const record = {
    ts: new Date().toISOString(),
    level,
    evt,
    ...(fields ? (sanitize(fields) as Fields) : {}),
  }
  process.stdout.write(`${JSON.stringify(record)}\n`)
}

export const logger = {
  debug: (evt: string, fields?: Fields) => write('debug', evt, fields),
  info: (evt: string, fields?: Fields) => write('info', evt, fields),
  warn: (evt: string, fields?: Fields) => write('warn', evt, fields),
  error: (evt: string, fields?: Fields) => write('error', evt, fields),
}
