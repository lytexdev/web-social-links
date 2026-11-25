<script setup lang="ts">
defineProps<{ label: string; icon: string }>()
</script>

<template>
  <a href="#main" class="p-top" data-to-top hidden>
    <span aria-hidden="true" v-html="icon" />
    <span class="sr-only">{{ label }}</span>
  </a>
</template>
