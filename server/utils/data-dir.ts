import { accessSync, constants, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'

export const DATA_SUBDIRECTORIES = ['media', 'backups', 'import'] as const

export function prepareDataDir(dataDir: string, create: boolean): string | null {
  try {
    if (create) mkdirSync(dataDir, { recursive: true, mode: 0o750 })
    accessSync(dataDir, constants.W_OK)
    const probe = join(dataDir, `.write-probe-${randomBytes(6).toString('hex')}`)
    writeFileSync(probe, '')
    rmSync(probe)
    for (const name of DATA_SUBDIRECTORIES)
      mkdirSync(join(dataDir, name), { recursive: true, mode: 0o750 })
    return null
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UNKNOWN'
    return code
  }
}
