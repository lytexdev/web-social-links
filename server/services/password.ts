import { hash, hashSync, verify } from '@node-rs/argon2'
import { dictionary } from '@zxcvbn-ts/language-common'
import { PASSWORD_MAX, PASSWORD_MIN } from '../../shared/constants/limits'
import { randomToken } from './crypto'

export const ARGON2_PARAMS = {
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
} as const

const MAX_CONCURRENT = 2
let running = 0
const waiting: Array<() => void> = []

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve))
  running++
  try {
    return await task()
  } finally {
    running--
    waiting.shift()?.()
  }
}

export function hashPassword(password: string): Promise<string> {
  return withSlot(() => hash(password, ARGON2_PARAMS))
}

export function hashPasswordAtStartup(password: string): string {
  return hashSync(password, ARGON2_PARAMS)
}

let dummyHash: Promise<string> | null = null

function getDummyHash(): Promise<string> {
  dummyHash ??= hash(randomToken(), ARGON2_PARAMS)
  return dummyHash
}

export interface VerifyResult {
  valid: boolean
  needsRehash: boolean
}

export async function verifyPassword(
  stored: string | null,
  password: string,
): Promise<VerifyResult> {
  const target = stored ?? (await getDummyHash())
  const valid = await withSlot(async () => {
    try {
      return await verify(target, password)
    } catch {
      return false
    }
  })
  return { valid: valid && stored !== null, needsRehash: stored !== null && needsRehash(stored) }
}

export function needsRehash(stored: string): boolean {
  const expected = `$argon2id$v=19$m=${ARGON2_PARAMS.memoryCost},t=${ARGON2_PARAMS.timeCost},p=${ARGON2_PARAMS.parallelism}$`
  return !stored.startsWith(expected)
}

const commonPasswords = new Set(
  (dictionary['passwords-common'] as readonly string[]).map((entry) => entry.toLowerCase()),
)

export type PasswordIssue =
  'too_short' | 'too_long' | 'common' | 'matches_username' | 'matches_initial'

export function checkPasswordPolicy(
  password: string,
  context: { username: string; initialPassword: string },
): PasswordIssue | null {
  const length = [...password].length
  if (length < PASSWORD_MIN) return 'too_short'
  if (length > PASSWORD_MAX) return 'too_long'
  const lowered = password.toLowerCase()
  if (lowered === context.username.toLowerCase()) return 'matches_username'
  if (password === context.initialPassword) return 'matches_initial'
  if (commonPasswords.has(lowered)) return 'common'
  return null
}
