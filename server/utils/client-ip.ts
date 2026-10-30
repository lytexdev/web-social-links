import type { BlockList } from 'node:net'
import { blockListHas, normalizeIp } from './cidr'

const MAX_CHAIN = 20

export interface ProxyTrust {
  trusted: BlockList
  cloudflare: BlockList
}

export interface ClientIpInput {
  socket: string | undefined
  forwardedFor: string | undefined
  peer: string | undefined
}

export interface ClientIp {
  ip: string
  viaCloudflare: boolean
}

const UNKNOWN: ClientIp = { ip: '0.0.0.0', viaCloudflare: false }

export function resolveClientIp(input: ClientIpInput, trust: ProxyTrust): ClientIp {
  const socket = normalizeIp(input.socket ?? '')
  if (!socket) return UNKNOWN
  if (!blockListHas(trust.trusted, socket)) return { ip: socket, viaCloudflare: false }

  const chain = (input.forwardedFor ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .slice(-MAX_CHAIN)

  if (input.peer !== undefined) {
    if (chain.length > 0) chain[chain.length - 1] = input.peer
    else chain.push(input.peer)
  }

  let reporter = socket
  for (let index = chain.length - 1; index >= 0; index--) {
    const candidate = normalizeIp(chain[index] ?? '')
    if (!candidate) return { ip: reporter, viaCloudflare: false }
    if (!blockListHas(trust.trusted, candidate)) {
      return { ip: candidate, viaCloudflare: blockListHas(trust.cloudflare, reporter) }
    }
    reporter = candidate
  }
  return { ip: reporter, viaCloudflare: false }
}
