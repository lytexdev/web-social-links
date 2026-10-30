<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'

interface MediaItem {
  id: string
  alt: string
  preview: string
  width: number
  height: number
}

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ current: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()
const { t } = useAdminI18n()
const { request } = useApi()
const items = ref<MediaItem[]>([])
const query = ref('')

async function load(): Promise<void> {
  items.value = await request<MediaItem[]>('/api/admin/media')
}

watch(open, (value) => {
  if (value) load().catch(() => undefined)
})

const filtered = computed(() => {
  const term = query.value.trim().toLowerCase()
  return term ? items.value.filter((item) => item.alt.toLowerCase().includes(term)) : items.value
})

function choose(id: string): void {
  emit('select', id)
  open.value = false
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="a-dialog-overlay" />
      <DialogContent class="a-dialog a-dialog-wide">
        <DialogTitle class="a-subheading">{{ t.media.pickerTitle }}</DialogTitle>
        <DialogDescription class="sr-only">{{ t.media.search }}</DialogDescription>
        <div class="mt-4 grid gap-4">
          <MediaUploader compact @uploaded="load" />
          <input
            v-model="query"
            type="search"
            class="a-input"
            :aria-label="t.media.search"
            :placeholder="t.media.search"
          />
          <p v-if="filtered.length === 0" class="a-hint">{{ t.media.empty }}</p>
          <ul class="grid max-h-[22rem] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            <li v-for="item in filtered" :key="item.id">
              <button
                type="button"
                class="block w-full overflow-hidden rounded-md border-2 bg-surface"
                :class="item.id === props.current ? 'border-accent' : 'border-transparent'"
                :aria-pressed="item.id === props.current"
                :aria-label="item.alt || t.media.altMissing"
                @click="choose(item.id)"
              >
                <img
                  :src="item.preview"
                  alt=""
                  class="aspect-square w-full object-cover"
                  loading="lazy"
                />
              </button>
            </li>
          </ul>
        </div>
        <div class="mt-4 flex justify-end">
          <button type="button" class="a-btn" @click="open = false">{{ t.common.close }}</button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
