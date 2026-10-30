<script setup lang="ts">
import type { PublicText, TileView } from '#shared/types/public'

defineProps<{ tile: TileView; text: PublicText }>()
</script>

<template>
  <a
    :href="tile.href"
    class="p-tile"
    :target="tile.newTab ? '_blank' : undefined"
    :rel="tile.newTab ? 'noopener' : undefined"
  >
    <span class="p-tile-media" aria-hidden="true">
      <PublicPicture v-if="tile.image" :image="tile.image" alt="" />
      <span v-else-if="tile.icon" class="contents" v-html="tile.icon" />
    </span>
    <span class="flex flex-wrap items-center gap-2">
      <span class="p-title text-sm">{{ tile.label }}</span>
      <span v-if="tile.affiliate" class="p-tag">{{ text.affiliate }}</span>
      <span v-if="tile.newTab" class="sr-only"> ({{ text.newTab }})</span>
    </span>
  </a>
</template>
