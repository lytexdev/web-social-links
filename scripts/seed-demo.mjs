import { randomBytes } from 'node:crypto'
import { databasePath, runtimeRequire } from './runtime-modules.mjs'

const Database = runtimeRequire('better-sqlite3')
const { file } = databasePath()
const db = new Database(file)
db.pragma('foreign_keys = ON')

const id = () => randomBytes(9).toString('base64url')
const now = Date.now()
const existing = db.prepare('SELECT COUNT(*) AS count FROM blocks').get()
if (existing.count > 0 && !process.argv.includes('--force')) {
  process.stderr.write('The draft already contains blocks. Run with --force to replace them.\n')
  process.exit(1)
}

const profile = {
  displayName: 'Mara Lindqvist',
  handle: '@mara.notiert',
  bio: 'Schlaf, Ernährung und was Studien wirklich sagen.',
  avatar: null,
  social: [
    {
      id: id(),
      label: 'YouTube',
      url: 'https://www.youtube.com/@example',
      icon: 'tabler:brand-youtube',
    },
    {
      id: id(),
      label: 'Instagram',
      url: 'https://www.instagram.com/example',
      icon: 'tabler:brand-instagram',
    },
    { id: id(), label: 'Newsletter', url: 'mailto:hallo@example.com', icon: 'tabler:mail' },
  ],
}

const reading = id()
const blocks = [
  {
    id: id(),
    parent: null,
    type: 'text',
    data: {
      markdown:
        'Ich lese Studien, damit du es nicht musst. Hier findest du die Quellen zu jedem Video und Werkzeuge, die ich selbst nutze.',
    },
  },
  {
    id: reading,
    parent: null,
    type: 'group',
    data: { title: 'Lesenswert', layout: 'list', collapsible: false, open: true },
  },
  {
    id: id(),
    parent: reading,
    type: 'link',
    data: {
      title: 'Quellen zu allen Videos',
      subtitle: 'Sortiert nach Folge',
      url: 'https://example.com/quellen',
      variant: 'icon',
      icon: 'tabler:file-text',
    },
  },
  {
    id: id(),
    parent: reading,
    type: 'link',
    data: {
      title: 'Schlaftagebuch als Vorlage',
      subtitle: 'PDF, zwei Seiten',
      url: 'https://example.com/schlaftagebuch.pdf',
      variant: 'icon',
      icon: 'tabler:moon',
    },
  },
  {
    id: id(),
    parent: reading,
    type: 'link',
    data: {
      title: 'Magnesium im Vergleich',
      subtitle: 'Formen, Dosis, Studienlage',
      url: 'https://example.com/magnesium',
      variant: 'icon',
      icon: 'tabler:pill',
      affiliate: true,
      appendUtm: true,
    },
  },
  {
    id: id(),
    parent: null,
    type: 'code',
    data: {
      label: 'Rabatt beim Partnershop',
      code: 'MARA10',
      partner: 'Beispielshop',
      url: 'https://example.com/shop',
      affiliate: true,
    },
  },
  {
    id: id(),
    parent: null,
    type: 'notice',
    data: {
      title: '',
      markdown:
        'Inhalte dienen ausschließlich Bildungs- und Informationszwecken. Keine medizinische Beratung.',
      tone: 'info',
    },
  },
]

const legal = `## Angaben gemäß § 5 DDG

Mara Lindqvist
Beispielstraße 12
10115 Berlin

E-Mail: hallo@example.com

Dies ist ein Demo-Inhalt einer fiktiven Person.`

db.transaction(() => {
  db.prepare('DELETE FROM blocks').run()
  const insert = db.prepare(
    'INSERT INTO blocks (id, parent_id, type, position, data, visible, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
  )
  const positions = new Map()
  for (const block of blocks) {
    const key = block.parent ?? 'root'
    const position = positions.get(key) ?? 0
    positions.set(key, position + 1)
    insert.run(block.id, block.parent, block.type, position, JSON.stringify(block.data), now, now)
  }
  db.prepare(
    `INSERT INTO settings (key, draft, updated_at) VALUES ('profile', ?, ?)
     ON CONFLICT(key) DO UPDATE SET draft = excluded.draft, updated_at = excluded.updated_at`,
  ).run(JSON.stringify(profile), now)
  db.prepare(
    "UPDATE pages SET markdown = ?, updated_at = ? WHERE slug IN ('impressum', 'datenschutz')",
  ).run(legal, now)
  db.prepare(
    `INSERT INTO kv (key, value, updated_at) VALUES ('draft_changes', '1', ?)
     ON CONFLICT(key) DO UPDATE SET value = '1', updated_at = excluded.updated_at`,
  ).run(now)
})()
db.close()

process.stdout.write('Demo content written to the draft. Review it in the admin and publish.\n')
