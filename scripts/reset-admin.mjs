import { randomBytes } from 'node:crypto'
import { databasePath, runtimeRequire } from './runtime-modules.mjs'

const Database = runtimeRequire('better-sqlite3')
const { hashSync } = runtimeRequire('@node-rs/argon2')

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'
const password = Array.from(randomBytes(24), (byte) => ALPHABET[byte % ALPHABET.length])
  .join('')
  .match(/.{6}/g)
  .join('-')

const requested = process.argv[2]?.toLowerCase()
const { file } = databasePath()
const db = new Database(file)
db.pragma('busy_timeout = 5000')
db.pragma('foreign_keys = ON')

const user = requested
  ? db.prepare('SELECT id, username FROM users WHERE username = ?').get(requested)
  : db.prepare('SELECT id, username FROM users ORDER BY created_at LIMIT 1').get()

if (!user) {
  process.stderr.write(requested ? `No user named ${requested}\n` : 'No user exists yet\n')
  process.exit(1)
}

const hash = hashSync(password, {
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
})
const now = Date.now()

db.transaction(() => {
  db.prepare(
    `UPDATE users SET password_hash = ?, must_change_password = 1, setup_completed_at = NULL,
     totp_enabled = 0, totp_secret_enc = NULL, totp_pending_enc = NULL, totp_last_step = NULL,
     password_changed_at = ?, updated_at = ? WHERE id = ?`,
  ).run(hash, now, now, user.id)
  db.prepare('DELETE FROM recovery_codes WHERE user_id = ?').run(user.id)
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id)
  db.prepare(
    "INSERT INTO security_events (type, ip, username_attempt, meta, created_at) VALUES ('admin_reset', NULL, ?, NULL, ?)",
  ).run(user.username, now)
})()
db.close()

process.stdout.write(
  [
    `Access for ${user.username} was reset.`,
    'Two-factor authentication is off and every session has ended.',
    `One-time password: ${password}`,
    'Log in at /admin and choose a new password.',
    '',
  ].join('\n'),
)
