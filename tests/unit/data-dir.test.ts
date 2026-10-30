import { chmodSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { prepareDataDir } from '../../server/utils/data-dir'

const created: string[] = []

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'wsl-data-'))
  created.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of created.splice(0)) {
    chmodSync(dir, 0o700)
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('prepareDataDir', () => {
  it('creates the subdirectories in a writable directory', () => {
    const dir = tempDir()
    expect(prepareDataDir(dir, false)).toBeNull()
    expect(existsSync(join(dir, 'media'))).toBe(true)
    expect(existsSync(join(dir, 'backups'))).toBe(true)
    expect(existsSync(join(dir, 'import'))).toBe(true)
  })

  it('reports a missing directory unless creation is allowed', () => {
    const dir = join(tempDir(), 'missing')
    expect(prepareDataDir(dir, false)).toBe('ENOENT')
    expect(prepareDataDir(dir, true)).toBeNull()
  })

  it.skipIf(process.getuid?.() === 0)('reports a read-only directory', () => {
    const dir = tempDir()
    chmodSync(dir, 0o500)
    expect(prepareDataDir(dir, false)).toBe('EACCES')
  })
})
