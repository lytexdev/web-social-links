import { expect, test } from '@playwright/test'
import { OWNER, expectAccessible, login } from './fixtures'

test('first login forces a password change and finishes the setup', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login$/)
  await expectAccessible(page)

  await login(page, 'admin', 'admin123')
  await expect(page).toHaveURL(/\/admin\/setup$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Neues Passwort')
  await expectAccessible(page)

  await page.getByRole('textbox', { name: 'Neues Passwort' }).fill('passwordpassword')
  await page.getByRole('button', { name: 'Weiter' }).click()
  await expect(
    page.getByText('Dieses Passwort steht auf Listen geleakter Passwörter'),
  ).toBeVisible()

  await page.getByRole('textbox', { name: 'Neues Passwort' }).fill(OWNER.password)
  await expect(page.getByText(/Stärke:/)).toBeVisible()
  await page.getByRole('button', { name: 'Weiter' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Benutzername')
  await page.getByRole('textbox', { name: 'Benutzername' }).fill(OWNER.username)
  await page.getByRole('button', { name: 'Weiter' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zwei-Faktor-Anmeldung')
  await expect(page.locator('img[src^="data:image/svg+xml"]')).toBeVisible()
  await expectAccessible(page)
  await page.getByRole('button', { name: 'Überspringen' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Einrichtung abgeschlossen')
  await page.getByRole('button', { name: 'Zum Editor' }).click()
  await expect(page).toHaveURL(/\/admin$/)
})

test('the initial password no longer works', async ({ page }) => {
  await login(page, 'admin', 'admin123')
  await expect(page.getByRole('alert')).toHaveText('Benutzername oder Passwort stimmt nicht.')
})

test('the security page shows the missing second factor', async ({ page }) => {
  await login(page)
  await expect(page).toHaveURL(/\/admin$/)
  await page.goto('/admin/security')
  await expect(page.getByText('Zwei-Faktor-Anmeldung ist aus.')).toBeVisible()
  await expectAccessible(page)
})
