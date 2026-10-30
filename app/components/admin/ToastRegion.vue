<script setup lang="ts">
import { IconX } from '@tabler/icons-vue'
import type { Toast } from '~/composables/use-toasts'

const { toasts, dismiss } = useToasts()
const { t } = useAdminI18n()
const timers = new Map<number, ReturnType<typeof setTimeout>>()

watch(
  toasts,
  (list) => {
    for (const toast of list) {
      if (!timers.has(toast.id))
        timers.set(
          toast.id,
          setTimeout(() => close(toast.id), toast.duration),
        )
    }
  },
  { deep: true },
)

function close(id: number): void {
  clearTimeout(timers.get(id))
  timers.delete(id)
  dismiss(id)
}

async function act(toast: Toast): Promise<void> {
  close(toast.id)
  await toast.action?.run()
}
</script>

<template>
  <div
    class="pointer-events-none fixed right-4 bottom-4 z-50 grid w-[min(24rem,calc(100vw-2rem))] gap-2"
  >
    <div role="status" aria-live="polite" class="contents">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-center gap-3 rounded-md border bg-surface px-4 py-3 text-sm"
        :class="toast.tone === 'error' ? 'border-[var(--wsl-danger)]' : 'border-line'"
      >
        <p class="flex-1">{{ toast.message }}</p>
        <button v-if="toast.action" type="button" class="a-btn a-btn-sm" @click="act(toast)">
          {{ toast.action.label }}
        </button>
        <button
          type="button"
          class="a-btn a-btn-quiet a-btn-sm a-btn-icon"
          :aria-label="t.common.close"
          @click="close(toast.id)"
        >
          <IconX :size="16" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
