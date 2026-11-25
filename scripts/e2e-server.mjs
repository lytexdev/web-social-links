import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { zipSync } from 'fflate'

const port = process.env.E2E_PORT ?? '4310'
const dataDir = mkdtempSync(join(tmpdir(), 'wsl-e2e-'))
const fixtures = resolve('tests/fixtures/references')
const archive = zipSync(
  Object.fromEntries(
    readdirSync(fixtures, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const path = join(entry.parentPath, entry.name)
        return [`repo-main/${relative(fixtures, path)}`, readFileSync(path)]
      }),
  ),
)
const github = createServer((request, response) => {
  const found = request.url === '/beispiel/quellen/zip/refs/heads/main'
  response.writeHead(found ? 200 : 404, { 'content-type': 'application/zip' })
  response.end(found ? Buffer.from(archive) : undefined)
})
await new Promise((done) => github.listen(0, '127.0.0.1', done))

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
    DATA_DIR: dataDir,
    MIGRATIONS_DIR: resolve('server/db/migrations'),
    ANALYTICS_FLUSH_SECONDS: '1',
    REFERENCES_ARCHIVE_ORIGIN: `http://127.0.0.1:${github.address().port}`,
    LOG_LEVEL: 'warn',
  },
})

const stop = () => {
  child.kill('SIGTERM')
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
child.on('exit', (code) => {
  github.close()
  rmSync(dataDir, { recursive: true, force: true })
  process.exit(code ?? 0)
})
