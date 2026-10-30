<script setup lang="ts">
const { t } = useAdminI18n()
const status = usePublishStatus()
const source = ref('direct')
const { request } = useApi()
const sources = ref<Array<{ key: string; label: string }>>([])

onMounted(async () => {
  const result = await request<{ sources: Array<{ key: string; label: string }> }>(
    '/api/admin/sources',
  )
  sources.value = result.sources
})

const src = computed(
  () => `/admin/preview?source=${encodeURIComponent(source.value)}&v=${status.previewStamp.value}`,
)
</script>

<template>
  <div class="grid gap-3">
    <label class="flex items-center gap-3 text-sm">
      <span class="a-label">{{ t.editor.previewSource }}</span>
      <select v-model="source" class="a-select min-h-9 max-w-[12rem] py-1 text-sm">
        <option value="direct">direct</option>
        <option v-for="item in sources" :key="item.key" :value="item.key">{{ item.label }}</option>
      </select>
    </label>
    <div class="mx-auto w-full max-w-[24.375rem]">
      <iframe :src="src" :title="t.editor.previewTitle" class="a-preview-frame" loading="lazy" />
    </div>
  </div>
</template>
