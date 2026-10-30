import { randomBytes } from 'node:crypto'
import { sha256Hex } from './crypto'

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const RECOVERY_CODE_COUNT = 10

function encode(bytes: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  return output
}

export function generateRecoveryCode(): string {
  const raw = encode(randomBytes(10))
  return raw.match(/.{4}/g)?.join('-') ?? raw
}

export function normalizeRecoveryCode(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1')
  return /^[0-9A-HJKMNP-TV-Z]{16}$/.test(cleaned) ? cleaned : null
}

export function hashRecoveryCode(code: string): string | null {
  const normalized = normalizeRecoveryCode(code)
  return normalized ? sha256Hex(`recovery:${normalized}`) : null
}
