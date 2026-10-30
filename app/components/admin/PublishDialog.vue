<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import type { PublishIssue } from '~/composables/use-publish-status'

const open = defineModel<boolean>('open', { required: true })
const { t, f } = useAdminI18n()
const status = usePublishStatus()
const blocks = useBlocks()
const { request } = useApi()
const toasts = useToasts()
const note = ref('')
const busy = ref(false)

watch(open, async (value) => {
  if (!value) return
  await blocks.flushAll()
  await status.refresh().catch(() => undefined)
})

const issues = computed(() => status.state.value?.issues ?? [])

function describe(issue: PublishIssue): string {
  const templates = t.value.publish.issues
  const target = t.value.publish.targets[issue.id] ?? issue.id
  const field = t.value.blockFields[issue.field as keyof typeof t.value.blockFields]
  const template = templates[issue.code] ?? templates.generic ?? ''
  return f(template, {
    target,
    field: typeof field === 'string' ? field : issue.field,
    code: t.value.errors[issue.code] ?? issue.code,
    detail: issue.detail ?? '',
    scheme: t.value.publish.schemes[issue.id] ?? issue.id,
  })
}

function link(issue: PublishIssue): string {
  if (issue.scope === 'legal') return '/admin/pages'
  if (issue.scope === 'theme') return '/admin/design'
  if (issue.scope === 'settings') return '/admin/settings'
  return '/admin'
}

async function confirm(): Promise<void> {
  busy.value = true
  try {
    const result = await request<{ revision: number }>('/api/admin/publish', {
      body: { note: note.value },
    })
    toasts.push(f(t.value.publish.done, { revision: result.revision }))
    note.value = ''
    open.value = false
    await status.refresh()
  } catch (failure) {
    const parsed = toFailure(failure)
    if (parsed.code !== 'publish_blocked')
      toasts.push(useFailureMessage()(parsed), { tone: 'error' })
    await status.refresh()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="a-dialog-overlay" />
      <DialogContent class="a-dialog a-dialog-wide">
        <DialogTitle class="a-subheading">{{ t.publish.dialogTitle }}</DialogTitle>
        <DialogDescription class="sr-only">{{ t.publish.note }}</DialogDescription>
        <div v-if="issues.length > 0" class="mt-4 grid gap-2" role="alert">
          <p class="a-label">{{ t.publish.blocked }}</p>
          <ul class="grid gap-2 text-sm">
            <li
              v-for="(issue, index) in issues"
              :key="index"
              class="flex items-start justify-between gap-3 border-l-2 border-[var(--wsl-danger)] pl-3"
            >
              <span>{{ describe(issue) }}</span>
              <NuxtLink :to="link(issue)" class="a-btn a-btn-sm shrink-0" @click="open = false">
                {{ t.publish.goTo }}
              </NuxtLink>
            </li>
          </ul>
        </div>
        <form v-else class="mt-4 grid gap-4" @submit.prevent="confirm">
          <AdminField v-slot="field" :label="t.publish.note" :hint="t.publish.noteHint" optional>
            <input
              :id="field.id"
              v-model="note"
              class="a-input"
              maxlength="200"
              :aria-describedby="field.describedby"
            />
          </AdminField>
          <div class="flex justify-end gap-2">
            <button type="button" class="a-btn" @click="open = false">{{ t.common.cancel }}</button>
            <button type="submit" class="a-btn a-btn-primary" :disabled="busy">
              {{ t.publish.confirm }}
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
