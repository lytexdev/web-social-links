import { routeKind } from '../utils/route-kind'

const SPECULATION_RULES = /<script type="speculationrules">[\s\S]*?<\/script>/g

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    html.head = html.head.map((chunk) => chunk.replace(SPECULATION_RULES, ''))
    const path = event.path.split('?')[0] ?? ''
    if (routeKind(path) !== 'public-page' && path !== '/admin/preview') return
    html.bodyAppend.push('<script src="/js/enhance.js" defer></script>')
  })
})
