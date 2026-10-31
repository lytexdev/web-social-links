import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

const SECRET_VERSION = 'v1'

export function randomId(bytes = 9): string {
  return randomBytes(bytes).toString('base64url')
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex')
}

export function hmac(key: Buffer, input: string): Buffer {
  return createHmac('sha256', key).update(input).digest()
}

export function hmacHex(key: Buffer, input: string): string {
  return hmac(key, input).toString('hex')
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) {
    timingSafeEqual(left, left)
    return false
  }
  return timingSafeEqual(left, right)
}

export function deriveKey(key: Buffer, purpose: string): Buffer {
  return hmac(key, `web-social-links:${purpose}`)
}

export function keyId(key: Buffer): string {
  return sha256Hex(key).slice(0, 8)
}

export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ])
  return [
    SECRET_VERSION,
    keyId(key),
    iv.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.')
}

export class SecretDecryptionError extends Error {
  constructor(reason: string) {
    super(`Secret could not be decrypted: ${reason}`)
    this.name = 'SecretDecryptionError'
  }
}

export function decryptSecret(token: string, key: Buffer): string {
  const [version, id, ivPart, payloadPart] = token.split('.')
  if (version !== SECRET_VERSION || !id || !ivPart || !payloadPart) {
    throw new SecretDecryptionError('unknown format')
  }
  if (id !== keyId(key)) throw new SecretDecryptionError('encrypted with another key')
  const payload = Buffer.from(payloadPart, 'base64url')
  if (payload.length < 17) throw new SecretDecryptionError('truncated payload')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64url'))
  decipher.setAuthTag(payload.subarray(payload.length - 16))
  try {
    return Buffer.concat([
      decipher.update(payload.subarray(0, payload.length - 16)),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    throw new SecretDecryptionError('authentication failed')
  }
}
