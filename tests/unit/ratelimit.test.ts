import { describe, expect, it } from 'vitest'
import { SlidingWindowLimiter } from '../../server/services/ratelimit'

describe('SlidingWindowLimiter', () => {
  it('allows up to the limit inside the window and reports the wait', () => {
    const limiter = new SlidingWindowLimiter(3, 1000)
    expect(limiter.hit('a', 0).allowed).toBe(true)
    expect(limiter.hit('a', 100).allowed).toBe(true)
    expect(limiter.hit('a', 200).allowed).toBe(true)
    const blocked = limiter.hit('a', 300)
    expect(blocked).toEqual({ allowed: false, count: 3, retryAfterMs: 700 })
    expect(limiter.hit('a', 1001).allowed).toBe(true)
  })

  it('keeps keys independent and peek does not consume', () => {
    const limiter = new SlidingWindowLimiter(1, 1000)
    expect(limiter.peek('a', 0).allowed).toBe(true)
    expect(limiter.peek('a', 0).allowed).toBe(true)
    limiter.hit('a', 0)
    expect(limiter.peek('a', 10).allowed).toBe(false)
    expect(limiter.hit('b', 10).allowed).toBe(true)
  })

  it('evicts the oldest key when the size cap is reached', () => {
    const limiter = new SlidingWindowLimiter(5, 60_000, 2)
    limiter.hit('a', 0)
    limiter.hit('b', 1)
    limiter.hit('c', 2)
    expect(limiter.size).toBe(2)
    expect(limiter.peek('a', 3).count).toBe(0)
    expect(limiter.peek('c', 3).count).toBe(1)
  })
})
