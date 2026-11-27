<script setup lang="ts">
import { IconStack2 } from '@tabler/icons-vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import type { BlockNode } from '#shared/schemas/content'

const emit = defineEmits<{ insert: [id: string] }>()
const { t } = useAdminI18n()
const { request } = useApi()
const open = ref(false)
const query = ref('')
const active = ref(0)
const nodes = ref<BlockNode[]>([])

const SKIPPED = ['divider', 'spacer']

function labelOf(node: BlockNode): string {
  const data = node.data
  const value = [data.title, data.label, data.text, data.alt].find(
    (entry) => typeof entry === 'string' && entry.trim() !== '',
  )
  return typeof value === 'string' ? value : (t.value.types[node.type]?.name ?? node.type)
}

const items = computed(() => {
  const term = query.value.trim().toLowerCase()
  return nodes.value
    .flatMap((node) => [node, ...node.children])
    .filter((node) => !SKIPPED.includes(node.type))
    .map((node) => ({ id: node.id, type: node.type, label: labelOf(node) }))
    .filter(
      (item) =>
        !term ||
        item.label.toLowerCase().includes(term) ||
        (t.value.types[item.type]?.name ?? '').toLowerCase().includes(term),
    )
})

watch(open, async (value) => {
  if (!value) return
  query.value = ''
  active.value = 0
  nodes.value = await request<BlockNode[]>('/api/admin/blocks')
})
watch(query, () => (active.value = 0))

function choose(id: string): void {
  open.value = false
  emit('insert', id)
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    active.value = Math.min(items.value.length - 1, active.value + 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = Math.max(0, active.value - 1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const item = items.value[active.value]
    if (item) choose(item.id)
  }
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button type="button" class="a-btn a-btn-sm">
        <IconStack2 :size="16" aria-hidden="true" />
        {{ t.pages.insertBlock }}
      </button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        class="a-menu w-[min(24rem,calc(100vw-2rem))] p-2"
        :side-offset="6"
        align="start"
      >
        <input
          v-model="query"
          type="search"
          class="a-input mb-2"
          :aria-label="t.pages.embedSearch"
          :placeholder="t.pages.embedSearch"
          role="combobox"
          aria-expanded="true"
          aria-controls="embed-options"
          :aria-activedescendant="items[active] ? `embed-${items[active]?.id}` : undefined"
          @keydown="onKey"
        />
        <p v-if="items.length === 0" class="px-2 py-2 text-sm text-muted">
          {{ t.pages.embedEmpty }}
        </p>
        <ul
          id="embed-options"
          role="listbox"
          :aria-label="t.pages.insertBlock"
          class="grid max-h-80 gap-0.5 overflow-y-auto"
        >
          <li
            v-for="(item, position) in items"
            :id="`embed-${item.id}`"
            :key="item.id"
            role="option"
            :aria-selected="position === active"
            class="cursor-pointer rounded px-2 py-2 text-sm"
            :class="position === active ? 'bg-surface' : ''"
            @click="choose(item.id)"
            @mouseenter="active = position"
          >
            <span class="block font-semibold">{{ item.label }}</span>
            <span class="block text-xs text-muted">{{ t.types[item.type]?.name }}</span>
          </li>
        </ul>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
