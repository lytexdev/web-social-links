import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type AdminClient, multipart, setupOwner } from '../support/client'
import { startServer, type TestServer } from '../support/server'

let server: TestServer
let admin: AdminClient
const file = readFileSync('tests/fixtures/import-lnkbio.json')

interface Node {
  type: string
  data: Record<string, unknown>
  children: Node[]
}

function upload(path: string) {
  const form = multipart([
    { name: 'file', filename: 'import.json', type: 'application/json', data: file },
  ])
  return admin.send(path, {
    method: 'POST',
    rawBody: form.body,
    headers: { 'content-type': form.contentType },
  })
}

beforeAll(async () => {
  server = await startServer()
  admin = await setupOwner(server)
})

afterAll(async () => {
  await server.stop()
})

describe('import of the Lnk.Bio structure', () => {
  it('previews counts and warns about every placeholder URL', async () => {
    const response = await upload('/api/admin/tools/import-preview')
    expect(response.status).toBe(200)
    const preview = response.json<{
      counts: Record<string, number>
      warnings: Array<{ code: string; target: string }>
    }>()
    expect(preview.counts.blocks).toBe(8)
    const placeholders = preview.warnings
      .filter((warning) => warning.code === 'placeholder_url')
      .map((warning) => warning.target)
    expect(placeholders).toEqual([
      'Nigela: Schwarzkümmelöl',
      'L-Theanin Kapseln',
      'CDP Cholin / Citicoline',
      'Omega 3, 300 Kapseln, hochdosiert',
      'Quellenangaben zu meinen Videos',
      'YouTube',
      'Instagram',
      'TikTok',
    ])
  })

  it('creates the social bar, the supplement group, the code and the notice', async () => {
    expect((await upload('/api/admin/tools/import-apply')).status).toBe(200)
    const tree = (await admin.send('/api/admin/blocks')).json<Node[]>()
    expect(tree.map((node) => node.type)).toEqual(['group', 'link', 'code', 'notice'])
    const group = tree[0]
    expect(group?.data.title).toBe('Supplements')
    expect(group?.children.map((child) => [child.data.title, child.data.affiliate])).toEqual([
      ['Nigela: Schwarzkümmelöl', true],
      ['L-Theanin Kapseln', true],
      ['CDP Cholin / Citicoline', true],
      ['Omega 3, 300 Kapseln, hochdosiert', true],
    ])
    expect(tree[1]?.data.icon).toBe('tabler:brand-github')
    expect(tree[2]?.data.code).toBe('lytex')
    expect(tree[3]?.data.markdown).toContain('Keine medizinische Beratung')
    const settings = (await admin.send('/api/admin/settings')).json<{
      settings: { profile: { social: Array<{ label: string }> } }
    }>()
    expect(settings.settings.profile.social.map((item) => item.label)).toEqual([
      'YouTube',
      'Instagram',
      'TikTok',
    ])
  })
})
