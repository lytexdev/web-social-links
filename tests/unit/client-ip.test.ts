import { describe, expect, it } from 'vitest'
import { buildBlockList, normalizeIp, parseCidr } from '../../server/utils/cidr'
import { resolveClientIp, type ProxyTrust } from '../../server/utils/client-ip'
import { CLOUDFLARE_RANGES, LOOPBACK_RANGES, PRIVATE_RANGES } from '../../server/utils/proxy-ranges'

function blockList(ranges: readonly string[]) {
  return buildBlockList(ranges.map((range) => parseCidr(range)).filter((cidr) => cidr !== null))
}

const cloudflare = blockList(CLOUDFLARE_RANGES)
const behindCloudflare: ProxyTrust = {
  trusted: blockList([...PRIVATE_RANGES, ...LOOPBACK_RANGES, ...CLOUDFLARE_RANGES]),
  cloudflare,
}
const noProxies: ProxyTrust = { trusted: blockList([]), cloudflare }

const NPM = '172.18.0.5'
const EDGE = '162.158.90.12'
const VISITOR = '203.0.113.50'

describe('normalizeIp', () => {
  it.each([
    ['::ffff:203.0.113.5', '203.0.113.5'],
    ['[2001:db8::1]', '2001:db8::1'],
    ['203.0.113.5:443', '203.0.113.5'],
    ['fe80::1%eth0', 'fe80::1'],
    ['2001:DB8::A', '2001:db8::a'],
    ['not-an-ip', null],
    ['', null],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeIp(input)).toBe(expected)
  })
})

describe('resolveClientIp', () => {
  it('uses the socket address when no proxy is trusted', () => {
    const result = resolveClientIp(
      { socket: VISITOR, forwardedFor: '198.51.100.1', peer: undefined },
      noProxies,
    )
    expect(result).toEqual({ ip: VISITOR, viaCloudflare: false })
  })

  it('ignores forwarded headers from an untrusted socket peer', () => {
    const result = resolveClientIp(
      { socket: VISITOR, forwardedFor: '198.51.100.1', peer: '198.51.100.1' },
      behindCloudflare,
    )
    expect(result).toEqual({ ip: VISITOR, viaCloudflare: false })
  })

  it('finds the visitor behind Cloudflare and Nginx Proxy Manager', () => {
    const result = resolveClientIp(
      { socket: NPM, forwardedFor: `${VISITOR}, ${EDGE}`, peer: undefined },
      behindCloudflare,
    )
    expect(result).toEqual({ ip: VISITOR, viaCloudflare: true })
  })

  it('skips addresses the visitor prepended to X-Forwarded-For', () => {
    const result = resolveClientIp(
      { socket: NPM, forwardedFor: `198.51.100.99, ${VISITOR}, ${EDGE}`, peer: undefined },
      behindCloudflare,
    )
    expect(result.ip).toBe(VISITOR)
  })

  it('treats a direct connection to the proxy as the client', () => {
    const result = resolveClientIp(
      { socket: NPM, forwardedFor: `198.51.100.99, ${VISITOR}`, peer: undefined },
      behindCloudflare,
    )
    expect(result).toEqual({ ip: VISITOR, viaCloudflare: false })
  })

  it('defeats a forged X-Real-IP rewrite when the proxy reports its real peer', () => {
    const forged = '198.51.100.77'
    const withoutPeer = resolveClientIp(
      { socket: NPM, forwardedFor: `${VISITOR}, ${forged}`, peer: undefined },
      behindCloudflare,
    )
    expect(withoutPeer.ip).toBe(forged)
    const withPeer = resolveClientIp(
      { socket: NPM, forwardedFor: `${VISITOR}, ${forged}`, peer: EDGE },
      behindCloudflare,
    )
    expect(withPeer).toEqual({ ip: VISITOR, viaCloudflare: true })
  })

  it('does not trust Cloudflare headers when the proxy peer is not Cloudflare', () => {
    const result = resolveClientIp(
      { socket: NPM, forwardedFor: `198.51.100.1, ${VISITOR}`, peer: VISITOR },
      behindCloudflare,
    )
    expect(result).toEqual({ ip: VISITOR, viaCloudflare: false })
  })

  it('stops at a malformed entry and returns the last trusted reporter', () => {
    const result = resolveClientIp(
      { socket: NPM, forwardedFor: `garbage, ${EDGE}`, peer: undefined },
      behindCloudflare,
    )
    expect(result).toEqual({ ip: EDGE, viaCloudflare: false })
  })

  it('returns the socket for internal requests without forwarding headers', () => {
    const result = resolveClientIp(
      { socket: '127.0.0.1', forwardedFor: undefined, peer: undefined },
      behindCloudflare,
    )
    expect(result).toEqual({ ip: '127.0.0.1', viaCloudflare: false })
  })

  it('handles a missing socket address', () => {
    expect(
      resolveClientIp(
        { socket: undefined, forwardedFor: VISITOR, peer: undefined },
        behindCloudflare,
      ),
    ).toEqual({
      ip: '0.0.0.0',
      viaCloudflare: false,
    })
  })

  it('supports IPv6 visitors behind Cloudflare', () => {
    const result = resolveClientIp(
      { socket: NPM, forwardedFor: '2001:db8::5, 2606:4700:10::1', peer: undefined },
      behindCloudflare,
    )
    expect(result).toEqual({ ip: '2001:db8::5', viaCloudflare: true })
  })
})
