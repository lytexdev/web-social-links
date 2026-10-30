<script setup lang="ts">
import { IconAlertTriangle, IconCheck, IconLoader2 } from '@tabler/icons-vue'

defineProps<{ title: string }>()
const { t, f, locale } = useAdminI18n()
const status = usePublishStatus()
const dialog = ref(false)
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  status.refresh().catch(() => undefined)
  ticker = setInterval(() => (now.value = Date.now()), 30_000)
})
onBeforeUnmount(() => clearInterval(ticker))

const ago = computed(() => {
  const at = status.state.value?.publishedAt
  if (!at) return ''
  const seconds = Math.round((at - now.value) / 1000)
  const format = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
  const abs = Math.abs(seconds)
  if (abs < 60) return format.format(seconds, 'second')
  if (abs < 3600) return format.format(Math.round(seconds / 60), 'minute')
  if (abs < 86_400) return format.format(Math.round(seconds / 3600), 'hour')
  return format.format(Math.round(seconds / 86_400), 'day')
})

const saveLabel = computed(() => {
  if (status.saving.value > 0 || status.pending.value.length > 0) return t.value.publish.saving
  if (status.failed.value) return t.value.publish.saveFailed
  return t.value.publish.saved
})
</script>

<template>
  <div
    class="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line pb-4"
  >
    <h1 class="a-heading">{{ title }}</h1>
    <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <p class="flex items-center gap-2 text-muted" role="status" aria-live="polite">
        <IconLoader2
          v-if="status.saving.value > 0"
          :size="16"
          class="animate-spin"
          aria-hidden="true"
        />
        <IconAlertTriangle
          v-else-if="status.failed.value"
          :size="16"
          class="text-[var(--wsl-danger)]"
          aria-hidden="true"
        />
        <IconCheck v-else :size="16" aria-hidden="true" />
        {{ saveLabel }}
      </p>
      <p v-if="status.state.value" class="text-muted tabular">
        <template v-if="status.state.value.draftChanges > 0">
          {{ f(t.publish.pending, { count: status.state.value.draftChanges }) }}
        </template>
        <template v-else>{{ t.publish.upToDate }}</template>
        <span v-if="status.state.value.revision" class="ml-2">
          · {{ f(t.publish.publishedAgo, { revision: status.state.value.revision, ago }) }}
        </span>
        <span v-else class="ml-2">· {{ t.publish.never }}</span>
      </p>
      <button type="button" class="a-btn a-btn-primary" @click="dialog = true">
        {{ t.publish.action }}
      </button>
    </div>
    <PublishDialog v-model:open="dialog" />
  </div>
</template>
