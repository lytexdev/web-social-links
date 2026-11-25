import { expect, test } from '@playwright/test'
import { expectAccessible, login } from './fixtures'

test('enables both calculators and publishes them', async ({ page }) => {
  await login(page)
  await page.waitForURL(/\/admin$/)
  await page.getByRole('link', { name: 'Rechner' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Rechner' })).toBeVisible()
  await expectAccessible(page)
  await page.getByRole('checkbox', { name: 'Rechner unter /rechner/kalorien anzeigen' }).check()
  await page.getByRole('textbox', { name: 'Titel', exact: true }).first().fill('Kalorienrechner')
  await page.getByRole('checkbox', { name: 'Rechner unter /rechner/peptide anzeigen' }).check()
  await page.getByRole('textbox', { name: 'Titel', exact: true }).last().fill('Peptid-Rechner')
  await page.getByRole('button', { name: 'Veröffentlichen' }).click()
  await page.getByRole('button', { name: 'Jetzt veröffentlichen' }).click()
  await expect(page.getByText(/Revision \d+ ist live/)).toBeVisible()
})

test('the calorie calculator updates while typing and stays shareable', async ({ page }) => {
  await page.goto('/rechner')
  await expectAccessible(page)
  await page.getByRole('link', { name: /Kalorienrechner/ }).click()
  await expect(page).toHaveURL(/\/rechner\/kalorien/)
  await expectAccessible(page)
  const total = page.locator('[data-calc="tdee"]').first()
  await expect(total).toHaveText('2.538')
  await page.fill('#c-weight', '95')
  await expect(total).toHaveText('2.867')
  await expect(page).toHaveURL(/weight=95/)
  await page.fill('#c-fat', '20')
  await expect(page.locator('[data-calc="lbm"]')).toHaveText('76')
  await expect(page.locator('[data-calc="bmr"]').first()).toHaveText('2.012')
  await expect(page.locator('[data-calc-when="usesKatch"]').first()).toBeVisible()
  expect(await page.evaluate(() => document.cookie)).toBe('')
})

test('the peptide calculator draws the syringe and warns about awkward amounts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('/rechner/peptide')
  await expectAccessible(page)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
  const units = page.locator('[data-calc="units"]').first()
  await expect(units).toHaveText('10')
  await page.selectOption('select[name="size"]', '0.3')
  await page.fill('#c-dose', '2')
  await page.fill('#c-dose', '2000')
  await expect(page.getByText('Die Menge passt nicht in die gewählte Spritze.')).toBeVisible()
  await page.fill('#c-dose', '250')
  await expect(units).toHaveText('10')
  await expect(page.locator('[data-calc-fill]')).toHaveAttribute('width', '80')
  await expect(page.locator('[data-alt="4"] [data-alt-units]')).toHaveText('25')
  await expect(page.locator('[data-alt="4"] [data-alt-fits]')).toBeVisible()
  await expect(page.locator('[data-alt="2"]')).toHaveAttribute('data-current', 'true')
})

test('the calculators work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/rechner/kalorien?age=40&height=190&weight=90&activity=sitting&sessions=0')
  await expect(page.locator('[data-calc="bmr"]').first()).toHaveText('1.893')
  await expect(page.getByRole('button', { name: 'Berechnen' })).toBeVisible()
  await context.close()
})
