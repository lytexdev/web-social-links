import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-30',
  devtools: { enabled: false },
  telemetry: false,
  pages: true,
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  components: [{ path: '~/components', pathPrefix: false }],
  typescript: {
    strict: true,
    typeCheck: false,
  },
  eslint: {
    config: {
      stylistic: false,
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'de' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
    },
  },
  routeRules: {
    '/**': {
      noScripts: true,
      headers: {
        'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex',
        'x-content-type-options': 'nosniff',
        'cross-origin-resource-policy': 'same-origin',
      },
    },
    '/admin/**': { ssr: false, noScripts: false },
    '/admin': { ssr: false, noScripts: false },
    '/admin/preview': { ssr: true, noScripts: true },
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  nitro: {
    compressPublicAssets: { brotli: true, gzip: true },
  },
})
