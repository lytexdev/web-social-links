import { describe, expect, it } from 'vitest'
import { isTrapPath } from '../../shared/constants/routing'
import { routeKind } from '../../server/utils/route-kind'

describe('routeKind', () => {
  it.each([
    ['/healthz', 'health'],
    ['/_nuxt/entry.js', 'asset'],
    ['/media/abc-def-96.webp', 'media'],
    ['/admin', 'admin-page'],
    ['/admin/design', 'admin-page'],
    ['/administrator', 'public-page'],
    ['/api/admin/auth/me', 'admin-api'],
    ['/api/other', 'unknown-api'],
    ['/go/abc?s=ig', 'go'],
    ['/robots.txt', 'meta'],
    ['/.well-known/security.txt', 'meta'],
    ['/__nuxt_error', 'internal'],
    ['/ig', 'public-page'],
  ])('%s -> %s', (path, kind) => {
    expect(routeKind(path)).toBe(kind)
  })
})

describe('isTrapPath', () => {
  it.each([
    ['/wp-login.php', true],
    ['/WP-ADMIN/install.php', true],
    ['/.git/config', true],
    ['/.env', true],
    ['/.envelope', false],
    ['/vendor/phpunit/src/Util/PHP/eval-stdin.php', true],
    ['/cgi-bin/luci', true],
    ['/admin', false],
    ['/ig', false],
  ])('%s -> %s', (path, expected) => {
    expect(isTrapPath(path)).toBe(expected)
  })
})
