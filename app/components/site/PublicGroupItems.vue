<script setup lang="ts">
import type { LinkView, PublicText, TileView } from '#shared/types/public'

defineProps<{
  layout: 'list' | 'grid-2' | 'grid-3' | 'icons'
  items: Array<LinkView | TileView>
  text: PublicText
  arrow: string
}>()
</script>

<template>
  <ul v-if="layout === 'icons'" class="p-icons">
    <li v-for="item in items" :key="item.id">
      <a
        :href="item.href"
        :target="item.newTab ? '_blank' : undefined"
        :rel="item.newTab ? 'noopener' : undefined"
        :aria-label="
          [
            item.kind === 'link' ? item.title : item.label,
            item.affiliate ? text.affiliate : '',
            item.newTab ? text.newTab : '',
          ]
            .filter(Boolean)
            .join(', ')
        "
      >
        <span class="contents" aria-hidden="true" v-html="item.icon ?? arrow" />
      </a>
    </li>
  </ul>
  <ul v-else-if="layout === 'list'" class="p-list">
    <li v-for="item in items" :key="item.id">
      <PublicLink v-if="item.kind === 'link'" :link="item" :text="text" :arrow="arrow" />
      <PublicTile v-else :tile="item" :text="text" />
    </li>
  </ul>
  <ul v-else class="p-grid" :data-layout="layout">
    <li v-for="item in items" :key="item.id">
      <PublicTile v-if="item.kind === 'tile'" :tile="item" :text="text" />
      <PublicLink v-else :link="item" :text="text" :arrow="arrow" />
    </li>
  </ul>
</template>
