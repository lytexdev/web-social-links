<script setup lang="ts">
import type { LinkView, PublicText } from '#shared/types/public'

defineProps<{ link: LinkView; text: PublicText; arrow: string }>()
</script>

<template>
  <a
    :href="link.href"
    class="p-row"
    :data-variant="link.variant"
    :target="link.newTab ? '_blank' : undefined"
    :rel="link.newTab ? 'noopener' : undefined"
  >
    <span v-if="link.variant !== 'plain'" class="p-glyph" aria-hidden="true">
      <PublicPicture
        v-if="link.variant === 'thumbnail' && link.thumbnail"
        :image="link.thumbnail"
        alt=""
      />
      <span v-else-if="link.icon" class="contents" v-html="link.icon" />
    </span>
    <span>
      <span class="p-title block">{{ link.title }}</span>
      <span v-if="link.subtitle" class="p-sub block">{{ link.subtitle }}</span>
      <span v-if="link.newTab" class="sr-only"> ({{ text.newTab }})</span>
    </span>
    <span class="p-meta">
      <span v-if="link.badge" class="p-tag">{{ link.badge }}</span>
      <span v-if="link.affiliate" class="p-tag">{{ text.affiliate }}</span>
      <span class="p-arrow" aria-hidden="true" v-html="arrow" />
    </span>
  </a>
</template>
