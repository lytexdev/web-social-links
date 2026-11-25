<script setup lang="ts">
import { IconAlertTriangle, IconCheck, IconExternalLink, IconRefresh } from '@tabler/icons-vue'
import type { ReferenceKind, ReferenceSyncStatus, ReferenceWarning } from '#shared/types/references'

definePageMeta({ layout: 'admin', middleware: 'admin' })

interface DocumentRow {
  slug: string
  path: string
  kind: ReferenceKind
  title: string
  published: string | null
  claims: number
  sources: number
  warnings: ReferenceWarning[]
}

const { t, f } = useAdminI18n()
const store = useSettings()
const { request } = useApi()
const toasts = useToasts()
const format = useFormat()
const settings = computed(() => store.settings.value)
const status = ref<ReferenceSyncStatus | null>(null)
const documents = ref<DocumentRow[]>([])
const syncing = ref(false)
const onlyWarnings = ref(false)

useHead({ title: () => t.value.references.title })
onBeforeRouteLeave(() => store.flushAll())

async function load(): Promise<void> {
  const result = await request<{ status: ReferenceSyncStatus; documents: DocumentRow[] }>(
    '/api/admin/references',
  )
  status.value = result.status
  documents.value = result.documents
}

onMounted(() => Promise.all([store.load(), load()]))

const aliases = computed({
  get: () => settings.value?.references.aliases.join('\n') ?? '',
  set: (value: string) => {
    if (!settings.value) return
    settings.value.references.aliases = value
      .split(/[\n,]/)
      .map((line) => line.trim().replace(/^\/+/, '').toLowerCase())
      .filter(Boolean)
      .slice(0, 5)
    store.queue('references', 0)
  },
})

const aliasError = computed(() => {
  for (let index = 0; index < 5; index++) {
    const message = store.error('references', `aliases.${index}`)
    if (message) return `/${settings.value?.references.aliases[index] ?? ''}: ${message}`
  }
  return undefined
})

const withWarnings = computed(() => documents.value.filter((doc) => doc.warnings.length > 0))
const shown = computed(() => (onlyWarnings.value ? withWarnings.value : documents.value))
const publicPath = computed(() => `/${settings.value?.references.path ?? ''}`)

function warningText(warning: ReferenceWarning): string {
  return f(t.value.references.warnings[warning.code] ?? warning.code, {
    detail: warning.detail ?? '',
  })
}

function errorText(code: string | null): string {
  if (!code) return ''
  return t.value.references.errors[code] ?? t.value.references.errors.sync_failed ?? code
}

async function sync(): Promise<void> {
  syncing.value = true
  try {
    await store.flushAll()
    const result = await request<ReferenceSyncStatus>('/api/admin/references/sync', { body: {} })
    status.value = result
    if (result.ok) {
      toasts.push(f(t.value.references.synced, { documents: result.documents }))
    } else {
      toasts.push(errorText(result.error), { tone: 'error' })
    }
    await load()
  } catch (failure) {
    toasts.push(useFailureMessage()(toFailure(failure)), { tone: 'error' })
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <div v-if="settings" class="max-w-[64rem]">
    <PublishBar :title="t.references.title" />
    <p class="max-w-[44rem] text-sm text-muted">{{ t.references.intro }}</p>

    <section class="a-section mt-6 grid gap-4" aria-labelledby="ref-sync">
      <h2 id="ref-sync" class="a-subheading">{{ t.references.sync }}</h2>
      <div class="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <AdminField
          v-slot="field"
          :label="t.references.repository"
          :hint="t.references.repositoryHint"
          :error="store.error('references', 'repository')"
        >
          <input
            :id="field.id"
            v-model="settings.references.repository"
            class="a-input"
            type="url"
            inputmode="url"
            autocomplete="off"
            spellcheck="false"
            placeholder="https://github.com/name/repository"
            :aria-invalid="field.invalid"
            :aria-describedby="field.describedby"
            @input="store.queue('references')"
          />
        </AdminField>
        <AdminField
          v-slot="field"
          :label="t.references.branch"
          :error="store.error('references', 'branch')"
        >
          <input
            :id="field.id"
            v-model="settings.references.branch"
            class="a-input"
            autocomplete="off"
            spellcheck="false"
            :aria-invalid="field.invalid"
            :aria-describedby="field.describedby"
            @input="store.queue('references')"
          />
        </AdminField>
      </div>
      <div
        class="flex flex-wrap items-center justify-between gap-4 rounded-md border border-line p-4"
      >
        <div class="grid gap-1 text-sm" role="status">
          <p v-if="!status?.at" class="text-muted">{{ t.references.never }}</p>
          <template v-else>
            <p class="flex items-center gap-2 font-semibold">
              <IconCheck v-if="status.ok" :size="18" aria-hidden="true" class="text-accent" />
              <IconAlertTriangle v-else :size="18" aria-hidden="true" />
              {{ f(t.references.lastSync, { date: format.dateTime(status.at) }) }}
            </p>
            <p v-if="status.ok" class="text-muted">
              {{
                f(t.references.result, {
                  documents: format.number(status.documents),
                  added: format.number(status.added),
                  updated: format.number(status.updated),
                  removed: format.number(status.removed),
                })
              }}
            </p>
            <p v-else class="a-error">{{ errorText(status.error) }}</p>
          </template>
          <p class="text-muted">{{ t.references.schedule }}</p>
        </div>
        <button
          type="button"
          class="a-btn a-btn-primary"
          :disabled="syncing || !settings.references.repository"
          :aria-busy="syncing"
          @click="sync"
        >
          <IconRefresh :size="18" aria-hidden="true" :class="syncing ? 'animate-spin' : ''" />
          {{ syncing ? t.references.syncing : t.references.syncNow }}
        </button>
      </div>
    </section>

    <section class="a-section grid gap-4" aria-labelledby="ref-page">
      <h2 id="ref-page" class="a-subheading">{{ t.references.page }}</h2>
      <label class="flex items-center gap-3 text-sm">
        <input
          v-model="settings.references.enabled"
          type="checkbox"
          class="a-check"
          @change="store.queue('references', 0)"
        />
        {{ t.references.enabled }}
      </label>
      <p class="a-hint">{{ t.references.publishHint }}</p>
      <AdminField
        v-slot="field"
        :label="t.references.heading"
        :error="store.error('references', 'title')"
      >
        <input
          :id="field.id"
          v-model="settings.references.title"
          class="a-input"
          maxlength="70"
          :aria-invalid="field.invalid"
          :aria-describedby="field.describedby"
          @input="store.queue('references')"
        />
      </AdminField>
      <AdminField
        v-slot="field"
        :label="t.references.introText"
        optional
        :error="store.error('references', 'intro')"
      >
        <textarea
          :id="field.id"
          v-model="settings.references.intro"
          class="a-textarea"
          maxlength="400"
          :aria-invalid="field.invalid"
          :aria-describedby="field.describedby"
          @input="store.queue('references')"
        />
      </AdminField>
      <div class="grid gap-4 sm:grid-cols-2">
        <AdminField
          v-slot="field"
          :label="t.references.path"
          :hint="f(t.references.pathHint, { path: settings.references.path })"
          :error="store.error('references', 'path')"
        >
          <div class="flex items-center gap-1">
            <span class="text-muted" aria-hidden="true">/</span>
            <input
              :id="field.id"
              v-model="settings.references.path"
              class="a-input"
              maxlength="32"
              autocomplete="off"
              spellcheck="false"
              :aria-invalid="field.invalid"
              :aria-describedby="field.describedby"
              @input="store.queue('references')"
            />
          </div>
        </AdminField>
        <AdminField
          v-slot="field"
          :label="t.references.aliases"
          :hint="t.references.aliasesHint"
          :error="aliasError"
        >
          <textarea
            :id="field.id"
            v-model.lazy="aliases"
            class="a-textarea min-h-24"
            spellcheck="false"
            :aria-invalid="field.invalid"
            :aria-describedby="field.describedby"
          />
        </AdminField>
      </div>
      <p v-if="settings.references.enabled">
        <a class="a-btn a-btn-sm" :href="publicPath" target="_blank" rel="noopener">
          <IconExternalLink :size="16" aria-hidden="true" />
          {{ t.references.viewPage }}
        </a>
      </p>
    </section>

    <section class="a-section grid gap-4" aria-labelledby="ref-docs">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ref-docs" class="a-subheading">
          {{ t.references.documents }}
          <span class="font-normal text-muted">{{ format.number(documents.length) }}</span>
        </h2>
        <label v-if="withWarnings.length > 0" class="flex items-center gap-2 text-sm">
          <input v-model="onlyWarnings" type="checkbox" class="a-check" />
          {{ f(t.references.onlyWarnings, { count: withWarnings.length }) }}
        </label>
      </div>
      <p v-if="documents.length === 0" class="text-sm text-muted">{{ t.references.empty }}</p>
      <div v-else class="overflow-x-auto">
        <table class="a-table">
          <thead>
            <tr>
              <th scope="col">{{ t.references.columns.title }}</th>
              <th scope="col">{{ t.references.columns.kind }}</th>
              <th scope="col">{{ t.references.columns.date }}</th>
              <th scope="col" class="text-right">{{ t.references.columns.claims }}</th>
              <th scope="col" class="text-right">{{ t.references.columns.sources }}</th>
              <th scope="col">{{ t.references.columns.check }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in shown" :key="doc.slug">
              <td>
                <a
                  v-if="settings.references.enabled"
                  class="font-semibold underline-offset-2 hover:underline"
                  :href="`${publicPath}/${doc.slug}`"
                  target="_blank"
                  rel="noopener"
                  >{{ doc.title }}</a
                >
                <span v-else class="font-semibold">{{ doc.title }}</span>
                <span class="block text-xs text-muted">{{ doc.path }}</span>
              </td>
              <td>{{ t.references.kinds[doc.kind] }}</td>
              <td class="tabular whitespace-nowrap">{{ doc.published ?? '' }}</td>
              <td class="tabular text-right">{{ doc.claims }}</td>
              <td class="tabular text-right">{{ doc.sources }}</td>
              <td>
                <ul v-if="doc.warnings.length > 0" class="grid gap-1 text-sm">
                  <li
                    v-for="warning in doc.warnings"
                    :key="warning.code"
                    class="flex items-start gap-1.5"
                  >
                    <IconAlertTriangle :size="16" aria-hidden="true" class="mt-0.5 shrink-0" />
                    {{ warningText(warning) }}
                  </li>
                </ul>
                <span v-else class="flex items-center gap-1.5 text-sm text-muted">
                  <IconCheck :size="16" aria-hidden="true" />{{ t.references.ok }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
