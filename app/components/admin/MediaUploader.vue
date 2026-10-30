<script setup lang="ts">
import { IconUpload } from '@tabler/icons-vue'

defineProps<{ compact?: boolean }>()
const emit = defineEmits<{ uploaded: [id: string] }>()
const { t, f } = useAdminI18n()
const session = useAdminSession()
const uploadMb = computed(() =>
  session.me.value?.authenticated ? session.me.value.uploadMaxMb : 10,
)
const upload = useUpload()
const toasts = useToasts()
const input = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const progress = ref<Array<{ name: string; value: number }>>([])

async function handle(files: Iterable<File>): Promise<void> {
  for (const file of files) {
    const entry = reactive({ name: file.name, value: 0 })
    progress.value.push(entry)
    try {
      const result = (await upload.send(
        '/api/admin/media',
        file,
        (value) => (entry.value = value),
      )) as {
        media: { id: string }
        duplicate: boolean
      }
      toasts.push(
        f(result.duplicate ? t.value.media.duplicate : t.value.media.uploaded, { name: file.name }),
      )
      emit('uploaded', result.media.id)
    } catch (failure) {
      const parsed = toFailure(failure)
      toasts.push(
        `${file.name}: ${t.value.media.errors[parsed.code] ?? useFailureMessage()(parsed)}`,
        { tone: 'error', duration: 8000 },
      )
    } finally {
      progress.value = progress.value.filter((item) => item !== entry)
    }
  }
}

function onDrop(event: DragEvent): void {
  dragging.value = false
  if (event.dataTransfer?.files) handle(event.dataTransfer.files)
}

function onPaste(event: ClipboardEvent): void {
  const files = [...(event.clipboardData?.files ?? [])]
  if (files.length > 0) handle(files)
}

onMounted(() => window.addEventListener('paste', onPaste))
onBeforeUnmount(() => window.removeEventListener('paste', onPaste))
</script>

<template>
  <div
    class="grid gap-2 rounded-md border border-dashed p-4 text-sm"
    :class="[dragging ? 'border-accent bg-surface' : 'border-line', compact ? '' : 'py-8']"
    @dragover.prevent="dragging = true"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
  >
    <p class="flex flex-wrap items-center gap-2">
      <IconUpload :size="18" aria-hidden="true" />
      {{ t.media.drop }}
      <button type="button" class="a-btn a-btn-sm" @click="input?.click()">
        {{ t.media.choose }}
      </button>
    </p>
    <p class="a-hint">{{ f(t.media.formats, { mb: uploadMb }) }}</p>
    <input
      ref="input"
      type="file"
      class="sr-only"
      accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml"
      multiple
      tabindex="-1"
      aria-hidden="true"
      @change="
        (handle(($event.target as HTMLInputElement).files ?? []),
        (($event.target as HTMLInputElement).value = ''))
      "
    />
    <ul v-if="progress.length > 0" class="grid gap-1" aria-live="polite">
      <li v-for="item in progress" :key="item.name" class="grid gap-1">
        <span>{{ f(t.media.uploading, { name: item.name }) }}</span>
        <progress class="h-1 w-full accent-[var(--wsl-accent)]" max="1" :value="item.value">
          {{ Math.round(item.value * 100) }}%
        </progress>
      </li>
    </ul>
  </div>
</template>
