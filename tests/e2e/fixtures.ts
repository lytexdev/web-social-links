import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export const OWNER = { username: 'owner', password: 'tiefer see unter hellem mond' }

export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const blocking = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  )
  expect(
    blocking.map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
    ),
  ).toEqual([])
}

export async function login(
  page: Page,
  username = OWNER.username,
  password = OWNER.password,
): Promise<void> {
  await page.goto('/admin/login')
  await page.getByRole('textbox', { name: /^(Benutzername|Username)$/ }).fill(username)
  await page.getByRole('textbox', { name: /^(Passwort|Password)$/ }).fill(password)
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: /^(Anmelden|Log in)$/ }).click()
}
