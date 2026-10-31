<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { searchIcons, type IconEntry } from '#shared/utils/icon-search'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ current: string | null }>()
const emit = defineEmits<{ select: [ref: string] }>()

const COLUMNS = 8
const ROW_HEIGHT = 48
const VIEW_ROWS = 7
const RECENT_KEY = 'wsl-recent-icons'
type Tab = 'tabler' | 'tabler-filled' | 'si' | 'recent' | 'media'

const { t, f } = useAdminI18n()
const icons = useIcons()
const { request } = useApi()
const index = ref<IconEntry[]>([])
const media = ref<IconEntry[]>([])
const mediaIcons = new Map<string, string>()
const loading = ref(true)
const query = ref('')
const tab = ref<Tab>('tabler')
const category = ref('')
const active = ref(0)
const scrollTop = ref(0)
const grid = ref<HTMLElement | null>(null)
const svgVersion = ref(0)

function recent(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

watch(open, async (value) => {
  if (!value || index.value.length > 0) return
  loading.value = true
  try {
    index.value = await icons.loadIndex()
    const list = await request<Array<{ id: string; alt: string; icon: string }>>('/api/admin/media')
    media.value = list.map((item) => {
      mediaIcons.set(`media:${item.id}`, item.icon)
      return { ref: `media:${item.id}`, name: item.alt || item.id, category: '', tags: item.alt }
    })
  } finally {
    loading.value = false
  }
})

function inTab(ref: string, current: Tab): boolean {
  return ref.startsWith(`${current}:`) || (current === 'tabler' && ref.startsWith('extra:'))
}

const categories = computed(() =>
  [
    ...new Set(
      index.value.filter((entry) => inTab(entry.ref, tab.value)).map((entry) => entry.category),
    ),
  ]
    .filter(Boolean)
    .sort(),
)

const results = computed(() => {
  let pool: IconEntry[]
  if (tab.value === 'recent') {
    const refs = recent()
    pool = refs
      .map(
        (ref) =>
          index.value.find((entry) => entry.ref === ref) ??
          media.value.find((entry) => entry.ref === ref),
      )
      .filter((entry): entry is IconEntry => entry !== undefined)
  } else if (tab.value === 'media') pool = media.value
  else pool = index.value.filter((entry) => inTab(entry.ref, tab.value))
  if (category.value) pool = pool.filter((entry) => entry.category === category.value)
  return searchIcons(pool, query.value)
})

const rowCount = computed(() => Math.ceil(results.value.length / COLUMNS))
const firstRow = computed(() => Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - 2))
const visible = computed(() => {
  const start = firstRow.value * COLUMNS
  return results.value
    .slice(start, start + (VIEW_ROWS + 4) * COLUMNS)
    .map((entry, offset) => ({ entry, index: start + offset }))
})

watch([visible, open], async () => {
  if (!open.value) return
  const refs = visible.value
    .map((item) => item.entry.ref)
    .filter((ref) => !ref.startsWith('media:'))
  if (refs.length === 0) return
  await icons.svgs(refs)
  svgVersion.value++
})

watch([query, tab, category], () => {
  active.value = 0
  scrollTop.value = 0
  if (grid.value) grid.value.scrollTop = 0
})

function svg(ref: string): string {
  void svgVersion.value
  return icons.cached(ref) ?? ''
}

function choose(ref: string): void {
  const list = [ref, ...recent().filter((item) => item !== ref)].slice(0, 24)
  localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  emit('select', ref)
  open.value = false
}

async function focusActive(): Promise<void> {
  const row = Math.floor(active.value / COLUMNS)
  const element = grid.value
  if (!element) return
  if (row * ROW_HEIGHT < element.scrollTop) element.scrollTop = row * ROW_HEIGHT
  else if ((row + 1) * ROW_HEIGHT > element.scrollTop + element.clientHeight) {
    element.scrollTop = (row + 1) * ROW_HEIGHT - element.clientHeight
  }
  scrollTop.value = element.scrollTop
  await nextTick()
  element.querySelector<HTMLElement>(`[data-index="${active.value}"]`)?.focus()
}

function onKey(event: KeyboardEvent): void {
  const total = results.value.length
  if (total === 0) return
  const moves: Record<string, number> = {
    ArrowRight: 1,
    ArrowLeft: -1,
    ArrowDown: COLUMNS,
    ArrowUp: -COLUMNS,
    PageDown: COLUMNS * VIEW_ROWS,
    PageUp: -COLUMNS * VIEW_ROWS,
  }
  if (event.key in moves) {
    event.preventDefault()
    active.value = Math.min(total - 1, Math.max(0, active.value + (moves[event.key] ?? 0)))
    focusActive()
  } else if (event.key === 'Home') {
    event.preventDefault()
    active.value = 0
    focusActive()
  } else if (event.key === 'End') {
    event.preventDefault()
    active.value = total - 1
    focusActive()
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    const entry = results.value[active.value]
    if (entry) choose(entry.ref)
  }
}

const tabs: Tab[] = ['tabler', 'tabler-filled', 'si', 'media', 'recent']
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="a-dialog-overlay" />
      <DialogContent class="a-dialog a-dialog-wide">
        <DialogTitle class="a-subheading">{{ t.icons.title }}</DialogTitle>
        <DialogDescription class="sr-only">{{ t.icons.searchHint }}</DialogDescription>
        <div class="mt-4 grid gap-3">
          <AdminField v-slot="field" :label="t.icons.search" :hint="t.icons.searchHint">
            <input
              :id="field.id"
              v-model="query"
              type="search"
              class="a-input"
              autocomplete="off"
              :aria-describedby="field.describedby"
              @keydown.down.prevent="focusActive"
            />
          </AdminField>
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div role="tablist" class="flex flex-wrap gap-1" :aria-label="t.icons.title">
              <button
                v-for="item in tabs"
                :key="item"
                type="button"
                role="tab"
                class="a-btn a-btn-sm"
                :class="tab === item ? 'a-btn-primary' : ''"
                :aria-selected="tab === item"
                @click="((tab = item), (category = ''))"
              >
                {{ t.icons.tabs[item] }}
              </button>
            </div>
            <label v-if="categories.length > 0" class="flex items-center gap-2 text-sm">
              <span class="sr-only">{{ t.icons.category }}</span>
              <select v-model="category" class="a-select min-h-8 py-1 text-sm">
                <option value="">{{ t.icons.allCategories }}</option>
                <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
              </select>
            </label>
          </div>
          <p class="a-hint" aria-live="polite">
            {{
              loading
                ? t.icons.loading
                : results.length === 0
                  ? t.icons.none
                  : f(t.icons.results, { count: results.length })
            }}
          </p>
          <div
            ref="grid"
            class="relative h-[21rem] overflow-y-auto rounded-md border border-line"
            role="listbox"
            :aria-label="t.icons.title"
            @scroll="scrollTop = ($event.target as HTMLElement).scrollTop"
            @keydown="onKey"
          >
            <div class="relative" :class="'w-full'" :aria-hidden="false">
              <div :style="{ height: `${rowCount * ROW_HEIGHT}px` }" />
              <div
                class="absolute inset-x-0 top-0 grid grid-cols-8 justify-items-center px-1"
                :style="{ transform: `translateY(${firstRow * ROW_HEIGHT}px)` }"
              >
                <button
                  v-for="item in visible"
                  :key="item.entry.ref"
                  type="button"
                  role="option"
                  class="a-icon-cell my-0.5"
                  :data-index="item.index"
                  :tabindex="item.index === active ? 0 : -1"
                  :aria-selected="item.entry.ref === props.current"
                  :aria-label="item.entry.name"
                  :title="item.entry.name"
                  @click="choose(item.entry.ref)"
                  @focus="active = item.index"
                >
                  <img
                    v-if="item.entry.ref.startsWith('media:')"
                    :src="mediaIcons.get(item.entry.ref)"
                    alt=""
                  />
                  <span v-else class="contents" aria-hidden="true" v-html="svg(item.entry.ref)" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <button type="button" class="a-btn" @click="open = false">{{ t.common.close }}</button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
