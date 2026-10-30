<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface PageItem {
  id: string
  slug: string
  title: string
  kind: string
  markdown: string
}

const { t, f } = useAdminI18n()
const { request } = useApi()
const toasts = useToasts()
const pages = ref<PageItem[]>([])
const creating = ref(false)
const slug = ref('')
const title = ref('')
const fields = ref<Record<string, string>>({})

useHead({ title: () => t.value.pages.title })

async function load(): Promise<void> {
  pages.value = await request<PageItem[]>('/api/admin/pages')
}

onMounted(load)

const legal = computed(() => pages.value.filter((page) => page.kind === 'legal'))
const custom = computed(() => pages.value.filter((page) => page.kind === 'custom'))

function hasPlaceholders(markdown: string): boolean {
  return /\{\{[^}]{1,80}\}\}/.test(markdown)
}

async function create(): Promise<void> {
  fields.value = {}
  try {
    const page = await request<PageItem>('/api/admin/pages', {
      body: { slug: slug.value, title: title.value, markdown: '' },
    })
    await navigateTo(`/admin/pages/${page.id}`)
  } catch (failure) {
    const parsed = toFailure(failure)
    fields.value = parsed.fields
    if (Object.keys(parsed.fields).length === 0)
      toasts.push(useFailureMessage()(parsed), { tone: 'error' })
  }
}

function fieldError(name: string): string | undefined {
  const code = fields.value[name]
  return code ? (t.value.errors[code] ?? t.value.errors.invalid) : undefined
}
</script>

<template>
  <div class="max-w-[52rem]">
    <PublishBar :title="t.pages.title" />
    <section class="grid gap-3" aria-labelledby="legal-title">
      <h2 id="legal-title" class="a-subheading">{{ t.pages.legal }}</h2>
      <ul class="grid">
        <li
          v-for="page in legal"
          :key="page.id"
          class="flex flex-wrap items-center gap-3 border-b border-line py-3"
        >
          <span class="font-semibold">{{ page.title }}</span>
          <span class="text-sm text-muted">/{{ page.slug }}</span>
          <span v-if="hasPlaceholders(page.markdown)" class="a-tag">{{
            t.pages.placeholderTag
          }}</span>
          <NuxtLink :to="`/admin/pages/${page.id}`" class="a-btn a-btn-sm ml-auto">{{
            t.pages.open
          }}</NuxtLink>
        </li>
      </ul>
    </section>
    <section class="a-section mt-8 grid gap-3" aria-labelledby="custom-title">
      <div class="flex items-center justify-between gap-2">
        <h2 id="custom-title" class="a-subheading">{{ t.pages.custom }}</h2>
        <button
          type="button"
          class="a-btn a-btn-sm"
          :aria-expanded="creating"
          @click="creating = !creating"
        >
          {{ t.pages.create }}
        </button>
      </div>
      <form
        v-if="creating"
        class="grid gap-3 rounded-md border border-line p-4 sm:grid-cols-2"
        @submit.prevent="create"
      >
        <AdminField v-slot="field" :label="t.pages.pageTitle" :error="fieldError('title')">
          <input
            :id="field.id"
            v-model="title"
            class="a-input"
            maxlength="80"
            :aria-invalid="field.invalid"
          />
        </AdminField>
        <AdminField
          v-slot="field"
          :label="t.pages.slug"
          :hint="f(t.pages.slugHint, { slug: slug || 'quellen' })"
          :error="fieldError('slug')"
        >
          <input
            :id="field.id"
            v-model="slug"
            class="a-input"
            maxlength="32"
            :aria-describedby="field.describedby"
            :aria-invalid="field.invalid"
          />
        </AdminField>
        <button type="submit" class="a-btn a-btn-primary w-fit">{{ t.pages.create }}</button>
      </form>
      <p v-if="custom.length === 0" class="text-sm text-muted">{{ t.pages.customEmpty }}</p>
      <ul class="grid">
        <li
          v-for="page in custom"
          :key="page.id"
          class="flex flex-wrap items-center gap-3 border-b border-line py-3"
        >
          <span class="font-semibold">{{ page.title }}</span>
          <span class="text-sm text-muted">/p/{{ page.slug }}</span>
          <NuxtLink :to="`/admin/pages/${page.id}`" class="a-btn a-btn-sm ml-auto">{{
            t.pages.open
          }}</NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
