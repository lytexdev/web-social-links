import { chromium, expect, test } from '@playwright/test'
import lighthouse from 'lighthouse'

const PORT = 9333
const KB = 1024

test('meets the Lighthouse scores and transfer budgets on mobile', async ({ baseURL }) => {
  test.setTimeout(120_000)
  const executablePath = process.env.CHROMIUM_PATH
  const browser = await chromium.launch({
    args: [`--remote-debugging-port=${PORT}`],
    ...(executablePath ? { executablePath } : {}),
  })
  try {
    const result = await lighthouse(`${baseURL}/`, {
      port: PORT,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices'],
    })
    expect(result).toBeDefined()
    const lhr = result?.lhr
    if (!lhr) return
    const score = (key: string) => Math.round((lhr.categories[key]?.score ?? 0) * 100)
    const failed = Object.values(lhr.audits)
      .filter(
        (audit) => audit.score !== null && audit.score < 1 && audit.scoreDisplayMode === 'binary',
      )
      .map((audit) => audit.id)
    expect(score('performance'), JSON.stringify(failed)).toBeGreaterThanOrEqual(95)
    expect(score('accessibility'), JSON.stringify(failed)).toBe(100)
    expect(score('best-practices'), JSON.stringify(failed)).toBe(100)
    expect(lhr.audits['largest-contentful-paint']?.numericValue ?? Infinity).toBeLessThan(1500)
    expect(lhr.audits['cumulative-layout-shift']?.numericValue ?? Infinity).toBeLessThan(0.05)

    const items =
      (
        lhr.audits['network-requests']?.details as
          { items?: Array<{ resourceType?: string; transferSize?: number }> } | undefined
      )?.items ?? []
    const size = (types: string[]) =>
      items
        .filter((item) => types.includes(item.resourceType ?? ''))
        .reduce((sum, item) => sum + (item.transferSize ?? 0), 0)
    expect(size(['Document', 'Stylesheet', 'Font'])).toBeLessThan(60 * KB)
    expect(size(['Script'])).toBeLessThan(2 * KB)
  } finally {
    await browser.close()
  }
})
