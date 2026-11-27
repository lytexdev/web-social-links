export const BLOCK_EMBED = /^\[\[block:([A-Za-z0-9_-]{12})\]\]$/

export type EmbedPart = { kind: 'markdown' | 'block'; value: string }

export function blockEmbed(id: string): string {
  return `[[block:${id}]]`
}

export function splitEmbeds(source: string): EmbedPart[] {
  const parts: EmbedPart[] = []
  let buffer: string[] = []
  const flush = () => {
    const text = buffer.join('\n').trim()
    if (text) parts.push({ kind: 'markdown', value: text })
    buffer = []
  }
  for (const line of source.split('\n')) {
    const id = BLOCK_EMBED.exec(line.trim())?.[1]
    if (id) {
      flush()
      parts.push({ kind: 'block', value: id })
      continue
    }
    buffer.push(line)
  }
  flush()
  return parts
}

export function embeddedBlockIds(source: string): string[] {
  return splitEmbeds(source)
    .filter((part) => part.kind === 'block')
    .map((part) => part.value)
}
