<script setup lang="ts">
import type { ImageView } from '#shared/types/public'

defineProps<{ image: ImageView; eager?: boolean; alt?: string }>()
</script>

<template>
  <picture>
    <source v-if="image.avif" type="image/avif" :srcset="image.avif" :sizes="image.sizes" />
    <source type="image/webp" :srcset="image.webp" :sizes="image.sizes" />
    <img
      :src="image.src"
      :width="image.width"
      :height="image.height"
      :alt="alt ?? image.alt"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="eager ? 'high' : undefined"
      decoding="async"
    />
  </picture>
</template>
