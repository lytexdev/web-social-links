<script setup lang="ts">
const model = defineModel<string | null>({ required: true })
defineProps<{ label: string; hint?: string }>()
const { t } = useAdminI18n()
const { request } = useApi()
const picker = ref(false)
const preview = ref('')

watch(
  model,
  async (id) => {
    preview.value = ''
    if (!id) return
    const list = await request<Array<{ id: string; preview: string }>>('/api/admin/media')
    preview.value = list.find((item) => item.id === id)?.preview ?? ''
  },
  { immediate: true },
)
</script>

<template>
  <div class="grid gap-1.5">
    <span class="a-label">{{ label }}</span>
    <div class="flex flex-wrap items-center gap-3">
      <span
        class="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-line bg-surface"
      >
        <img v-if="preview" :src="preview" alt="" class="h-full w-full object-cover" />
      </span>
      <button type="button" class="a-btn a-btn-sm" @click="picker = true">
        {{ t.blockFields.chooseImage }}
      </button>
      <button v-if="model" type="button" class="a-btn a-btn-sm a-btn-quiet" @click="model = null">
        {{ t.blockFields.removeImage }}
      </button>
    </div>
    <p v-if="hint" class="a-hint">{{ hint }}</p>
    <MediaPicker v-model:open="picker" :current="model" @select="model = $event" />
  </div>
</template>
