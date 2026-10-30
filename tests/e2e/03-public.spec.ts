import { expect, test } from '@playwright/test'
import { expectAccessible, login } from './fixtures'

const ROUTES = ['/', '/ig', '/impressum', '/datenschutz']

test('adds a discount code and republishes', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Block einfügen' }).click()
  await page
    .getByRole('listbox')
    .last()
    .getByRole('option', { name: /^Rabattcode / })
    .click()
  const toggle = page.getByRole('button', { name: /^Ohne Titel Rabattcode/, expanded: true })
  const editor = page.locator(`#${await toggle.getAttribute('aria-controls')}`)
  await editor.getByRole('textbox', { name: 'Beschriftung' }).fill('Rabattcode bei Partnern')
  await editor.getByRole('textbox', { name: 'Code', exact: true }).fill('LYTEX')
  await expect(page.getByRole('status').filter({ hasText: 'Entwurf gespeichert' })).toBeVisible()
  await page.getByRole('button', { name: 'Veröffentlichen' }).click()
  await page.getByRole('button', { name: 'Jetzt veröffentlichen' }).click()
  await expect(page.getByText(/Revision \d+ ist live/)).toBeVisible()
})

test.describe('public pages', () => {
  for (const route of ROUTES) {
    test(`${route} sets no cookies, uses no storage and loads only from its own origin`, async ({
      page,
      context,
      baseURL,
    }) => {
      const origin = new URL(baseURL ?? '').origin
      const requests: string[] = []
      const headers: Array<{ url: string; robots: string | undefined }> = []
      page.on('request', (request) => requests.push(request.url()))
      page.on('response', (response) =>
        headers.push({ url: response.url(), robots: response.headers()['x-robots-tag'] }),
      )
      const response = await page.goto(route)
      expect(response?.status()).toBe(200)
      await page.waitForLoadState('networkidle')
      expect(await context.cookies()).toEqual([])
      const storage = await page.evaluate(() => ({
        local: localStorage.length,
        session: sessionStorage.length,
      }))
      expect(storage).toEqual({ local: 0, session: 0 })
      expect(requests.filter((url) => !url.startsWith(origin) && !url.startsWith('data:'))).toEqual(
        [],
      )
      for (const entry of headers)
        expect(entry.robots, entry.url).toBe(
          'noindex, nofollow, noarchive, nosnippet, noimageindex',
        )
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, nofollow',
      )
      const scripts = await page
        .locator('script')
        .evaluateAll((elements) => elements.map((element) => element.getAttribute('src')))
      expect(scripts.filter((src) => src !== '/js/enhance.js')).toEqual([])
      expect(await page.evaluate(() => 'useNuxtApp' in window || '__NUXT__' in window)).toBe(false)
      await expectAccessible(page)
    })
  }

  test('reflows at 320 CSS pixels without horizontal scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    for (const route of ROUTES) {
      await page.goto(route)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, route).toBeLessThanOrEqual(0)
    }
  })

  test('marks affiliate links in their accessible name and enables the copy button', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /Omega 3.*Anzeige/ })).toBeVisible()
    await expect(
      page.getByText('Mit „Anzeige“ markierte Links sind Affiliate-Links', { exact: false }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Kopieren' })).toBeVisible()
    await expect(page.getByText('LYTEX', { exact: true })).toBeVisible()
  })

  test('keeps the copy button hidden and the code selectable without JavaScript', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Kopieren' })).toBeHidden()
    await expect(page.getByText('LYTEX', { exact: true })).toBeVisible()
    await context.close()
  })

  test('renders a designed 404 without stack traces', async ({ page }) => {
    const response = await page.goto('/does-not-exist')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nicht gefunden')
    const text = await page.locator('body').innerText()
    expect(text).not.toMatch(/\bat\s+\S+\s+\(|node_modules|\.mjs|H3Error/)
    await expectAccessible(page)
  })
})
