<script setup lang="ts">
import type { BlockNode } from '#shared/schemas/content'

definePageMeta({ layout: 'admin', middleware: 'admin' })

interface Source {
  key: string
  label: string
  icon: string | null
  preset: boolean
}
interface Slug {
  slug: string
  kind: 'source' | 'redirect'
  sourceKey: string | null
  linkId: string | null
  label: string
}

const { t, f } = useAdminI18n()
const { request } = useApi()
const toasts = useToasts()
const blocks = useBlocks()
const origin = ref('')
const sources = ref<Source[]>([])
const slugs = ref<Slug[]>([])
const form = reactive({
  kind: 'source' as 'source' | 'redirect',
  slug: '',
  sourceKey: 'instagram',
  linkId: '',
  label: '',
})
const sourceForm = reactive({ key: '', label: '', icon: null as string | null })
const fields = ref<Record<string, string>>({})
const sourceFields = ref<Record<string, string>>({})

useHead({ title: () => t.value.sources.title })

async function load(): Promise<void> {
  const result = await request<{ sources: Source[]; slugs: Slug[] }>('/api/admin/sources')
  sources.value = result.sources
  slugs.value = result.slugs
}

onMounted(async () => {
  origin.value = window.location.origin
  await Promise.all([load(), blocks.load()])
})

const links = computed(() =>
  blocks.tree.value
    .flatMap((node) => [node, ...node.children])
    .filter((node: BlockNode) => typeof node.data.url === 'string' && node.data.url),
)

function sourceLabel(key: string | null): string {
  return sources.value.find((item) => item.key === key)?.label ?? key ?? ''
}

function linkLabel(id: string | null): string {
  const node = links.value.find((item) => item.id === id)
  return node ? blockLabel(node, t.value.editor.untitled) : (id ?? '')
}

function fieldError(map: Record<string, string>, name: string): string | undefined {
  const code = map[name]
  if (!code) return undefined
  if (code.startsWith('taken:'))
    return f(t.value.sources.takenBy, { slug: form.slug, target: code.slice(6) })
  return t.value.errors[code] ?? t.value.errors.invalid
}

async function createSlug(): Promise<void> {
  fields.value = {}
  try {
    const body =
      form.kind === 'source'
        ? {
            kind: 'source',
            slug: form.slug,
            sourceKey: form.sourceKey,
            label: form.label || sourceLabel(form.sourceKey),
          }
        : {
            kind: 'redirect',
            slug: form.slug,
            linkId: form.linkId,
            label: form.label || linkLabel(form.linkId),
          }
    await request('/api/admin/slugs', { body })
    toasts.push(t.value.sources.created)
    form.slug = ''
    form.label = ''
    await load()
  } catch (failure) {
    fields.value = toFailure(failure).fields
  }
}

async function removeSlug(slug: string): Promise<void> {
  await request(`/api/admin/slugs/${slug}`, { method: 'DELETE' })
  toasts.push(t.value.sources.deleted)
  await load()
}

async function createSource(): Promise<void> {
  sourceFields.value = {}
  try {
    await request('/api/admin/sources', { body: { ...sourceForm } })
    toasts.push(t.value.sources.created)
    sourceForm.key = ''
    sourceForm.label = ''
    await load()
  } catch (failure) {
    sourceFields.value = toFailure(failure).fields
  }
}

async function removeSource(key: string): Promise<void> {
  await request(`/api/admin/sources/${key}`, { method: 'DELETE' })
  toasts.push(t.value.sources.deleted)
  await load()
}

async function copy(slug: string): Promise<void> {
  await navigator.clipboard.writeText(`${origin.value}/${slug}`)
  toasts.push(t.value.common.copied)
}
</script>

<template>
  <div class="max-w-[64rem]">
    <PublishBar :title="t.sources.title" />
    <p class="max-w-[44rem] text-sm text-muted">{{ t.sources.intro }}</p>

    <section class="a-section mt-6 grid gap-4" aria-labelledby="slugs-title">
      <h2 id="slugs-title" class="a-subheading">{{ t.sources.slugs }}</h2>
      <p class="flex flex-wrap items-center gap-2 text-sm">
        {{ t.sources.rootQr }}
        <a class="a-btn a-btn-sm" href="/api/admin/qr/root.svg" download>{{ t.sources.qrSvg }}</a>
        <a class="a-btn a-btn-sm" href="/api/admin/qr/root.png" download>{{ t.sources.qrPng }}</a>
      </p>
      <form
        class="grid gap-3 rounded-md border border-line p-4 sm:grid-cols-[10rem_1fr_1fr_auto] sm:items-end"
        @submit.prevent="createSlug"
      >
        <AdminField v-slot="field" :label="t.sources.kind">
          <select :id="field.id" v-model="form.kind" class="a-select">
            <option v-for="(label, key) in t.sources.kinds" :key="key" :value="key">
              {{ label }}
            </option>
          </select>
        </AdminField>
        <AdminField v-slot="field" :label="t.sources.slug" :error="fieldError(fields, 'slug')">
          <input
            :id="field.id"
            v-model="form.slug"
            class="a-input"
            maxlength="32"
            :aria-invalid="field.invalid"
            :aria-describedby="field.describedby"
          />
        </AdminField>
        <AdminField v-if="form.kind === 'source'" v-slot="field" :label="t.sources.target">
          <select :id="field.id" v-model="form.sourceKey" class="a-select">
            <option v-for="source in sources" :key="source.key" :value="source.key">
              {{ source.label }}
            </option>
          </select>
        </AdminField>
        <AdminField
          v-else
          v-slot="field"
          :label="t.sources.link"
          :error="fieldError(fields, 'linkId')"
        >
          <select
            :id="field.id"
            v-model="form.linkId"
            class="a-select"
            :aria-invalid="field.invalid"
          >
            <option value="" disabled>{{ t.sources.chooseLink }}</option>
            <option v-for="link in links" :key="link.id" :value="link.id">
              {{ blockLabel(link, t.editor.untitled) }}
            </option>
          </select>
        </AdminField>
        <button type="submit" class="a-btn a-btn-primary">{{ t.sources.addSlug }}</button>
      </form>
      <div class="overflow-x-auto">
        <table class="a-table">
          <thead>
            <tr>
              <th scope="col">{{ t.sources.slug }}</th>
              <th scope="col">{{ t.sources.kind }}</th>
              <th scope="col">{{ t.sources.target }}</th>
              <th scope="col">
                <span class="sr-only">{{ t.sources.copyUrl }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in slugs" :key="item.slug">
              <td class="font-semibold">/{{ item.slug }}</td>
              <td>{{ t.sources.kinds[item.kind] }}</td>
              <td>
                {{ item.kind === 'source' ? sourceLabel(item.sourceKey) : linkLabel(item.linkId) }}
              </td>
              <td>
                <div class="flex flex-wrap justify-end gap-1">
                  <button type="button" class="a-btn a-btn-sm" @click="copy(item.slug)">
                    {{ t.sources.copyUrl }}
                  </button>
                  <a class="a-btn a-btn-sm" :href="`/api/admin/qr/${item.slug}.svg`" download
                    >SVG</a
                  >
                  <a class="a-btn a-btn-sm" :href="`/api/admin/qr/${item.slug}.png`" download
                    >PNG</a
                  >
                  <button
                    type="button"
                    class="a-btn a-btn-sm a-btn-danger"
                    :aria-label="`${t.sources.delete} /${item.slug}`"
                    @click="removeSlug(item.slug)"
                  >
                    {{ t.sources.delete }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="a-section grid gap-4" aria-labelledby="sources-title">
      <h2 id="sources-title" class="a-subheading">{{ t.sources.sourcesTitle }}</h2>
      <form
        class="grid gap-3 rounded-md border border-line p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        @submit.prevent="createSource"
      >
        <AdminField v-slot="field" :label="t.sources.key" :error="fieldError(sourceFields, 'key')">
          <input
            :id="field.id"
            v-model="sourceForm.key"
            class="a-input"
            maxlength="32"
            :aria-invalid="field.invalid"
          />
        </AdminField>
        <AdminField
          v-slot="field"
          :label="t.sources.label"
          :error="fieldError(sourceFields, 'label')"
        >
          <input
            :id="field.id"
            v-model="sourceForm.label"
            class="a-input"
            maxlength="40"
            :aria-invalid="field.invalid"
          />
        </AdminField>
        <button type="submit" class="a-btn">{{ t.sources.addSource }}</button>
      </form>
      <ul class="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
        <li
          v-for="source in sources"
          :key="source.key"
          class="flex items-center gap-3 border-b border-line py-2 text-sm"
        >
          <IconPreview :icon-ref="source.icon" :size="16" />
          <span class="font-semibold">{{ source.label }}</span>
          <span class="text-muted">{{ source.key }}</span>
          <span v-if="source.preset" class="a-tag">{{ t.sources.preset }}</span>
          <button
            v-else
            type="button"
            class="a-btn a-btn-sm ml-auto"
            :aria-label="`${t.sources.delete} ${source.label}`"
            @click="removeSource(source.key)"
          >
            {{ t.sources.delete }}
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
