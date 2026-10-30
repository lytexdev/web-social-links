<script setup lang="ts">
import {
  IconChevronDown,
  IconClock,
  IconDots,
  IconEyeOff,
  IconGripVertical,
} from '@tabler/icons-vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from 'reka-ui'
import { GROUP_CHILD_TYPES, type BlockNode } from '#shared/schemas/content'

const props = defineProps<{
  node: BlockNode
  grabbed: boolean
  expanded: boolean
  inGroup: boolean
}>()
const emit = defineEmits<{
  toggle: []
  handleKey: [event: KeyboardEvent]
  move: [delta: number]
  moveInto: [groupId: string]
  moveOut: []
}>()
const { t, f } = useAdminI18n()
const blocks = useBlocks()

const label = computed(() => blockLabel(props.node, t.value.editor.untitled))
const typeName = computed(() => t.value.types[props.node.type]?.name ?? props.node.type)
const scheduled = computed(
  () => props.node.visibleFrom !== null || props.node.visibleUntil !== null,
)
const groups = computed(() =>
  blocks.tree.value.filter((item) => item.type === 'group' && item.id !== props.node.parentId),
)
const canGroup = computed(() => GROUP_CHILD_TYPES.includes(props.node.type))
const icon = computed(() =>
  typeof props.node.data.icon === 'string' ? props.node.data.icon : null,
)
</script>

<template>
  <div class="flex min-h-12 items-center gap-1 px-1" :class="grabbed ? 'a-row-grabbed' : ''">
    <button
      type="button"
      class="drag-handle a-btn a-btn-quiet a-btn-sm a-btn-icon cursor-grab"
      :data-handle="node.id"
      :aria-label="f(t.editor.handleLabel, { label })"
      :aria-describedby="'drag-hint'"
      :aria-pressed="grabbed"
      @keydown="emit('handleKey', $event)"
    >
      <IconGripVertical :size="18" aria-hidden="true" />
    </button>
    <button
      type="button"
      class="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded px-2 text-left hover:bg-surface"
      :aria-expanded="expanded"
      :aria-controls="`editor-${node.id}`"
      @click="emit('toggle')"
    >
      <IconPreview v-if="icon" :icon-ref="icon" :size="16" />
      <span class="min-w-0 flex-1">
        <span
          class="block truncate text-sm font-semibold"
          :class="node.visible ? '' : 'text-muted'"
          >{{ label }}</span
        >
        <span class="block text-xs text-muted">{{ typeName }}</span>
      </span>
      <IconEyeOff
        v-if="!node.visible"
        :size="16"
        class="text-muted"
        :aria-label="t.editor.hidden"
        role="img"
      />
      <IconClock
        v-if="scheduled"
        :size="16"
        class="text-muted"
        :aria-label="t.editor.scheduled"
        role="img"
      />
      <span v-if="node.data.affiliate === true" class="a-tag">{{ t.editor.affiliate }}</span>
      <IconChevronDown
        :size="16"
        class="text-muted transition-transform"
        :class="expanded ? 'rotate-180' : ''"
        aria-hidden="true"
      />
    </button>
    <DropdownMenuRoot>
      <DropdownMenuTrigger as-child>
        <button
          type="button"
          class="a-btn a-btn-quiet a-btn-sm a-btn-icon"
          :aria-label="f(t.editor.actions, { label })"
        >
          <IconDots :size="18" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent class="a-menu" align="end" :side-offset="4">
          <DropdownMenuItem class="a-menu-item" @select="emit('toggle')">{{
            t.editor.edit
          }}</DropdownMenuItem>
          <DropdownMenuItem class="a-menu-item" @select="blocks.duplicate(node.id)">{{
            t.editor.duplicate
          }}</DropdownMenuItem>
          <DropdownMenuItem
            class="a-menu-item"
            @select="blocks.patchMeta(node.id, { visible: !node.visible })"
          >
            {{ node.visible ? t.editor.hide : t.editor.show }}
          </DropdownMenuItem>
          <DropdownMenuSeparator class="a-menu-separator" />
          <DropdownMenuItem class="a-menu-item" @select="emit('move', -1)">{{
            t.editor.moveUp
          }}</DropdownMenuItem>
          <DropdownMenuItem class="a-menu-item" @select="emit('move', 1)">{{
            t.editor.moveDown
          }}</DropdownMenuItem>
          <DropdownMenuItem v-if="inGroup" class="a-menu-item" @select="emit('moveOut')">{{
            t.editor.moveOut
          }}</DropdownMenuItem>
          <DropdownMenuSub v-if="canGroup && groups.length > 0">
            <DropdownMenuSubTrigger class="a-menu-item">{{
              t.editor.moveToGroup
            }}</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent class="a-menu">
                <DropdownMenuItem
                  v-for="group in groups"
                  :key="group.id"
                  class="a-menu-item"
                  @select="emit('moveInto', group.id)"
                >
                  {{ blockLabel(group, t.types.group?.name ?? 'Group') }}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator class="a-menu-separator" />
          <DropdownMenuItem class="a-menu-item a-menu-item-danger" @select="blocks.remove(node)">{{
            t.editor.delete
          }}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  </div>
</template>
