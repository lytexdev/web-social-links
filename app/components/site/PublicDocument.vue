<script setup lang="ts">
import type { DocumentModel } from '#shared/types/public'

defineProps<{ model: DocumentModel }>()
</script>

<template>
  <div class="p-document">
    <a href="/" class="p-back">{{ model.text.back }}</a>
    <main id="main">
      <h1 class="p-name mt-4">{{ model.heading }}</h1>
      <div class="p-prose mt-8" v-html="model.html" />
    </main>
    <PublicFooter :footer="model.footer" :text="model.text" />
  </div>
</template>
