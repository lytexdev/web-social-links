import { request } from 'node:http'
import type { TestServer } from './server'

export interface RawResponse {
  status: number
  headers: Record<string, string | string[] | undefined>
  text: string
  json: <T = Record<string, unknown>>() => T
}

export interface RequestOptions {
  method?: string
  body?: unknown
  rawBody?: Buffer | string
  headers?: Record<string, string>
  ip?: string
  host?: string
}

export function rawRequest(
  server: TestServer,
  path: string,
  options: RequestOptions = {},
): Promise<RawResponse> {
  const payload =
    options.rawBody ??
    (options.body === undefined ? undefined : Buffer.from(JSON.stringify(options.body)))
  const headers: Record<string, string> = {
    host: options.host ?? `127.0.0.1:${server.port}`,
    ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
    ...(payload !== undefined ? { 'content-length': String(Buffer.byteLength(payload)) } : {}),
    ...(options.ip ? { 'x-forwarded-for': options.ip } : {}),
    ...options.headers,
  }
  return new Promise((resolve, reject) => {
    const req = request(
      { host: '127.0.0.1', port: server.port, path, method: options.method ?? 'GET', headers },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            text,
            json: <T>() => JSON.parse(text) as T,
          })
        })
      },
    )
    req.on('error', reject)
    if (payload !== undefined) req.write(payload)
    req.end()
  })
}

export class AdminClient {
  cookie = ''
  csrf = ''

  constructor(
    readonly server: TestServer,
    readonly ip = '198.51.100.10',
  ) {}

  async send(path: string, options: RequestOptions = {}): Promise<RawResponse> {
    const method = options.method ?? (options.body === undefined ? 'GET' : 'POST')
    const mutating = !['GET', 'HEAD'].includes(method)
    const response = await rawRequest(this.server, path, {
      ...options,
      method,
      ip: options.ip ?? this.ip,
      headers: {
        ...(this.cookie ? { cookie: this.cookie } : {}),
        ...(mutating ? { origin: this.server.origin, 'x-csrf-token': this.csrf } : {}),
        ...options.headers,
      },
    })
    const setCookie = response.headers['set-cookie']
    for (const entry of setCookie ?? []) {
      const pair = entry.split(';')[0] ?? ''
      if (pair.endsWith('=')) this.cookie = ''
      else this.cookie = pair
    }
    return response
  }

  async refreshCsrf(): Promise<void> {
    const me = await this.send('/api/admin/auth/me')
    const body = me.json<{ csrfToken?: string }>()
    this.csrf = body.csrfToken ?? ''
  }

  async formToken(): Promise<string> {
    const response = await this.send('/api/admin/auth/form-token')
    const token = response.json<{ token: string }>().token
    await new Promise((wait) => setTimeout(wait, 850))
    return token
  }

  async login(username: string, password: string, formToken?: string): Promise<RawResponse> {
    const token = formToken ?? (await this.formToken())
    const response = await this.send('/api/admin/auth/login', {
      body: { username, password, website: '', formToken: token },
    })
    if (response.status === 200) await this.refreshCsrf()
    return response
  }
}
