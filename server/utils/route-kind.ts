export type RouteKind =
  | 'health'
  | 'asset'
  | 'media'
  | 'admin-page'
  | 'admin-api'
  | 'go'
  | 'meta'
  | 'public-page'
  | 'unknown-api'
  | 'internal'

const ASSET_PREFIXES = ['/_nuxt/', '/js/', '/icons/']
const ASSET_FILES = new Set(['/favicon.ico', '/apple-touch-icon.png', '/icon.png'])

export function routeKind(path: string): RouteKind {
  const pathname = path.split('?')[0] ?? '/'
  if (pathname === '/healthz') return 'health'
  if (pathname.startsWith('/__nuxt')) return 'internal'
  if (ASSET_FILES.has(pathname) || ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix)))
    return 'asset'
  if (pathname.startsWith('/media/')) return 'media'
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin-page'
  if (pathname.startsWith('/api/admin/') || pathname === '/api/admin') return 'admin-api'
  if (pathname.startsWith('/api/')) return 'unknown-api'
  if (pathname.startsWith('/go/')) return 'go'
  if (pathname === '/robots.txt' || pathname.startsWith('/.well-known/')) return 'meta'
  return 'public-page'
}

export function isAdminKind(kind: RouteKind): boolean {
  return kind === 'admin-page' || kind === 'admin-api'
}
