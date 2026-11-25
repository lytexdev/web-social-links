<script setup lang="ts">
import type { ChromeModel } from '#shared/types/public'

defineProps<{ chrome: ChromeModel }>()
</script>

<template>
  <button
    v-if="chrome.themeToggle"
    type="button"
    class="p-theme"
    data-theme-toggle
    :data-scheme="chrome.themeScheme"
    :data-label-light="chrome.text.themeLight"
    :data-label-dark="chrome.text.themeDark"
    :aria-label="chrome.text.themeLight"
    hidden
  >
    <span class="p-theme-icon" data-theme-sun aria-hidden="true" v-html="chrome.icons.sun" />
    <span
      class="p-theme-icon"
      data-theme-moon
      aria-hidden="true"
      hidden
      v-html="chrome.icons.moon"
    />
  </button>
</template>
