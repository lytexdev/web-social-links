<script setup lang="ts">
const { locale } = useAdminI18n()
useHead({ htmlAttrs: { lang: locale } })
</script>

<template>
  <main id="main" class="mx-auto grid min-h-dvh w-full max-w-[28rem] content-center px-5 py-12">
    <slot />
    <ToastRegion />
  </main>
</template>
