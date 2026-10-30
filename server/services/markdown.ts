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
  md.validateLink = (url: string) => checkLinkUrl(url).ok
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

const document = shiftHeadings(
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
  ]),
)

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
