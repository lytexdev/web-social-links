<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import { GROUP_CHILD_TYPES, type BlockNode } from '#shared/schemas/content'

const { t, f } = useAdminI18n()
const blocks = useBlocks()
const expanded = ref<string | null>(null)
const grabbed = ref<string | null>(null)
const announcement = ref('')

interface Location {
  list: BlockNode[]
  index: number
  parent: BlockNode | null
}

function locate(id: string): Location | null {
  const rootIndex = blocks.tree.value.findIndex((node) => node.id === id)
  if (rootIndex !== -1) return { list: blocks.tree.value, index: rootIndex, parent: null }
  for (const parent of blocks.tree.value) {
    const index = parent.children.findIndex((child) => child.id === id)
    if (index !== -1) return { list: parent.children, index, parent }
  }
  return null
}

function label(node: BlockNode): string {
  return blockLabel(node, t.value.editor.untitled)
}

async function focusHandle(id: string): Promise<void> {
  await nextTick()
  document.querySelector<HTMLElement>(`[data-handle="${id}"]`)?.focus()
}

async function move(id: string, delta: number, save: boolean): Promise<void> {
  const location = locate(id)
  if (!location) return
  const [node] = location.list.splice(location.index, 1)
  if (!node) return
  const target = location.index + delta
  if (target >= 0 && target <= location.list.length) {
    location.list.splice(target, 0, node)
    const after = locate(id)
    announcement.value = f(t.value.editor.moved, {
      label: label(node),
      position: (after?.index ?? 0) + 1,
      total: after?.list.length ?? 0,
    })
  } else if (location.parent) {
    node.parentId = null
    const parentIndex = blocks.tree.value.indexOf(location.parent)
    blocks.tree.value.splice(parentIndex + (delta > 0 ? 1 : 0), 0, node)
    announcement.value = f(t.value.editor.movedOut, { label: label(node) })
  } else {
    location.list.splice(location.index, 0, node)
  }
  if (save) await blocks.saveOrder()
  await focusHandle(id)
}

async function moveInto(id: string, groupId: string): Promise<void> {
  const location = locate(id)
  const group = blocks.tree.value.find((node) => node.id === groupId)
  if (!location || !group) return
  const [node] = location.list.splice(location.index, 1)
  if (!node) return
  node.parentId = groupId
  group.children.push(node)
  await blocks.saveOrder()
  await focusHandle(id)
}

async function moveOut(id: string): Promise<void> {
  const location = locate(id)
  if (!location?.parent) return
  await move(id, location.list.length, true)
}

async function onHandleKey(node: BlockNode, event: KeyboardEvent): Promise<void> {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    if (grabbed.value === node.id) {
      grabbed.value = null
      await blocks.saveOrder()
      const location = locate(node.id)
      announcement.value = f(t.value.editor.dropped, {
        label: label(node),
        position: (location?.index ?? 0) + 1,
      })
      await focusHandle(node.id)
    } else {
      await blocks.flushAll()
      grabbed.value = node.id
      const location = locate(node.id)
      announcement.value = f(t.value.editor.grabbed, {
        label: label(node),
        position: (location?.index ?? 0) + 1,
        total: location?.list.length ?? 0,
      })
    }
  } else if (grabbed.value === node.id && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
    event.preventDefault()
    await move(node.id, event.key === 'ArrowUp' ? -1 : 1, false)
  } else if (grabbed.value === node.id && event.key === 'Escape') {
    event.preventDefault()
    grabbed.value = null
    await blocks.load()
    announcement.value = t.value.editor.cancelled
    await focusHandle(node.id)
  }
}

function canEnterGroup(_to: unknown, _from: unknown, element: HTMLElement): boolean {
  return GROUP_CHILD_TYPES.includes(element.dataset.type as BlockNode['type'])
}

async function onDragEnd(): Promise<void> {
  for (const node of blocks.tree.value) {
    node.parentId = null
    for (const child of node.children) child.parentId = node.id
  }
  await blocks.saveOrder()
}

function toggle(id: string): void {
  expanded.value = expanded.value === id ? null : id
}

defineExpose({ expand: (id: string) => (expanded.value = id) })
</script>

<template>
  <div>
    <p id="drag-hint" class="sr-only">{{ t.editor.handleHint }}</p>
    <p class="sr-only" role="status" aria-live="assertive">{{ announcement }}</p>
    <p
      v-if="blocks.tree.value.length === 0"
      class="rounded-md border border-dashed border-line p-6 text-sm text-muted"
    >
      {{ t.editor.empty }}
    </p>
    <VueDraggable
      v-model="blocks.tree.value"
      tag="ul"
      class="grid"
      handle=".drag-handle"
      ghost-class="a-ghost"
      :animation="150"
      :group="{ name: 'blocks', pull: true, put: true }"
      @end="onDragEnd"
    >
      <li
        v-for="(node, index) in blocks.tree.value"
        :key="node.id"
        :data-type="node.type"
        class="border-b border-line"
      >
        <BlockRow
          :node="node"
          :grabbed="grabbed === node.id"
          :expanded="expanded === node.id"
          :in-group="false"
          @toggle="toggle(node.id)"
          @handle-key="onHandleKey(node, $event)"
          @move="move(node.id, $event, true)"
          @move-into="moveInto(node.id, $event)"
        />
        <div v-if="expanded === node.id" :id="`editor-${node.id}`">
          <BlockEditor :node="node" />
        </div>
        <div v-if="node.type === 'group'" class="ml-6 border-l border-line pb-2 pl-2">
          <VueDraggable
            v-model="node.children"
            tag="ul"
            class="grid min-h-6"
            handle=".drag-handle"
            ghost-class="a-ghost"
            :animation="150"
            :group="{ name: 'blocks', pull: true, put: canEnterGroup }"
            @end="onDragEnd"
          >
            <li
              v-for="child in node.children"
              :key="child.id"
              :data-type="child.type"
              class="border-b border-line last:border-b-0"
            >
              <BlockRow
                :node="child"
                :grabbed="grabbed === child.id"
                :expanded="expanded === child.id"
                :in-group="true"
                @toggle="toggle(child.id)"
                @handle-key="onHandleKey(child, $event)"
                @move="move(child.id, $event, true)"
                @move-into="moveInto(child.id, $event)"
                @move-out="moveOut(child.id)"
              />
              <div v-if="expanded === child.id" :id="`editor-${child.id}`">
                <BlockEditor :node="child" />
              </div>
            </li>
          </VueDraggable>
          <InsertMenu
            :parent-id="node.id"
            :label="t.editor.insertInGroup"
            subtle
            @created="expanded = $event"
          />
        </div>
        <div class="a-insert -mt-1 flex h-9 items-center">
          <InsertMenu
            :parent-id="null"
            :index="index + 1"
            :label="t.editor.insertHere"
            subtle
            @created="expanded = $event"
          />
        </div>
      </li>
    </VueDraggable>
  </div>
</template>
