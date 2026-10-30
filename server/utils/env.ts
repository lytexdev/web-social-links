import type { BlockList } from 'node:net'
import { z } from 'zod'
import { buildBlockList, parseCidr, type Cidr } from './cidr'
import { CLOUDFLARE_RANGES, LOOPBACK_RANGES, PRIVATE_RANGES } from './proxy-ranges'

const PROXY_PRESETS: Record<string, readonly string[]> = {
  private: PRIVATE_RANGES,
  loopback: LOOPBACK_RANGES,
  cloudflare: CLOUDFLARE_RANGES,
}

const HOST_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*(?::\d{1,5})?$/
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])$/
const HEADER_PATTERN = /^[a-z0-9-]{1,64}$/

function trimmed(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const result = value.trim()
  return result === '' ? undefined : result
}

function list(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function text<T extends z.ZodType>(schema: T) {
  return z.preprocess(trimmed, schema)
}

const requiredString = z.string({ error: 'is required' })

function originSchema(allowHttp: boolean) {
  return requiredString.transform((value, ctx) => {
    let url: URL
    try {
      url = new URL(value)
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'must be an absolute URL such as https://links.example.com',
      })
      return z.NEVER
    }
    const protocolOk = url.protocol === 'https:' || (allowHttp && url.protocol === 'http:')
    if (!protocolOk) {
      ctx.addIssue({ code: 'custom', message: 'must use https' })
      return z.NEVER
    }
    if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
      ctx.addIssue({
        code: 'custom',
        message: 'must be an origin without path, query or credentials',
      })
      return z.NEVER
    }
    return url.origin
  })
}

function keySchema(minBytes: number, exactBytes: boolean) {
  return requiredString.transform((value, ctx) => {
    const bytes = Buffer.from(value, 'base64')
    if (bytes.toString('base64') !== value) {
      ctx.addIssue({
        code: 'custom',
        message: 'must be standard base64, generate it with scripts/generate-secrets.sh',
      })
      return z.NEVER
    }
    if (exactBytes ? bytes.length !== minBytes : bytes.length < minBytes) {
      ctx.addIssue({
        code: 'custom',
        message: `must decode to ${exactBytes ? 'exactly' : 'at least'} ${minBytes} bytes, got ${bytes.length}`,
      })
      return z.NEVER
    }
    if (new Set(bytes).size < Math.min(16, bytes.length / 2)) {
      ctx.addIssue({ code: 'custom', message: 'is not random enough, generate a new value' })
      return z.NEVER
    }
    return bytes
  })
}

function cidrListSchema(allowPresets: boolean) {
  return z
    .string()
    .optional()
    .transform((value, ctx) => {
      const cidrs: Cidr[] = []
      for (const entry of list(value)) {
        const preset = allowPresets ? PROXY_PRESETS[entry.toLowerCase()] : undefined
        const sources = preset ?? [entry]
        for (const source of sources) {
          const cidr = parseCidr(source)
          if (!cidr) {
            const hint = allowPresets ? ', or one of private, loopback, cloudflare' : ''
            ctx.addIssue({
              code: 'custom',
              message: `"${entry}" is not an IP or CIDR range${hint}`,
            })
            return z.NEVER
          }
          cidrs.push(cidr)
        }
      }
      return cidrs
    })
}

function hostListSchema() {
  return z
    .string()
    .optional()
    .transform((value, ctx) => {
      const hosts = list(value).map((host) => host.toLowerCase())
      const invalid = hosts.find((host) => !HOST_PATTERN.test(host))
      if (invalid) {
        ctx.addIssue({ code: 'custom', message: `"${invalid}" is not a valid host name` })
        return z.NEVER
      }
      return hosts
    })
}

function originListSchema(allowHttp: boolean) {
  return z
    .string()
    .optional()
    .transform((value, ctx) => {
      const origins: string[] = []
      for (const entry of list(value)) {
        const parsed = originSchema(allowHttp).safeParse(entry)
        if (!parsed.success) {
          ctx.addIssue({
            code: 'custom',
            message: `"${entry}" ${parsed.error.issues[0]?.message ?? 'is invalid'}`,
          })
          return z.NEVER
        }
        origins.push(parsed.data)
      }
      return origins
    })
}

function intSchema(fallback: number, min: number, max: number) {
  return z.coerce
    .number({ error: 'must be a number' })
    .int({ error: 'must be a whole number' })
    .min(min, { error: `must be at least ${min}` })
    .max(max, { error: `must be at most ${max}` })
    .default(fallback)
}

function timeZoneSchema() {
  return z
    .string()
    .default('Europe/Berlin')
    .refine(
      (zone) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: zone })
          return true
        } catch {
          return false
        }
      },
      { error: 'must be an IANA time zone such as Europe/Berlin' },
    )
}

function contactSchema() {
  return z
    .string()
    .optional()
    .refine(
      (value) => value === undefined || /^(mailto:[^\s@]+@[^\s@]+|https:\/\/\S+)$/.test(value),
      {
        error: 'must be a mailto: or https: URI',
      },
    )
}

function buildSchema(production: boolean) {
  return z
    .object({
      NODE_ENV: text(z.enum(['production', 'development', 'test']).default('development')),
      PUBLIC_ORIGIN: text(originSchema(!production)),
      ALIAS_ORIGINS: text(originListSchema(!production)),
      ADMIN_ALLOWED_HOSTS: text(hostListSchema()),
      ADMIN_IP_ALLOWLIST: text(cidrListSchema(false)),
      TRUSTED_PROXIES: text(cidrListSchema(true)),
      PROXY_PEER_HEADER: text(
        z
          .string()
          .transform((value) => value.toLowerCase())
          .refine((value) => HEADER_PATTERN.test(value), { error: 'must be a header name' })
          .optional(),
      ),
      APP_ENCRYPTION_KEY: text(keySchema(32, true)),
      APP_ENCRYPTION_KEY_PREVIOUS: text(keySchema(32, true).optional()),
      ANALYTICS_HMAC_KEY: text(keySchema(32, false)),
      INITIAL_ADMIN_USERNAME: text(
        z
          .string()
          .default('admin')
          .transform((value) => value.toLowerCase())
          .refine((value) => USERNAME_PATTERN.test(value), {
            error: 'must be 3 to 32 characters of a-z, 0-9, dot, underscore or hyphen',
          }),
      ),
      INITIAL_ADMIN_PASSWORD: z
        .string()
        .optional()
        .transform((value) => (value === undefined || value === '' ? 'admin123' : value))
        .refine((value) => value.length <= 128, { error: 'must be at most 128 characters' }),
      TOTP_ISSUER: text(z.string().max(64, { error: 'must be at most 64 characters' }).optional()),
      SESSION_IDLE_MINUTES: text(intSchema(60, 5, 1440)),
      SESSION_MAX_HOURS: text(intSchema(24, 1, 720)),
      UPLOAD_MAX_MB: text(intSchema(10, 1, 50)),
      DATA_DIR: text(z.string().default(production ? '/data' : './data')),
      LOG_LEVEL: text(z.enum(['debug', 'info', 'warn', 'error']).default('info')),
      TZ: text(timeZoneSchema()),
      BAN_SCOPE: text(z.enum(['admin', 'all']).default('admin')),
      SECURITY_CONTACT: text(contactSchema()),
    })
    .superRefine((value, ctx) => {
      if (production && !value.SECURITY_CONTACT) {
        ctx.addIssue({
          code: 'custom',
          path: ['SECURITY_CONTACT'],
          message: 'is required in production',
        })
      }
      if (value.APP_ENCRYPTION_KEY_PREVIOUS?.equals(value.APP_ENCRYPTION_KEY)) {
        ctx.addIssue({
          code: 'custom',
          path: ['APP_ENCRYPTION_KEY_PREVIOUS'],
          message: 'must differ from APP_ENCRYPTION_KEY',
        })
      }
    })
}

export interface Env {
  production: boolean
  publicOrigin: string
  publicHost: string
  aliasHosts: ReadonlySet<string>
  adminHosts: ReadonlySet<string>
  adminIpAllowlist: BlockList | null
  trustsProxies: boolean
  trustedProxies: BlockList
  cloudflare: BlockList
  proxyPeerHeader: string | null
  encryptionKey: Buffer
  previousEncryptionKey: Buffer | null
  analyticsKey: Buffer
  initialAdminUsername: string
  initialAdminPassword: string
  totpIssuer: string
  sessionIdleMs: number
  sessionMaxMs: number
  uploadMaxBytes: number
  dataDir: string
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  timeZone: string
  banScope: 'admin' | 'all'
  securityContact: string | null
}

export type EnvResult = { ok: true; env: Env } | { ok: false; issues: string[] }

export function parseEnv(source: Record<string, string | undefined>): EnvResult {
  const production = trimmed(source.NODE_ENV) === 'production'
  const parsed = buildSchema(production).safeParse(source)
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join('.') || 'environment'} ${issue.message}`,
      ),
    }
  }
  const data = parsed.data
  const publicHost = new URL(data.PUBLIC_ORIGIN).host
  const adminHosts = data.ADMIN_ALLOWED_HOSTS.length > 0 ? data.ADMIN_ALLOWED_HOSTS : [publicHost]
  return {
    ok: true,
    env: {
      production,
      publicOrigin: data.PUBLIC_ORIGIN,
      publicHost,
      aliasHosts: new Set(data.ALIAS_ORIGINS.map((origin) => new URL(origin).host)),
      adminHosts: new Set(adminHosts),
      adminIpAllowlist:
        data.ADMIN_IP_ALLOWLIST.length > 0 ? buildBlockList(data.ADMIN_IP_ALLOWLIST) : null,
      trustsProxies: data.TRUSTED_PROXIES.length > 0,
      trustedProxies: buildBlockList(data.TRUSTED_PROXIES),
      cloudflare: buildBlockList(
        CLOUDFLARE_RANGES.map((range) => parseCidr(range)).filter((cidr) => cidr !== null),
      ),
      proxyPeerHeader: data.PROXY_PEER_HEADER ?? null,
      encryptionKey: data.APP_ENCRYPTION_KEY,
      previousEncryptionKey: data.APP_ENCRYPTION_KEY_PREVIOUS ?? null,
      analyticsKey: data.ANALYTICS_HMAC_KEY,
      initialAdminUsername: data.INITIAL_ADMIN_USERNAME,
      initialAdminPassword: data.INITIAL_ADMIN_PASSWORD,
      totpIssuer: data.TOTP_ISSUER ?? publicHost,
      sessionIdleMs: data.SESSION_IDLE_MINUTES * 60_000,
      sessionMaxMs: data.SESSION_MAX_HOURS * 3_600_000,
      uploadMaxBytes: data.UPLOAD_MAX_MB * 1_048_576,
      dataDir: data.DATA_DIR,
      logLevel: data.LOG_LEVEL,
      timeZone: data.TZ,
      banScope: data.BAN_SCOPE,
      securityContact: data.SECURITY_CONTACT ?? null,
    },
  }
}

let current: Env | null = null

export function initEnv(source: Record<string, string | undefined>): EnvResult {
  const result = parseEnv(source)
  if (result.ok) current = result.env
  return result
}

export function useEnv(): Env {
  if (!current) throw new Error('Environment accessed before validation')
  return current
}
