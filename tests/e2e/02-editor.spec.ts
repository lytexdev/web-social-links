import { expect, test, type Page } from '@playwright/test'
import { expectAccessible, login } from './fixtures'

const LEGAL = 'Erika Musterfrau\nMusterweg 1\n12345 Musterstadt\nE-Mail: kontakt@example.com'

async function newEditor(page: Page, typeName: string) {
  const toggle = page.getByRole('button', {
    name: new RegExp(`^Ohne Titel ${typeName}`),
    expanded: true,
  })
  await expect(toggle).toBeVisible()
  return page.locator(`#${await toggle.getAttribute('aria-controls')}`)
}

async function insert(page: Page, label: RegExp | string, type: string): Promise<void> {
  await page.getByRole('button', { name: label }).first().click()
  await page
    .getByRole('listbox')
    .last()
    .getByRole('option', { name: new RegExp(`^${type} `) })
    .click()
}

test.beforeEach(async ({ page }) => {
  await login(page)
  await expect(page).toHaveURL(/\/admin$/)
})

test('builds a page with groups, links and keyboard reordering', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Anzeigename' }).fill('Erika Musterfrau')
  await page.getByRole('textbox', { name: 'Kurzbeschreibung' }).fill('Notizen aus dem Labor')

  await insert(page, 'Block einfügen', 'Gruppe')
  await (
    await newEditor(page, 'Gruppe')
  )
    .getByRole('textbox', { name: /^Titel/ })
    .fill('Supplements')

  await insert(page, 'Link oder Kachel in diese Gruppe', 'Link')
  const linkEditor = await newEditor(page, 'Link')
  await linkEditor.getByRole('textbox', { name: 'Titel', exact: true }).fill('Omega 3')
  await linkEditor
    .getByRole('textbox', { name: 'Ziel-Adresse' })
    .fill('https://shop.example.com/omega')
  await linkEditor.getByRole('checkbox', { name: /Affiliate-Link/ }).check()
  await linkEditor.getByRole('button', { name: 'Icon wählen' }).click()
  const picker = page.getByRole('dialog', { name: 'Icon wählen' })
  await picker.getByRole('searchbox', { name: 'Icons suchen' }).fill('yt')
  await picker.getByRole('tab', { name: 'Marken' }).click()
  const youtube = picker.getByRole('option', { name: 'YouTube', exact: true })
  await expect(youtube.locator('svg')).toBeVisible()
  await youtube.click()
  await expect(picker).toBeHidden()
  await expect(linkEditor.getByText('si:youtube')).toBeVisible()

  await insert(page, 'Block einfügen', 'Link')
  const second = await newEditor(page, 'Link')
  await second.getByRole('textbox', { name: 'Titel', exact: true }).fill('Quellenangaben')
  await second
    .getByRole('textbox', { name: 'Ziel-Adresse' })
    .fill('https://github.com/example/sources')

  await expect(page.getByText('Entwurf gespeichert')).toBeVisible()
  await expectAccessible(page)

  const handle = page.getByRole('button', { name: 'Verschieben: Quellenangaben' })
  await handle.focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('status').filter({ hasText: 'aufgenommen' })).toBeVisible()
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Space')
  await expect(
    page.getByRole('status').filter({ hasText: 'abgelegt auf Position 1' }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: /^Verschieben:/ }).first()).toHaveAccessibleName(
    'Verschieben: Quellenangaben',
  )
})

test('blocks publishing until the legal pages are complete, then publishes', async ({ page }) => {
  await page.getByRole('button', { name: 'Veröffentlichen' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Das Impressum enthält noch Platzhalter')).toBeVisible()
  await page.keyboard.press('Escape')

  for (const name of ['Impressum', 'Datenschutzerklärung']) {
    await page.goto('/admin/pages')
    await page
      .getByRole('listitem')
      .filter({ hasText: name })
      .getByRole('link', { name: 'Bearbeiten' })
      .click()
    await page.getByRole('textbox', { name: 'Inhalt' }).fill(`## ${name}\n\n${LEGAL}`)
    await expect(page.getByRole('status').filter({ hasText: 'Entwurf gespeichert' })).toBeVisible()
  }
  await expectAccessible(page)

  await page.getByRole('button', { name: 'Veröffentlichen' }).click()
  await page.getByRole('textbox', { name: /Notiz zur Version/ }).fill('Erste Version')
  await page.getByRole('button', { name: 'Jetzt veröffentlichen' }).click()
  await expect(page.getByText('Revision 1 ist live')).toBeVisible()
})

test('the public page shows the published content', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Erika Musterfrau')
  await expect(page.getByRole('link', { name: /Omega 3.*Anzeige/ })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: /Supplements/ })).toBeVisible()
  await expectAccessible(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'test-results/public-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.screenshot({ path: 'test-results/public-desktop.png', fullPage: true })
})

test('admin views pass axe checks', async ({ page }) => {
  for (const path of [
    '/admin',
    '/admin/design',
    '/admin/media',
    '/admin/pages',
    '/admin/sources',
    '/admin/versions',
    '/admin/settings',
    '/admin/stats',
    '/admin/security',
  ]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectAccessible(page)
  }
  await page.goto('/admin')
  await page.screenshot({ path: 'test-results/admin-editor.png', fullPage: true })
  await page.goto('/admin/stats')
  await expect(page.getByRole('heading', { name: 'Verlauf' })).toBeVisible()
  await page.getByRole('img', { name: /Verlauf von Aufrufen/ }).hover()
  await page.screenshot({ path: 'test-results/admin-stats.png', fullPage: true })
  await page.getByRole('button', { name: 'Als Tabellen anzeigen' }).click()
  await expectAccessible(page)
})
