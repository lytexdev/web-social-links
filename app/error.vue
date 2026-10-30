<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const t = useMessages().error

const status = computed(() => props.error.statusCode || 500)
const copy = computed(() => {
  if (status.value === 404) return { title: t.notFoundTitle, body: t.notFoundBody }
  if (status.value === 429) return { title: t.tooManyTitle, body: t.tooManyBody }
  if (status.value === 403) return { title: t.forbiddenTitle, body: t.forbiddenBody }
  return { title: t.genericTitle, body: t.genericBody }
})

useHead({ title: () => `${status.value} ${copy.value.title}` })
</script>

<template>
  <main class="mx-auto flex min-h-dvh max-w-[40rem] flex-col justify-center gap-6 px-6 py-16">
    <p class="label text-muted">{{ t.status }} {{ status }}</p>
    <h1 class="text-display font-extrabold leading-none tracking-[-0.02em]">{{ copy.title }}</h1>
    <p class="max-w-[32rem] text-muted">{{ copy.body }}</p>
    <a
      href="/"
      class="group inline-flex min-h-11 w-fit items-center gap-3 border-t border-line pt-4 font-semibold"
    >
      {{ t.home }}
      <span
        aria-hidden="true"
        class="text-accent transition-transform duration-150 ease-out group-hover:-translate-x-0.5"
        >&larr;</span
      >
    </a>
  </main>
</template>
