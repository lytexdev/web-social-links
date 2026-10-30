<script setup lang="ts">
import { IconPlus } from '@tabler/icons-vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { BLOCK_TYPES, GROUP_CHILD_TYPES, type BlockType } from '#shared/schemas/content'

const props = defineProps<{
  parentId: string | null
  index?: number
  label: string
  subtle?: boolean
}>()
const emit = defineEmits<{ created: [id: string] }>()
const { t } = useAdminI18n()
const blocks = useBlocks()
const open = ref(false)
const query = ref('')
const active = ref(0)

const types = computed(() => {
  const allowed = props.parentId ? GROUP_CHILD_TYPES : BLOCK_TYPES
  const term = query.value.trim().toLowerCase()
  return allowed.filter((type) => {
    const entry = t.value.types[type]
    return (
      !term ||
      entry?.name.toLowerCase().includes(term) ||
      entry?.description.toLowerCase().includes(term)
    )
  })
})

watch(open, (value) => {
  if (value) {
    query.value = ''
    active.value = 0
  }
})
watch(query, () => (active.value = 0))

async function choose(type: BlockType): Promise<void> {
  open.value = false
  const node = await blocks.create(type, props.parentId, props.index)
  emit('created', node.id)
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    active.value = Math.min(types.value.length - 1, active.value + 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = Math.max(0, active.value - 1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const type = types.value[active.value]
    if (type) choose(type)
  }
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button type="button" class="a-btn" :class="subtle ? 'a-btn-sm a-btn-quiet' : ''">
        <IconPlus :size="16" aria-hidden="true" />
        {{ label }}
      </button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        class="a-menu w-[min(22rem,calc(100vw-2rem))] p-2"
        :side-offset="6"
        align="start"
      >
        <input
          v-model="query"
          type="search"
          class="a-input mb-2"
          :aria-label="t.editor.insertSearch"
          :placeholder="t.editor.insertSearch"
          role="combobox"
          aria-expanded="true"
          aria-controls="insert-options"
          :aria-activedescendant="types[active] ? `insert-${types[active]}` : undefined"
          @keydown="onKey"
        />
        <ul
          id="insert-options"
          role="listbox"
          :aria-label="t.editor.insert"
          class="grid max-h-80 gap-0.5 overflow-y-auto"
        >
          <li
            v-for="(type, position) in types"
            :id="`insert-${type}`"
            :key="type"
            role="option"
            :aria-selected="position === active"
            class="cursor-pointer rounded px-2 py-2 text-sm"
            :class="position === active ? 'bg-surface' : ''"
            @click="choose(type)"
            @mouseenter="active = position"
          >
            <span class="block font-semibold">{{ t.types[type]?.name }}</span>
            <span class="block text-xs text-muted">{{ t.types[type]?.description }}</span>
          </li>
        </ul>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
