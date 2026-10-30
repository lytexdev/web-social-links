<script setup lang="ts">
const props = defineProps<{ iconRef: string | null; size?: number }>()
const icons = useIcons()
const svg = ref('')
const mediaSrc = ref('')
const { request } = useApi()

watch(
  () => props.iconRef,
  async (ref) => {
    svg.value = ''
    mediaSrc.value = ''
    if (!ref) return
    if (ref.startsWith('media:')) {
      const list = await request<Array<{ id: string; icon: string }>>('/api/admin/media')
      mediaSrc.value = list.find((item) => `media:${item.id}` === ref)?.icon ?? ''
      return
    }
    await icons.svgs([ref])
    svg.value = icons.cached(ref) ?? ''
  },
  { immediate: true },
)
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center"
    :class="size === 16 ? 'h-4 w-4 [&_svg]:h-4 [&_svg]:w-4' : 'h-6 w-6 [&_svg]:h-6 [&_svg]:w-6'"
    aria-hidden="true"
  >
    <img v-if="mediaSrc" :src="mediaSrc" alt="" class="h-full w-full rounded object-cover" />
    <span v-else class="contents" v-html="svg" />
  </span>
</template>
