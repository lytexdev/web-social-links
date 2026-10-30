import { lookup } from 'node:dns/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { BlockList, isIP, type LookupFunction } from 'node:net'

const BLOCKED = new BlockList()
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  BLOCKED.addSubnet(address, prefix, 'ipv4')
}
for (const [address, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  BLOCKED.addSubnet(address, prefix, 'ipv6')
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 0) return false
  return !BLOCKED.check(address, family === 4 ? 'ipv4' : 'ipv6')
}

export type LinkStatus =
  | { ok: true; status: number; finalUrl: string }
  | {
      ok: false
      reason: 'blocked' | 'dns' | 'timeout' | 'too_many_redirects' | 'network' | 'status'
      status?: number
    }

async function resolvePublic(hostname: string): Promise<string | null> {
  const literal = hostname.replace(/^\[|\]$/g, '')
  if (isIP(literal)) return isPublicAddress(literal) ? literal : null
  const records = await lookup(literal, { all: true, verbatim: true })
  if (records.length === 0 || !records.every((record) => isPublicAddress(record.address)))
    return null
  return records[0]?.address ?? null
}

function fetchOnce(
  url: URL,
  address: string,
  method: 'HEAD' | 'GET',
  timeoutMs: number,
): Promise<{ status: number; location?: string }> {
  const pinned: LookupFunction = (_hostname, options, callback) => {
    const family = isIP(address)
    if (options.all) callback(null, [{ address, family }])
    else callback(null, address, family)
  }
  const request = url.protocol === 'https:' ? httpsRequest : httpRequest
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method,
        lookup: pinned,
        timeout: timeoutMs,
        headers: { 'user-agent': 'web-social-links link check', accept: '*/*' },
      },
      (res) => {
        let received = 0
        res.on('data', (chunk: Buffer) => {
          received += chunk.length
          if (received > 65_536) res.destroy()
        })
        res.on('close', () =>
          resolve({ status: res.statusCode ?? 0, location: res.headers.location }),
        )
        res.resume()
      },
    )
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
    req.end()
  })
}

export async function checkLink(input: string, timeoutMs = 5000): Promise<LinkStatus> {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return { ok: false, reason: 'network' }
  }
  for (let hop = 0; hop <= 3; hop++) {
    if (url.protocol !== 'https:' && url.protocol !== 'http:')
      return { ok: false, reason: 'blocked' }
    let address: string | null
    try {
      address = await resolvePublic(url.hostname)
    } catch {
      return { ok: false, reason: 'dns' }
    }
    if (!address) return { ok: false, reason: 'blocked' }
    let response: { status: number; location?: string }
    try {
      response = await fetchOnce(url, address, 'HEAD', timeoutMs)
      if (response.status === 405 || response.status === 501)
        response = await fetchOnce(url, address, 'GET', timeoutMs)
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error && error.message === 'timeout' ? 'timeout' : 'network',
      }
    }
    if (response.status >= 300 && response.status < 400 && response.location) {
      url = new URL(response.location, url)
      continue
    }
    if (response.status >= 200 && response.status < 400)
      return { ok: true, status: response.status, finalUrl: url.href }
    return { ok: false, reason: 'status', status: response.status }
  }
  return { ok: false, reason: 'too_many_redirects' }
}
