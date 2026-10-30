<script setup lang="ts">
import montserratLatin from '@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2?url'

useHead({
  link: [
    {
      rel: 'preload',
      as: 'font',
      type: 'font/woff2',
      href: montserratLatin,
      crossorigin: 'anonymous',
    },
  ],
})
</script>

<template>
  <NuxtPage />
</template>
