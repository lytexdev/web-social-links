import { sql } from 'drizzle-orm'
import {
  type AnySQLiteColumn,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull(),
    totpSecretEnc: text('totp_secret_enc'),
    totpPendingEnc: text('totp_pending_enc'),
    totpEnabled: integer('totp_enabled', { mode: 'boolean' }).notNull().default(false),
    totpLastStep: integer('totp_last_step'),
    locale: text('locale').notNull().default('de'),
    passwordChangedAt: integer('password_changed_at').notNull(),
    setupCompletedAt: integer('setup_completed_at'),
    ...timestamps,
  },
  (table) => [uniqueIndex('users_username_unique').on(table.username)],
)

export const credentials = sqliteTable(
  'credentials',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    label: text('label').notNull(),
    publicData: text('public_data').notNull(),
    counter: integer('counter').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    lastUsedAt: integer('last_used_at'),
  },
  (table) => [index('credentials_user_idx').on(table.userId)],
)

export const recoveryCodes = sqliteTable(
  'recovery_codes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    usedAt: integer('used_at'),
  },
  (table) => [index('recovery_codes_user_idx').on(table.userId)],
)

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mfaPassed: integer('mfa_passed', { mode: 'boolean' }).notNull(),
    createdAt: integer('created_at').notNull(),
    lastSeenAt: integer('last_seen_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    reauthAt: integer('reauth_at'),
    ip: text('ip').notNull(),
    uaFamily: text('ua_family').notNull(),
  },
  (table) => [
    index('sessions_user_idx').on(table.userId),
    index('sessions_expires_idx').on(table.expiresAt),
  ],
)

export const securityEvents = sqliteTable(
  'security_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type').notNull(),
    ip: text('ip'),
    usernameAttempt: text('username_attempt'),
    meta: text('meta', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('security_events_created_idx').on(table.createdAt),
    index('security_events_type_idx').on(table.type, table.createdAt),
  ],
)

export const bans = sqliteTable('bans', {
  ip: text('ip').primaryKey(),
  reason: text('reason').notNull(),
  scope: text('scope').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  draft: text('draft', { mode: 'json' }).notNull().$type<unknown>(),
  updatedAt: integer('updated_at').notNull(),
})

export const blocks = sqliteTable(
  'blocks',
  {
    id: text('id').primaryKey(),
    parentId: text('parent_id').references((): AnySQLiteColumn => blocks.id, {
      onDelete: 'cascade',
    }),
    type: text('type').notNull(),
    position: integer('position').notNull(),
    data: text('data', { mode: 'json' }).notNull().$type<unknown>(),
    visible: integer('visible', { mode: 'boolean' }).notNull().default(true),
    visibleFrom: integer('visible_from'),
    visibleUntil: integer('visible_until'),
    deletedAt: integer('deleted_at'),
    ...timestamps,
  },
  (table) => [index('blocks_parent_position_idx').on(table.parentId, table.position)],
)

export const pageVersions = sqliteTable(
  'page_versions',
  {
    id: text('id').primaryKey(),
    revision: integer('revision').notNull(),
    snapshot: text('snapshot', { mode: 'json' }).notNull().$type<unknown>(),
    publishedAt: integer('published_at').notNull(),
    publishedBy: text('published_by'),
    note: text('note'),
  },
  (table) => [uniqueIndex('page_versions_revision_unique').on(table.revision)],
)

export const pages = sqliteTable(
  'pages',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    kind: text('kind').notNull(),
    markdown: text('markdown').notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('pages_slug_unique').on(table.slug)],
)

export const media = sqliteTable(
  'media',
  {
    id: text('id').primaryKey(),
    sha256: text('sha256').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    bytes: integer('bytes').notNull(),
    variants: text('variants', { mode: 'json' }).notNull().$type<unknown>(),
    alt: text('alt').notNull().default(''),
    decorative: integer('decorative', { mode: 'boolean' }).notNull().default(false),
    dominantColor: text('dominant_color'),
    animated: integer('animated', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [uniqueIndex('media_sha256_unique').on(table.sha256)],
)

export const sources = sqliteTable('sources', {
  key: text('key').primaryKey(),
  label: text('label').notNull(),
  icon: text('icon'),
  preset: integer('preset', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
})

export const slugs = sqliteTable('slugs', {
  slug: text('slug').primaryKey(),
  kind: text('kind').notNull(),
  sourceKey: text('source_key').references(() => sources.key, { onDelete: 'cascade' }),
  linkId: text('link_id'),
  label: text('label').notNull().default(''),
  createdAt: integer('created_at').notNull(),
})

export const events = sqliteTable(
  'events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ts: integer('ts').notNull(),
    day: text('day').notNull(),
    type: text('type').notNull(),
    linkId: text('link_id'),
    blockId: text('block_id'),
    sourceKey: text('source_key').notNull(),
    slug: text('slug'),
    referrerHost: text('referrer_host'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    country: text('country'),
    device: text('device'),
    browser: text('browser'),
    os: text('os'),
    visitorHash: text('visitor_hash'),
  },
  (table) => [
    index('events_ts_idx').on(table.ts),
    index('events_day_type_idx').on(table.day, table.type),
  ],
)

export const dailyStats = sqliteTable(
  'daily_stats',
  {
    day: text('day').notNull(),
    linkId: text('link_id').notNull().default(''),
    sourceKey: text('source_key').notNull(),
    views: integer('views').notNull().default(0),
    clicks: integer('clicks').notNull().default(0),
    uniques: integer('uniques').notNull().default(0),
    previews: integer('previews').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.day, table.linkId, table.sourceKey] })],
)

export const dailyDimensions = sqliteTable(
  'daily_dimensions',
  {
    day: text('day').notNull(),
    dimension: text('dimension').notNull(),
    value: text('value').notNull(),
    sourceKey: text('source_key').notNull(),
    views: integer('views').notNull().default(0),
    clicks: integer('clicks').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.day, table.dimension, table.value, table.sourceKey] })],
)

export const analyticsSalts = sqliteTable('analytics_salts', {
  day: text('day').primaryKey(),
  salt: text('salt').notNull(),
})

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id'),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    summary: text('summary').notNull().default(''),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('audit_log_created_idx').on(table.createdAt)],
)

export const kv = sqliteTable('kv', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})
