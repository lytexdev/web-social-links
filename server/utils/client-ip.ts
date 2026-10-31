import { normalizeIp } from './cidr'

export function resolveClientIp(socket: string | undefined, realIp: string | undefined): string {
  return normalizeIp(realIp ?? '') ?? normalizeIp(socket ?? '') ?? '0.0.0.0'
}
