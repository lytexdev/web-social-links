<script setup lang="ts">
import type { ChromeModel, PublicText } from '#shared/types/public'

defineProps<{ footer: ChromeModel['footer']; text: PublicText }>()
</script>

<template>
  <footer class="p-footer">
    <p v-if="footer.affiliateNote">{{ footer.affiliateNote }}</p>
    <p v-if="footer.note">{{ footer.note }}</p>
    <p v-for="(notice, index) in footer.notices" :key="index">{{ notice }}</p>
    <nav :aria-label="text.legalNav">
      <a v-for="link in footer.legal" :key="link.href" :href="link.href">{{ link.label }}</a>
    </nav>
    <p v-if="footer.revision" class="p-revision">{{ footer.revision }}</p>
  </footer>
</template>
