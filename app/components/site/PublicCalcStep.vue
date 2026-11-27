<script setup lang="ts">
defineProps<{ index: number; title: string; step: string; wide?: boolean }>()
</script>

<template>
  <fieldset class="c-step" :class="{ 'c-step-wide': wide }">
    <legend class="c-step-head">
      <span class="c-step-num" aria-hidden="true">{{ index }}</span>
      <span class="sr-only">{{ step }} {{ index }}: </span>
      <span>{{ title }}</span>
    </legend>
    <div class="c-fields"><slot /></div>
  </fieldset>
</template>
