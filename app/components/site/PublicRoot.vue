<script setup lang="ts">
import type { PublicModel } from '#shared/types/public'

const event = useRequestEvent()
const model = event?.context.publicModel as PublicModel | undefined
if (!model) throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true })

const meta = [
  { name: 'description', content: model.description },
  { name: 'robots', content: 'noindex, nofollow' },
  { property: 'og:type', content: 'website' },
  { property: 'og:title', content: model.title },
  { property: 'og:description', content: model.description },
  { property: 'og:url', content: model.canonical },
  { name: 'twitter:card', content: model.ogImage ? 'summary_large_image' : 'summary' },
  { name: 'twitter:title', content: model.title },
  { name: 'twitter:description', content: model.description },
  ...(model.ogImage
    ? [
        { property: 'og:image', content: model.ogImage },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:image', content: model.ogImage },
      ]
    : []),
]

useHead({
  title: model.title,
  htmlAttrs: { lang: model.lang },
  bodyAttrs: { class: 'p-body', 'data-bg': model.background, 'data-rows': model.rowStyle },
  meta,
  link: model.favicon ? [{ rel: 'icon', href: model.favicon, type: 'image/webp' }] : [],
  style: [{ key: 'theme', innerHTML: model.themeCss }],
})
</script>

<template>
  <PublicPage v-if="model.kind === 'page'" :model="model" />
  <PublicDocument v-else :model="model" />
</template>
