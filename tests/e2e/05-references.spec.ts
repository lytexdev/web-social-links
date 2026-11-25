import { expect, test } from '@playwright/test'
import { expectAccessible, login } from './fixtures'

test('syncs the references repository and publishes the page', async ({ page }) => {
  await login(page)
  await page.waitForURL(/\/admin$/)
  await page.getByRole('link', { name: 'Quellenangaben' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Quellenangaben' })).toBeVisible()
  await expectAccessible(page)
  await page
    .getByRole('textbox', { name: 'GitHub-Repository' })
    .fill('https://github.com/beispiel/quellen')
  await page.getByRole('checkbox', { name: 'Quellenseite anzeigen' }).check()
  await page.getByRole('button', { name: 'Jetzt synchronisieren' }).click()
  await expect(page.getByText('2 Einträge, 2 neu, 0 geändert, 0 entfernt')).toBeVisible()
  const rows = page.getByRole('table').getByRole('row')
  await expect(rows).toHaveCount(3)
  await expect(page.getByText('Quelle 9 fehlt in der Quellenliste')).toBeVisible()
  await page.getByRole('button', { name: 'Veröffentlichen' }).click()
  await page.getByRole('button', { name: 'Jetzt veröffentlichen' }).click()
  await expect(page.getByText(/Revision \d+ ist live/)).toBeVisible()
})

test('the references overview filters live and works by keyboard', async ({ page }) => {
  await page.goto('/sources')
  await expect(page).toHaveURL(/\/quellen$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Quellenangaben' })).toBeVisible()
  await expectAccessible(page)
  const search = page.getByRole('searchbox', { name: 'Quellen durchsuchen' })
  await search.fill('halbwertszeit')
  await expect(page.getByRole('status')).toHaveText('1 Eintrag')
  await expect(page.getByRole('link', { name: /Koffein am Abend/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Schlaf verstehen/ })).toBeHidden()
  await search.fill('')
  await expect(page.getByRole('status')).toHaveText('2 Einträge')
  await page.getByRole('link', { name: /^Videos/ }).click()
  await expect(page).toHaveURL(/type=video/)
  await expect(page.getByRole('link', { name: /Koffein am Abend/ })).toHaveCount(0)
  await page.getByRole('link', { name: /Schlaf verstehen/ }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/quellen\/schlaf-grundlagen$/)
})

test('a references entry is accessible and links claims to their sources', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/quellen/schlaf-grundlagen')
  await expectAccessible(page)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
  await page.getByText('Was bedeuten die Evidenzstufen?').click()
  await expect(
    page.getByText('Die Aussage ist durch Studien widerlegt oder nicht belegt.'),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Quelle 2' }).click()
  await expect(page).toHaveURL(/#q-2$/)
  await expect(page.locator('#q-2')).toBeInViewport()
  expect(await page.evaluate(() => document.cookie)).toBe('')
})
