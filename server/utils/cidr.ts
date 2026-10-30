import { BlockList, isIP } from 'node:net'

export interface Cidr {
  address: string
  prefix: number
  family: 'ipv4' | 'ipv6'
}

export function normalizeIp(input: string): string | null {
  let ip = input.trim()
  if (ip.startsWith('[')) {
    const end = ip.indexOf(']')
    if (end === -1) return null
    ip = ip.slice(1, end)
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d{1,5}$/.test(ip)) {
    ip = ip.slice(0, ip.lastIndexOf(':'))
  }
  const zone = ip.indexOf('%')
  if (zone !== -1) ip = ip.slice(0, zone)
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip)
  if (mapped?.[1]) ip = mapped[1]
  return isIP(ip) === 0 ? null : ip.toLowerCase()
}

export function parseCidr(input: string): Cidr | null {
  const parts = input.trim().split('/')
  if (parts.length > 2) return null
  const [rawAddress, rawPrefix] = parts
  const address = normalizeIp(rawAddress ?? '')
  if (!address) return null
  const version = isIP(address)
  const max = version === 4 ? 32 : 128
  if (rawPrefix !== undefined && !/^\d{1,3}$/.test(rawPrefix)) return null
  const prefix = rawPrefix === undefined ? max : Number(rawPrefix)
  if (prefix > max) return null
  return { address, prefix, family: version === 4 ? 'ipv4' : 'ipv6' }
}

export function buildBlockList(cidrs: readonly Cidr[]): BlockList {
  const list = new BlockList()
  for (const cidr of cidrs) list.addSubnet(cidr.address, cidr.prefix, cidr.family)
  return list
}

export function blockListHas(list: BlockList, ip: string): boolean {
  return list.check(ip, isIP(ip) === 6 ? 'ipv6' : 'ipv4')
}
