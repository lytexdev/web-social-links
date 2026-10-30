<script setup lang="ts">
export interface BarItem {
  key: string
  label: string
  value: number
  detail?: string
}

const props = defineProps<{ items: BarItem[]; actionLabel?: (item: BarItem) => string }>()
const emit = defineEmits<{ select: [key: string] }>()
const { t, locale } = useAdminI18n()
const number = computed(() => new Intl.NumberFormat(locale.value))
const max = computed(() => Math.max(1, ...props.items.map((item) => item.value)))
</script>

<template>
  <p v-if="items.length === 0" class="text-sm text-muted">{{ t.stats.empty }}</p>
  <ul v-else class="a-viz grid gap-2">
    <li
      v-for="item in items"
      :key="item.key"
      class="grid gap-1"
      :title="`${item.label}: ${number.format(item.value)}${item.detail ? ` · ${item.detail}` : ''}`"
    >
      <div class="flex items-baseline justify-between gap-3 text-sm">
        <button
          v-if="actionLabel"
          type="button"
          class="min-h-6 truncate text-left underline-offset-4 hover:underline"
          :aria-label="actionLabel(item)"
          @click="emit('select', item.key)"
        >
          {{ item.label }}
        </button>
        <span v-else class="truncate">{{ item.label }}</span>
        <span class="shrink-0 tabular">
          <span class="font-semibold">{{ number.format(item.value) }}</span>
          <span v-if="item.detail" class="ml-2 text-xs text-muted">{{ item.detail }}</span>
        </span>
      </div>
      <div class="h-3" aria-hidden="true">
        <div
          class="h-3 rounded-r bg-[var(--viz-views)]"
          :style="{ width: `${Math.max(1, (item.value / max) * 100)}%` }"
        />
      </div>
    </li>
  </ul>
</template>
