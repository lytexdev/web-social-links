import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger, sanitize } from '../../server/utils/logger'

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.LOG_LEVEL
})

function capture() {
  const lines: string[] = []
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    lines.push(String(chunk))
    return true
  })
  return lines
}

describe('logger', () => {
  it('writes one JSON line per record', () => {
    const lines = capture()
    logger.info('startup', { origin: 'https://links.example.com' })
    expect(lines).toHaveLength(1)
    const record = JSON.parse(lines[0] ?? '')
    expect(record).toMatchObject({
      level: 'info',
      evt: 'startup',
      origin: 'https://links.example.com',
    })
    expect(typeof record.ts).toBe('string')
  })

  it('respects LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'warn'
    const lines = capture()
    logger.info('ignored')
    logger.warn('kept')
    expect(lines).toHaveLength(1)
  })

  it('redacts sensitive keys at any depth', () => {
    expect(
      sanitize({
        user: 'admin',
        password: 'hunter2hunter2',
        nested: { sessionId: 'abc', csrfToken: 'def', totpCode: '123456', recoveryCode: 'x' },
        headers: { cookie: 'a=b', authorization: 'Bearer x' },
        body: { anything: true },
      }),
    ).toEqual({
      user: 'admin',
      password: '[redacted]',
      nested: {
        sessionId: '[redacted]',
        csrfToken: '[redacted]',
        totpCode: '[redacted]',
        recoveryCode: '[redacted]',
      },
      headers: { cookie: '[redacted]', authorization: '[redacted]' },
      body: '[redacted]',
    })
  })

  it('drops stacks from errors and truncates long strings', () => {
    const error = new Error('boom')
    expect(sanitize(error)).toEqual({ name: 'Error', message: 'boom' })
    expect(String(sanitize('x'.repeat(3000))).length).toBe(2003)
  })
})
