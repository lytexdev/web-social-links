import MarkdownIt, {
  type MarkdownIt as Instance,
  type RendererRule,
  type StateCore,
} from 'markdown-it'
import { checkLinkUrl } from '../../shared/utils/url-policy'

interface LinkEnv {
  links?: string[]
  rewrite?: (index: number) => string
}

function linkEnv(env: unknown): LinkEnv {
  return (env ?? {}) as LinkEnv
}

function create(rules: string[]): Instance {
  const md = new MarkdownIt('zero', {
    html: false,
    linkify: false,
    typographer: false,
    breaks: true,
  })
  md.enable(rules)
  md.validateLink = (url: string) =>
    (url.startsWith('/') && !url.startsWith('//')) || checkLinkUrl(url).ok
  const defaultLinkOpen: RendererRule =
    md.renderer.rules.link_open ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const state = linkEnv(env)
    if (token) {
      const href = String(token.attrGet('href') ?? '')
      if (state.links && state.rewrite) {
        state.links.push(href)
        token.attrSet('href', state.rewrite(state.links.length - 1))
      }
      token.attrSet('rel', 'noopener')
    }
    return defaultLinkOpen(tokens, idx, options, env, self)
  }
  return md
}

const inline = create(['paragraph', 'newline', 'emphasis', 'link', 'list', 'escape', 'backticks'])
function shiftHeadings(md: Instance): Instance {
  md.core.ruler.push('shift_headings', (state: StateCore) => {
    for (const token of state.tokens) {
      if (token.type === 'heading_open' || token.type === 'heading_close') {
        const level = Math.max(2, Number(token.tag.slice(1)))
        token.tag = `h${level}`
      }
    }
  })
  return md
}

function captions(md: Instance): Instance {
  md.core.ruler.push('captions', (state: StateCore) => {
    const tokens = state.tokens
    for (let index = 0; index + 2 < tokens.length; index++) {
      const open = tokens[index]
      const body = tokens[index + 1]
      const close = tokens[index + 2]
      if (open?.type !== 'paragraph_open' || body?.type !== 'inline') continue
      if (close?.type !== 'paragraph_close') continue
      const children = body.children ?? []
      const shape = children.map((token) => token.type).join(' ')
      if (shape !== 'image' && shape !== 'link_open image link_close') continue
      const image = children.find((token) => token.type === 'image')
      const caption = String(image?.attrGet('title') ?? '').trim()
      if (!image || !caption) continue
      image.attrs = (image.attrs ?? []).filter(([name]) => name !== 'title')
      open.type = 'figure_open'
      open.tag = 'figure'
      close.type = 'figure_close'
      close.tag = 'figure'
      const captionOpen = new state.Token('figcaption_open', 'figcaption', 1)
      const text = new state.Token('text', '', 0)
      text.content = caption
      const captionClose = new state.Token('figcaption_close', 'figcaption', -1)
      tokens.splice(index + 2, 0, captionOpen, text, captionClose)
      index += 4
    }
  })
  return md
}

const document = captions(
  shiftHeadings(
    create([
      'paragraph',
      'newline',
      'emphasis',
      'link',
      'list',
      'heading',
      'lheading',
      'blockquote',
      'hr',
      'escape',
      'backticks',
      'table',
      'image',
    ]),
  ),
)

function linkified(md: Instance): Instance {
  md.set({ linkify: true })
  md.enable('linkify')
  md.linkify.set({ fuzzyLink: false, fuzzyEmail: false, fuzzyIP: false })
  return md
}

function headingsFrom(md: Instance, minimum: number): Instance {
  md.core.ruler.push('min_headings', (state: StateCore) => {
    for (const token of state.tokens) {
      if (token.type === 'heading_open' || token.type === 'heading_close') {
        token.tag = `h${Math.min(6, Math.max(minimum, Number(token.tag.slice(1)) + 1))}`
      }
    }
  })
  return md
}

const referenceInline = linkified(create(['emphasis', 'link', 'escape', 'backticks']))
const referenceBlock = headingsFrom(
  linkified(
    create([
      'paragraph',
      'newline',
      'emphasis',
      'link',
      'list',
      'heading',
      'blockquote',
      'escape',
      'backticks',
      'table',
    ]),
  ),
  3,
)

export function renderReferenceInline(source: string): string {
  return referenceInline.renderInline(source, {})
}

export function renderReferenceBlock(source: string): string {
  return referenceBlock.render(source, {})
}

export function renderTextMarkdown(
  source: string,
  rewrite: (index: number) => string,
): { html: string; links: string[] } {
  const links: string[] = []
  const html = inline.render(source, { links, rewrite })
  return { html, links }
}

export function renderDocumentMarkdown(source: string): string {
  return document.render(source, {})
}

export function hasPlaceholders(source: string): boolean {
  return /\{\{[^}]{1,80}\}\}/.test(source)
}
