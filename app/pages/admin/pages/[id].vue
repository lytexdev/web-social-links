<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface PageDetail {
  id: string
  slug: string
  title: string
  kind: string
  markdown: string
  html: string
}

const route = useRoute()
const { t } = useAdminI18n()
const { request } = useApi()
const status = usePublishStatus()
const toasts = useToasts()
const page = ref<PageDetail | null>(null)
const textarea = ref<HTMLTextAreaElement | null>(null)
const generator = ref(false)
const cloudflare = ref(true)
const removing = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

useHead({ title: () => page.value?.title ?? t.value.pages.title })

onMounted(async () => {
  page.value = await request<PageDetail>(`/api/admin/pages/${route.params.id}`)
})

onBeforeRouteLeave(async () => {
  if (status.pending.value.includes('page')) await save()
})

const placeholders = computed(() => /\{\{[^}]{1,80}\}\}/.test(page.value?.markdown ?? ''))

function queue(): void {
  clearTimeout(timer)
  status.markPending('page')
  timer = setTimeout(save, 600)
}

async function save(): Promise<void> {
  clearTimeout(timer)
  status.clearPending('page')
  if (!page.value) return
  const result = await status.track(
    request<PageDetail>(`/api/admin/pages/${page.value.id}`, {
      method: 'PATCH',
      body: { title: page.value.title, markdown: page.value.markdown },
    }),
  )
  page.value.html = result.html
}

function wrap(before: string, after = before, placeholder = ''): void {
  const element = textarea.value
  if (!element || !page.value) return
  const { selectionStart, selectionEnd, value } = element
  const selected = value.slice(selectionStart, selectionEnd) || placeholder
  page.value.markdown = `${value.slice(0, selectionStart)}${before}${selected}${after}${value.slice(selectionEnd)}`
  queue()
  nextTick(() => {
    element.focus()
    element.setSelectionRange(
      selectionStart + before.length,
      selectionStart + before.length + selected.length,
    )
  })
}

function prefix(marker: string): void {
  const element = textarea.value
  if (!element || !page.value) return
  const start = element.value.lastIndexOf('\n', element.selectionStart - 1) + 1
  page.value.markdown = `${element.value.slice(0, start)}${marker}${element.value.slice(start)}`
  queue()
}

async function generate(): Promise<void> {
  if (!page.value) return
  const result = await request<{ markdown: string }>('/api/admin/legal/privacy-draft', {
    body: { cloudflare: cloudflare.value },
  })
  page.value.markdown = result.markdown
  generator.value = false
  await save()
  await request('/api/admin/settings/privacy-reviewed', { body: {} })
  toasts.push(t.value.pages.generated)
}

async function remove(): Promise<void> {
  if (!page.value) return
  await status.track(request(`/api/admin/pages/${page.value.id}`, { method: 'DELETE' }))
  toasts.push(t.value.pages.deleted)
  await navigateTo('/admin/pages')
}
</script>

<template>
  <div v-if="page">
    <PublishBar :title="page.title" />
    <div class="grid gap-8 xl:grid-cols-2">
      <div class="grid content-start gap-4">
        <AdminField v-slot="field" :label="t.pages.pageTitle">
          <input
            :id="field.id"
            v-model="page.title"
            class="a-input"
            maxlength="80"
            @input="queue"
          />
        </AdminField>
        <p
          v-if="placeholders"
          class="border-l-2 border-[var(--wsl-danger)] pl-3 text-sm"
          role="status"
        >
          {{ t.pages.placeholders }}
        </p>
        <div class="flex flex-wrap gap-1" role="toolbar" :aria-label="t.pages.markdown">
          <button type="button" class="a-btn a-btn-sm" @click="wrap('**', '**', 'fett')">
            {{ t.pages.toolbar.bold }}
          </button>
          <button type="button" class="a-btn a-btn-sm" @click="wrap('*', '*', 'kursiv')">
            {{ t.pages.toolbar.italic }}
          </button>
          <button
            type="button"
            class="a-btn a-btn-sm"
            @click="wrap('[', '](https://)', 'Linktext')"
          >
            {{ t.pages.toolbar.link }}
          </button>
          <button type="button" class="a-btn a-btn-sm" @click="prefix('## ')">
            {{ t.pages.toolbar.heading }}
          </button>
          <button type="button" class="a-btn a-btn-sm" @click="prefix('- ')">
            {{ t.pages.toolbar.list }}
          </button>
          <button
            v-if="page.slug === 'datenschutz'"
            type="button"
            class="a-btn a-btn-sm ml-auto"
            @click="generator = true"
          >
            {{ t.pages.generator }}
          </button>
        </div>
        <AdminField v-slot="field" :label="t.pages.markdown">
          <textarea
            :id="field.id"
            ref="textarea"
            v-model="page.markdown"
            class="a-textarea min-h-[28rem] font-[inherit]"
            maxlength="50000"
            @input="queue"
          />
        </AdminField>
        <button
          v-if="page.kind === 'custom'"
          type="button"
          class="a-btn a-btn-danger w-fit"
          @click="removing = true"
        >
          {{ t.common.delete }}
        </button>
      </div>
      <section class="grid content-start gap-3" aria-labelledby="page-preview">
        <h2 id="page-preview" class="a-label">{{ t.pages.preview }}</h2>
        <div class="p-prose rounded-md border border-line p-5" v-html="page.html" />
      </section>
    </div>
    <ConfirmDialog
      v-model:open="generator"
      :title="t.pages.generator"
      :body="t.pages.generatorBody"
      :confirm-label="t.pages.generatorApply"
      @confirm="generate"
    >
      <label class="mt-4 flex items-center gap-3 text-sm">
        <input v-model="cloudflare" type="checkbox" class="a-check" />
        {{ t.pages.generatorCloudflare }}
      </label>
    </ConfirmDialog>
    <ConfirmDialog
      v-model:open="removing"
      :title="page.title"
      :body="t.pages.deleteConfirm"
      :confirm-label="t.common.delete"
      danger
      @confirm="remove"
    />
  </div>
</template>
