import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const port = process.env.E2E_PORT ?? '4310'
const dataDir = mkdtempSync(join(tmpdir(), 'wsl-e2e-'))

const child = spawn(process.execPath, [resolve('.output/server/index.mjs')], {
  stdio: 'inherit',
  env: {
    PATH: process.env.PATH ?? '',
    NODE_ENV: 'test',
    PORT: port,
    HOST: '127.0.0.1',
    PUBLIC_ORIGIN: `http://localhost:${port}`,
    APP_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    ANALYTICS_HMAC_KEY: randomBytes(32).toString('base64'),
    SECURITY_CONTACT: 'mailto:security@example.com',
    TRUSTED_PROXIES: 'loopback',
    DATA_DIR: dataDir,
    MIGRATIONS_DIR: resolve('server/db/migrations'),
    ANALYTICS_FLUSH_SECONDS: '1',
    LOG_LEVEL: 'warn',
  },
})

const stop = () => {
  child.kill('SIGTERM')
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
child.on('exit', (code) => {
  rmSync(dataDir, { recursive: true, force: true })
  process.exit(code ?? 0)
})
