import { useEnv } from '../utils/env'
import { isAdminKind, routeKind } from '../utils/route-kind'

const PERMISSIONS_POLICY = [
  'accelerometer',
  'autoplay',
  'bluetooth',
  'browsing-topics',
  'camera',
  'display-capture',
  'encrypted-media',
  'fullscreen',
  'geolocation',
  'gyroscope',
  'hid',
  'idle-detection',
  'magnetometer',
  'microphone',
  'midi',
  'payment',
  'picture-in-picture',
  'publickey-credentials-get',
  'screen-wake-lock',
  'serial',
  'usb',
  'xr-spatial-tracking',
]
  .map((feature) => `${feature}=()`)
  .join(', ')

export const ROBOTS_HEADER = 'noindex, nofollow, noarchive, nosnippet, noimageindex'
export const DEFAULT_CSP =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"

export default defineEventHandler((event) => {
  const kind = routeKind(event.path)
  const admin = isAdminKind(kind)
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': admin ? 'no-referrer' : 'strict-origin-when-cross-origin',
    'Permissions-Policy': PERMISSIONS_POLICY,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Robots-Tag': ROBOTS_HEADER,
    'Content-Security-Policy': DEFAULT_CSP,
  }
  if (useEnv().production)
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains'
  if (admin || kind === 'unknown-api') headers['Cache-Control'] = 'no-store'
  setResponseHeaders(event, headers)
})
