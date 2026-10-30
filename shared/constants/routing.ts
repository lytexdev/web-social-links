export const TRAP_PATHS = [
  '/wp-login.php',
  '/wp-admin',
  '/xmlrpc.php',
  '/.env',
  '/.git',
  '/phpmyadmin',
  '/administrator',
  '/admin.php',
  '/config.php',
  '/vendor/phpunit',
  '/cgi-bin',
  '/server-status',
] as const

export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'go',
  'p',
  'media',
  '_nuxt',
  'impressum',
  'datenschutz',
  'robots.txt',
  'favicon.ico',
  'healthz',
  '.well-known',
  'icons',
  'theme',
  'js',
  'logo.png',
  'apple-touch-icon.png',
  'wp-login.php',
  'wp-admin',
  'xmlrpc.php',
  '.env',
  '.git',
  'phpmyadmin',
  'administrator',
  'admin.php',
  'config.php',
  'vendor',
  'cgi-bin',
  'server-status',
])

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/

export function isTrapPath(path: string): boolean {
  const lowered = path.toLowerCase()
  return TRAP_PATHS.some(
    (trap) => lowered === trap || lowered.startsWith(`${trap}/`) || lowered.startsWith(`${trap}?`),
  )
}
