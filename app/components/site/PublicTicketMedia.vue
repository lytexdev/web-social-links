<script setup lang="ts">
import type { CodeView } from '#shared/types/public'

defineProps<{ code: CodeView }>()
</script>

<template>
  <a
    v-if="code.href"
    :href="code.href"
    class="p-ticket-media"
    :data-shape="code.image ? 'image' : 'icon'"
    :aria-label="code.partner || code.label"
    :data-code-go="`c-${code.id}`"
  >
    <PublicPicture v-if="code.image" :image="code.image" alt="" />
    <span v-else class="contents" aria-hidden="true" v-html="code.icon" />
  </a>
  <span v-else class="p-ticket-media" :data-shape="code.image ? 'image' : 'icon'">
    <PublicPicture v-if="code.image" :image="code.image" alt="" />
    <span v-else class="contents" aria-hidden="true" v-html="code.icon" />
  </span>
</template>
