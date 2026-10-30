import { type ChildProcess, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { request } from 'node:http'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const ENTRY = resolve('.output/server/index.mjs')

export interface TestServer {
  port: number
  origin: string
  dataDir: string
  logs: string[]
  stop: () => Promise<void>
}

async function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => {
        if (address && typeof address === 'object') resolvePort(address.port)
        else reject(new Error('No port'))
      })
    })
  })
}

export async function startServer(env: Record<string, string> = {}): Promise<TestServer> {
  if (!existsSync(ENTRY)) throw new Error('Run pnpm build before the integration tests')
  const port = await freePort()
  const origin = `http://127.0.0.1:${port}`
  const dataDir = env.DATA_DIR ?? mkdtempSync(join(tmpdir(), 'wsl-it-'))
  const logs: string[] = []
  const child: ChildProcess = spawn(process.execPath, [ENTRY], {
    env: {
      PATH: process.env.PATH ?? '',
      NODE_ENV: 'test',
      PORT: String(port),
      HOST: '127.0.0.1',
      PUBLIC_ORIGIN: origin,
      ALIAS_ORIGINS: `http://alias.test:${port}`,
      APP_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      ANALYTICS_HMAC_KEY: randomBytes(32).toString('base64'),
      SECURITY_CONTACT: 'mailto:security@example.com',
      TRUSTED_PROXIES: 'loopback',
      DATA_DIR: dataDir,
      MIGRATIONS_DIR: resolve('server/db/migrations'),
      LOG_LEVEL: 'debug',
      TZ: 'Europe/Berlin',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout?.on('data', (chunk: Buffer) =>
    logs.push(...chunk.toString().split('\n').filter(Boolean)),
  )
  child.stderr?.on('data', (chunk: Buffer) =>
    logs.push(...chunk.toString().split('\n').filter(Boolean)),
  )

  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited early:\n${logs.join('\n')}`)
    const ok = await new Promise<boolean>((done) => {
      const req = request({ host: '127.0.0.1', port, path: '/healthz' }, (res) => {
        res.resume()
        done(res.statusCode === 200)
      })
      req.on('error', () => done(false))
      req.end()
    })
    if (ok) break
    await new Promise((wait) => setTimeout(wait, 100))
  }

  return {
    port,
    origin,
    dataDir,
    logs,
    stop: async () => {
      if (child.exitCode === null) {
        const exited = new Promise((done) => child.once('exit', done))
        child.kill('SIGTERM')
        await exited
      }
      if (!env.DATA_DIR) rmSync(dataDir, { recursive: true, force: true })
    },
  }
}
