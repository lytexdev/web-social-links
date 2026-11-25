import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { strToU8, zipSync } from 'fflate'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeDatabase, openDatabase, setDb } from '../../server/db/client'
import {
  ReferenceSyncError,
  applyReferences,
  archiveUrl,
  findReference,
  readArchive,
  referenceDocsList,
} from '../../server/services/references'
import {
  evidenceLevel,
  normalizeSearch,
  parseReference,
  referenceSlug,
  splitRow,
} from '../../server/services/references-parse'
import { referencesSchema } from '../../shared/schemas/settings'
import { initEnv } from '../../server/utils/env'

const FIXTURES = 'tests/fixtures/references'
const VIDEO = 'videos/2025/Schlaf-Grundlagen.md'
const SHORT = 'shorts/2025/Koffein-am-Abend.md'

function fixture(path: string): string {
  return readFileSync(`${FIXTURES}/${path}`, 'utf8')
}

function archive(files: Record<string, string>, root = 'repo-main'): Uint8Array {
  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([path, text]) => [`${root}/${path}`, strToU8(text)]),
    ),
  )
}

describe('reference parser', () => {
  const video = parseReference(VIDEO, fixture(VIDEO))
  const short = parseReference(SHORT, fixture(SHORT))

  it('reads front matter, research date and the preamble note', () => {
    expect(video).toMatchObject({
      slug: 'schlaf-grundlagen',
      kind: 'video',
      title: 'Schlaf verstehen: Grundlagen und Mythen',
      published: '2025-03-14',
      researched: '2025-03-20',
      topics: ['Schlaf', 'Gesundheit'],
    })
    expect(video?.introHtml).toContain('<strong>Hinweis:</strong>')
    expect(video?.links).toEqual([
      { platform: 'youtube', url: 'https://www.youtube.com/watch?v=abcdefghijk', exact: true },
    ])
  })

  it('turns the evidence table into claims with levels and source numbers', () => {
    expect(video?.claims.map((claim) => [claim.level, claim.refs])).toEqual([
      ['high', [1]],
      ['moderate', [2, 3]],
      ['refuted', [3]],
      ['preliminary', [9]],
    ])
    expect(short?.claims[1]?.html).toContain('zwischen Menschen | je nach Leber')
  })

  it('escapes markup and drops unsafe links', () => {
    const unsafe = video?.claims[3]
    expect(unsafe?.html).toContain('&lt;script&gt;')
    expect(unsafe?.limitsHtml).not.toContain('href')
  })

  it('groups numbered sources, joins continuation lines and keeps the review note', () => {
    expect(
      video?.sourceGroups.map((group) => [group.heading, group.items.map((i) => i.n)]),
    ).toEqual([
      ['Konsens', [1]],
      ['Weitere Studien', [2, 3]],
    ])
    const second = video?.sourceGroups[1]?.items[0]?.html ?? ''
    expect(second).toContain('Zweite Zeile derselben Quelle.')
    expect(second).toContain('<a href="https://doi.org/10.1000/beispiel.2" rel="noopener">')
    expect(video?.sourceNotes[0]).toContain('Quellenprüfung')
  })

  it('sorts changes newest first and keeps the closing disclaimer', () => {
    expect(video?.changes.map((change) => change.date)).toEqual(['2025-04-02', '2025-03-14'])
    expect(video?.notes).toEqual(['Diese Zusammenstellung ist keine medizinische Beratung.'])
  })

  it('reports source numbers missing from the list', () => {
    expect(video?.warnings).toEqual([{ code: 'ref_unknown', detail: '9' }])
  })

  it('prefers exact video links over profiles and ignores placeholders', () => {
    expect(short?.links).toEqual([
      { platform: 'tiktok', url: 'https://www.tiktok.com/@beispielkanal/', exact: false },
      { platform: 'instagram', url: 'https://www.instagram.com/reel/AbC123xyz/', exact: true },
    ])
    expect(short?.warnings).toEqual([])
  })

  it('renders other sections as their own blocks', () => {
    expect(short?.sections).toEqual([
      {
        heading: 'Bild- und Tonnachweise',
        html: '<ul>\n<li>Musik: Beispielmusik, lizenzfrei.</li>\n</ul>\n',
      },
    ])
  })

  it('warns about missing parts and rejects paths outside the layout', () => {
    expect(parseReference('templates/short-sources.md', 'x')).toBeNull()
    expect(parseReference('shorts/2025/sub/x.md', 'x')).toBeNull()
    const bare = parseReference('shorts/2025/Leer.md', '---\ntitle: ""\n---\n')
    expect(bare?.warnings.map((warning) => warning.code)).toEqual([
      'title_missing',
      'date_invalid',
      'link_missing',
      'claims_missing',
      'sources_missing',
    ])
  })

  it.each([
    ['Hoch', 'high'],
    ['Etabliert (Lehrbuchphysiologie)', 'high'],
    ['Moderat bis stark', 'moderate'],
    ['Schwach bis moderat', 'low'],
    ['Vorläufig/präklinisch', 'preliminary'],
    ['Nicht belegt', 'refuted'],
    ['Unbelegt', 'refuted'],
    ['Persönliche Meinung', 'other'],
  ] as const)('rates "%s" as %s', (text, level) => {
    expect(evidenceLevel(text)).toBe(level)
  })

  it('builds slugs and search text that ignore umlaut spelling', () => {
    expect(referenceSlug('Aufklärung-Schwarzkümmelöl')).toBe('aufklarung-schwarzkummelol')
    expect(normalizeSearch('Schilddrüse')).toBe(normalizeSearch('Schilddruese'))
    expect(normalizeSearch('Größe')).toBe('grosse')
    expect(splitRow('| a | `x|y` | c \\| d |')).toEqual(['a', '`x|y`', 'c | d'])
  })
})

describe('reference settings', () => {
  it('validates paths, aliases and the repository address', () => {
    expect(referencesSchema.parse({})).toMatchObject({
      enabled: false,
      path: 'quellen',
      aliases: ['quellenangaben', 'sources'],
      repository: '',
      branch: 'main',
    })
    const result = referencesSchema.safeParse({
      path: 'admin',
      aliases: ['quellen', 'Neu'],
      repository: 'https://gitlab.com/a/b',
      branch: '../x',
    })
    expect(result.success).toBe(false)
    const messages = Object.fromEntries(
      (result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]),
    )
    expect(messages).toMatchObject({
      path: 'reserved',
      repository: 'repository_invalid',
      branch: 'branch_invalid',
    })
    expect(referencesSchema.safeParse({ aliases: ['quellen'] }).error?.issues[0]?.message).toBe(
      'taken',
    )
  })

  it('only builds archive addresses for GitHub repositories', () => {
    expect(archiveUrl('https://github.com/name/repo.git', 'feature/x')).toBe(
      'https://codeload.github.com/name/repo/zip/refs/heads/feature/x',
    )
    expect(() => archiveUrl('https://example.com/a/b', 'main')).toThrow(ReferenceSyncError)
  })
})

describe('reference sync', () => {
  beforeAll(() => {
    const result = initEnv({
      NODE_ENV: 'test',
      PUBLIC_ORIGIN: 'https://links.example.com',
      APP_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      ANALYTICS_HMAC_KEY: randomBytes(32).toString('base64'),
      DATA_DIR: '/tmp',
    })
    expect(result.ok).toBe(true)
    setDb(openDatabase(':memory:', resolve('server/db/migrations')))
  })

  afterAll(() => closeDatabase())

  it('reads only reference files from the archive', () => {
    const files = readArchive(
      archive({
        [VIDEO]: fixture(VIDEO),
        [SHORT]: fixture(SHORT),
        'templates/short-sources.md': fixture('templates/short-sources.md'),
        'README.md': '# x',
        'shorts/2025/Riesig.md': 'x'.repeat(1_048_577),
      }),
    )
    expect(files.map((file) => file.path)).toEqual([SHORT, VIDEO])
  })

  it('rejects broken archives and archives without documents', () => {
    expect(() => readArchive(new Uint8Array([1, 2, 3]))).toThrow('archive_invalid')
    expect(() => applyReferences([])).toThrow('no_documents')
  })

  it('adds, updates and removes documents and keeps slugs unique', () => {
    const first = applyReferences([
      { path: VIDEO, text: fixture(VIDEO) },
      { path: SHORT, text: fixture(SHORT) },
      { path: 'shorts/2024/Koffein-am-Abend.md', text: fixture(SHORT) },
    ])
    expect(first).toMatchObject({ documents: 3, added: 3, updated: 0, removed: 0 })
    expect(referenceDocsList().map((doc) => doc.slug)).toEqual([
      'koffein-am-abend',
      'koffein-am-abend-2',
      'schlaf-grundlagen',
    ])

    const second = applyReferences([
      { path: VIDEO, text: fixture(VIDEO).replace('Mythen', 'Irrtümer') },
      { path: SHORT, text: fixture(SHORT) },
    ])
    expect(second).toMatchObject({ documents: 2, added: 0, updated: 1, removed: 1 })
    expect(findReference('schlaf-grundlagen')?.title).toContain('Irrtümer')
    expect(findReference('koffein-am-abend-2')).toBeUndefined()
  })
})
