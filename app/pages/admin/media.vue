<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface MediaItem {
  id: string
  width: number
  height: number
  alt: string
  decorative: boolean
  preview: string
  usages: Array<{ kind: string; label: string }>
  published: boolean
}

const { t, f } = useAdminI18n()
const { request } = useApi()
const upload = useUpload()
const toasts = useToasts()
const items = ref<MediaItem[]>([])
const query = ref('')
const removing = ref<MediaItem | null>(null)
const replaceInput = ref<HTMLInputElement | null>(null)
const replacing = ref<string | null>(null)
const timers = new Map<string, ReturnType<typeof setTimeout>>()

useHead({ title: () => t.value.media.title })

async function load(): Promise<void> {
  items.value = await request<MediaItem[]>('/api/admin/media')
}

onMounted(load)

const filtered = computed(() => {
  const term = query.value.trim().toLowerCase()
  return term ? items.value.filter((item) => item.alt.toLowerCase().includes(term)) : items.value
})

function saveText(item: MediaItem): void {
  clearTimeout(timers.get(item.id))
  timers.set(
    item.id,
    setTimeout(async () => {
      await request(`/api/admin/media/${item.id}`, {
        method: 'PATCH',
        body: { alt: item.alt, decorative: item.decorative },
      })
    }, 500),
  )
}

function startReplace(id: string): void {
  replacing.value = id
  replaceInput.value?.click()
}

async function replace(files: FileList | null): Promise<void> {
  const file = files?.[0]
  const id = replacing.value
  if (!file || !id) return
  try {
    await upload.send(`/api/admin/media/${id}/file`, file, () => undefined, 'PUT')
    toasts.push(t.value.media.replaced)
    await load()
  } catch (failure) {
    const parsed = toFailure(failure)
    toasts.push(t.value.media.errors[parsed.code] ?? useFailureMessage()(parsed), { tone: 'error' })
  }
}

async function remove(): Promise<void> {
  const item = removing.value
  if (!item) return
  try {
    await request(`/api/admin/media/${item.id}`, { method: 'DELETE' })
    toasts.push(t.value.media.deleted)
    removing.value = null
    await load()
  } catch (failure) {
    toasts.push(useFailureMessage()(toFailure(failure)), { tone: 'error' })
  }
}
</script>

<template>
  <div>
    <PublishBar :title="t.media.title" />
    <div class="grid gap-6">
      <MediaUploader @uploaded="load" />
      <input
        v-model="query"
        type="search"
        class="a-input max-w-[24rem]"
        :aria-label="t.media.search"
        :placeholder="t.media.search"
      />
      <p v-if="items.length === 0" class="text-sm text-muted">{{ t.media.empty }}</p>
      <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <li
          v-for="item in filtered"
          :key="item.id"
          class="grid gap-3 rounded-md border border-line p-3"
        >
          <img
            :src="item.preview"
            :alt="item.alt"
            class="aspect-[4/3] w-full rounded bg-surface object-contain"
            loading="lazy"
          />
          <p class="text-xs text-muted tabular">
            {{ f(t.media.dimensions, { width: item.width, height: item.height }) }}
          </p>
          <AdminField
            v-slot="field"
            :label="t.media.alt"
            :error="!item.alt && !item.decorative ? t.media.altMissing : undefined"
          >
            <input
              :id="field.id"
              v-model="item.alt"
              class="a-input"
              maxlength="200"
              :disabled="item.decorative"
              :aria-invalid="field.invalid"
              :aria-describedby="field.describedby"
              @input="saveText(item)"
            />
          </AdminField>
          <label class="flex items-center gap-3 text-sm">
            <input
              v-model="item.decorative"
              type="checkbox"
              class="a-check"
              @change="saveText(item)"
            />
            {{ t.media.decorative }}
          </label>
          <p class="text-sm text-muted">
            {{
              item.usages.length > 0
                ? f(t.media.usage, { count: item.usages.length })
                : t.media.unused
            }}
            <span v-if="item.published"> · {{ t.media.published }}</span>
          </p>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="a-btn a-btn-sm" @click="startReplace(item.id)">
              {{ t.media.replace }}
            </button>
            <button type="button" class="a-btn a-btn-sm a-btn-danger" @click="removing = item">
              {{ t.media.delete }}
            </button>
          </div>
        </li>
      </ul>
    </div>
    <input
      ref="replaceInput"
      type="file"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      accept="image/*"
      @change="
        (replace(($event.target as HTMLInputElement).files),
        (($event.target as HTMLInputElement).value = ''))
      "
    />
    <ConfirmDialog
      :open="removing !== null"
      :title="t.media.delete"
      :body="
        removing && (removing.usages.length > 0 || removing.published)
          ? f(t.media.deleteBlocked, {
              list: [
                ...removing.usages.map((usage) => usage.label),
                ...(removing.published ? [t.media.published] : []),
              ].join(', '),
            })
          : t.media.deleteConfirm
      "
      :confirm-label="t.media.delete"
      danger
      :busy="!!removing && (removing.usages.length > 0 || removing.published)"
      @update:open="!$event && (removing = null)"
      @confirm="remove"
    />
  </div>
</template>
