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
  await page
    .getByRole('checkbox', { name: 'Rechner unter /rechner/wirkstoff-abbau anzeigen' })
    .check()
  await page.getByRole('textbox', { name: 'Titel', exact: true }).nth(1).fill('Peptid-Rechner')
  await page.getByRole('textbox', { name: 'Titel', exact: true }).last().fill('Wirkstoff-Abbau')
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

test('the decay calculator switches substance, curve and reference together', async ({ page }) => {
  await page.goto('/rechner/wirkstoff-abbau?substance=caffeine&dose=200&hours=5')
  await expectAccessible(page)
  await expect(page.locator('[data-calc="percent"]')).toHaveText('50')
  await expect(page.locator('[data-calc="remaining"]')).toHaveText('100')
  await page.fill('#c-hours', '10')
  await expect(page.locator('[data-calc="percent"]')).toHaveText('25')
  await page.selectOption('#c-substance', 'lisdexamfetamine')
  await expect(page.locator('[data-calc="half"]').first()).toHaveText('11')
  await expect(page.locator('[data-calc="low"]')).toHaveText('9')
  await expect(page.locator('[data-calc-text="blood"]')).toContainText('Dexamfetamin')
  await expect(page.locator('[data-calc-duration="t97"]')).toHaveText('2,3 Tage')
  const curve = await page.locator('[data-calc-curve]').getAttribute('points')
  expect(curve?.startsWith('0.0,0.0')).toBe(true)
  await page.fill('#c-interval', '12')
  await expect(page.locator('[data-calc="accumulation"]')).toBeVisible()
  expect(await page.evaluate(() => document.cookie)).toBe('')
})

test('the decay calculator refuses to model THC', async ({ page }) => {
  await page.goto('/rechner/wirkstoff-abbau?substance=thc')
  await expectAccessible(page)
  await expect(page.getByText('keine einzelne Halbwertszeit angeben').first()).toBeVisible()
  await expect(page.locator('[data-calc="percent"]')).toBeHidden()
  await expect(page.getByText('THC-COOH').first()).toBeVisible()
  await page.selectOption('#c-substance', 'caffeine')
  await expect(page.locator('[data-calc="percent"]')).toBeVisible()
})

test('every public page offers a back link and a way to the top', async ({ page }) => {
  await page.goto('/rechner/wirkstoff-abbau')
  const back = page.getByRole('link', { name: 'Alle Rechner' })
  await expect(back.locator('svg')).toBeVisible()
  const top = page.locator('[data-to-top]')
  await expect(top).toBeHidden()
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(top).toBeVisible()
  await expect(top).toHaveAccessibleName('Nach oben')
  await top.click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(100)
})

test('the calculator copies its link and remembers input only on request', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/rechner/kalorien')
  await page.fill('#c-weight', '83')
  await expect(page).toHaveURL(/weight=83/)
  await page.getByRole('button', { name: 'Link kopieren' }).click()
  await expect(page.getByRole('button', { name: 'Kopiert' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('weight=83')

  expect(await page.evaluate(() => localStorage.length)).toBe(0)
  await page.getByRole('checkbox', { name: /Eingaben auf diesem Gerät merken/ }).check()
  await page.fill('#c-weight', '84')
  await expect(page).toHaveURL(/weight=84/)
  await page.goto('/rechner/kalorien')
  await expect(page.locator('#c-weight')).toHaveValue('84')
  await page.getByRole('checkbox', { name: /Eingaben auf diesem Gerät merken/ }).uncheck()
  expect(await page.evaluate(() => localStorage.length)).toBe(0)
})
