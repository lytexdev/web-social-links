<script setup lang="ts">
import type { DocumentModel } from '#shared/types/public'

defineProps<{ model: DocumentModel }>()
</script>

<template>
  <div class="p-document">
    <a href="/" class="p-back"
      ><span aria-hidden="true" v-html="model.icons.back" />{{ model.text.back }}</a
    >
    <main id="main">
      <h1 class="p-name mt-4">{{ model.heading }}</h1>
      <div class="p-parts mt-8">
        <template v-for="(part, index) in model.parts" :key="index">
          <div v-if="part.kind === 'html'" class="p-prose" v-html="part.html" />
          <PublicBlock v-else :block="part.block" :chrome="model" />
        </template>
      </div>
    </main>
    <PublicFooter :footer="model.footer" :text="model.text" />
    <PublicThemeToggle :chrome="model" />
    <PublicToTop :label="model.text.toTop" :icon="model.icons.top" />
  </div>
</template>
