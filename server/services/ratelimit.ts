export interface LimitResult {
  allowed: boolean
  count: number
  retryAfterMs: number
}

export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>()

  constructor(
    readonly limit: number,
    readonly windowMs: number,
    private readonly maxKeys = 50_000,
  ) {}

  private recent(key: string, now: number): number[] {
    const list = this.hits.get(key)
    if (!list) return []
    const cutoff = now - this.windowMs
    let start = 0
    while (start < list.length && (list[start] ?? 0) <= cutoff) start++
    const kept = start === 0 ? list : list.slice(start)
    if (kept.length === 0) this.hits.delete(key)
    else if (kept !== list) this.hits.set(key, kept)
    return kept
  }

  private result(list: number[], now: number, allowed: boolean): LimitResult {
    const oldest = list[0]
    const retryAfterMs =
      allowed || oldest === undefined ? 0 : Math.max(0, oldest + this.windowMs - now)
    return { allowed, count: list.length, retryAfterMs }
  }

  peek(key: string, now = Date.now()): LimitResult {
    const list = this.recent(key, now)
    return this.result(list, now, list.length < this.limit)
  }

  hit(key: string, now = Date.now()): LimitResult {
    const list = this.recent(key, now)
    if (list.length >= this.limit) return this.result(list, now, false)
    const next = [...list, now]
    this.hits.delete(key)
    this.hits.set(key, next)
    if (this.hits.size > this.maxKeys) {
      const oldestKey = this.hits.keys().next().value
      if (oldestKey !== undefined) this.hits.delete(oldestKey)
    }
    return this.result(next, now, true)
  }

  reset(key: string): void {
    this.hits.delete(key)
  }

  clear(): void {
    this.hits.clear()
  }

  get size(): number {
    return this.hits.size
  }
}
