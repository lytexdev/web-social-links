import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-30',
  devtools: { enabled: false },
  telemetry: false,
  pages: true,
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
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
  vite: {
    plugins: [tailwindcss()],
  },
  nitro: {
    compressPublicAssets: { brotli: true, gzip: true },
  },
})
