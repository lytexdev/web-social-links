<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface LinkResult {
  id: string
  url: string
  result: { ok: boolean; status?: number; reason?: string }
}
interface ImportPreview {
  counts: Record<string, number>
  warnings: Array<{ code: string; target: string }>
}

const { t, f, locale } = useAdminI18n()
const store = useSettings()
const session = useAdminSession()
const { request } = useApi()
const upload = useUpload()
const toasts = useToasts()
const sudo = useSudo()
const status = usePublishStatus()
const settings = computed(() => store.settings.value)
const checking = ref(false)
const linkResults = ref<LinkResult[] | null>(null)
const importFile = ref<File | null>(null)
const importPreview = ref<ImportPreview | null>(null)
const importing = ref(false)

onBeforeRouteLeave(() => store.flushAll())

useHead({ title: () => t.value.settings.title })
onMounted(() => store.load())

const crawlers = computed({
  get: () => settings.value?.site.aiCrawlers.join('\n') ?? '',
  set: (value: string) => {
    if (!settings.value) return
    settings.value.site.aiCrawlers = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 60)
    store.queue('site')
  },
})

const notices = computed({
  get: () => settings.value?.footer.notices.join('\n') ?? '',
  set: (value: string) => {
    if (!settings.value) return
    settings.value.footer.notices = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5)
    store.queue('footer')
  },
})

const ogImage = computed({
  get: () => settings.value?.site.ogImage ?? null,
  set: (value: string | null) => {
    if (!settings.value) return
    settings.value.site.ogImage = value
    store.queue('site', 0)
  },
})

async function reviewed(): Promise<void> {
  await request('/api/admin/settings/privacy-reviewed', { body: {} })
  store.privacyReview.value = false
}

async function checkLinks(): Promise<void> {
  checking.value = true
  try {
    linkResults.value = await request<LinkResult[]>('/api/admin/tools/link-check', { body: {} })
  } finally {
    checking.value = false
  }
}

async function exportArchive(): Promise<void> {
  try {
    let response = await fetch('/api/admin/tools/export', { cache: 'no-store' })
    if (response.status === 403) {
      await sudo.confirm()
      response = await fetch('/api/admin/tools/export', { cache: 'no-store' })
    }
    if (!response.ok) throw new ApiFailure(response.status, `http_${response.status}`, '')
    const url = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')
    link.href = url
    link.download =
      response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'export.zip'
    link.click()
    URL.revokeObjectURL(url)
  } catch (failure) {
    const parsed = toFailure(failure)
    if (parsed.code !== 'reauth_cancelled')
      toasts.push(useFailureMessage()(parsed), { tone: 'error' })
  }
}

async function previewImport(files: FileList | null): Promise<void> {
  importFile.value = files?.[0] ?? null
  importPreview.value = null
  if (!importFile.value) return
  try {
    importPreview.value = (await upload.send(
      '/api/admin/tools/import-preview',
      importFile.value,
      () => undefined,
    )) as ImportPreview
  } catch (failure) {
    toasts.push(useFailureMessage()(toFailure(failure)), { tone: 'error' })
  }
}

async function applyImport(): Promise<void> {
  if (!importFile.value) return
  importing.value = true
  try {
    try {
      await upload.send('/api/admin/tools/import-apply', importFile.value, () => undefined)
    } catch (failure) {
      if (toFailure(failure).code !== 'reauth_required') throw failure
      await sudo.confirm()
      await session.load()
      await upload.send('/api/admin/tools/import-apply', importFile.value, () => undefined)
    }
    toasts.push(t.value.settings.importDone)
    importPreview.value = null
    importFile.value = null
    status.scheduleRefresh()
    await store.load()
  } catch (failure) {
    const parsed = toFailure(failure)
    if (parsed.code !== 'reauth_cancelled')
      toasts.push(useFailureMessage()(parsed), { tone: 'error' })
  } finally {
    importing.value = false
  }
}

async function setLanguage(value: 'de' | 'en'): Promise<void> {
  await request('/api/admin/account/locale', { body: { locale: value } })
  await session.load()
}
</script>

<template>
  <div v-if="settings" class="max-w-[52rem]">
    <PublishBar :title="t.settings.title" />
    <p
      v-if="store.privacyReview.value"
      class="mb-6 flex flex-wrap items-center gap-3 border-l-2 border-accent pl-3 text-sm"
      role="status"
    >
      {{ t.settings.privacyReview }}
      <NuxtLink to="/admin/pages" class="a-btn a-btn-sm">{{ t.pages.title }}</NuxtLink>
      <button type="button" class="a-btn a-btn-sm a-btn-quiet" @click="reviewed">
        {{ t.settings.privacyReviewed }}
      </button>
    </p>

    <section class="grid gap-4" aria-labelledby="set-site">
      <h2 id="set-site" class="a-subheading">{{ t.settings.site }}</h2>
      <AdminField v-slot="field" :label="t.settings.siteTitle" optional>
        <input
          :id="field.id"
          v-model="settings.site.title"
          class="a-input"
          maxlength="70"
          @input="store.queue('site')"
        />
      </AdminField>
      <AdminField v-slot="field" :label="t.settings.description" optional>
        <input
          :id="field.id"
          v-model="settings.site.description"
          class="a-input"
          maxlength="200"
          @input="store.queue('site')"
        />
      </AdminField>
      <MediaField v-model="ogImage" :label="t.settings.ogImage" />
      <AdminField v-slot="field" :label="t.settings.lang">
        <select
          :id="field.id"
          v-model="settings.site.lang"
          class="a-select max-w-[14rem]"
          @change="store.queue('site', 0)"
        >
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </AdminField>
      <AdminField v-slot="field" :label="t.settings.aiCrawlers" :hint="t.settings.aiCrawlersHint">
        <textarea
          :id="field.id"
          v-model.lazy="crawlers"
          class="a-textarea"
          :aria-describedby="field.describedby"
        />
      </AdminField>
      <label class="flex items-center gap-3 text-sm">
        <input
          v-model="settings.site.animatedImages"
          type="checkbox"
          class="a-check"
          @change="store.queue('site', 0)"
        />
        {{ t.settings.animatedImages }}
      </label>
    </section>

    <section class="a-section mt-8 grid gap-4" aria-labelledby="set-legal">
      <h2 id="set-legal" class="a-subheading">{{ t.settings.legal }}</h2>
      <div
        v-for="target in ['impressum', 'privacy'] as const"
        :key="target"
        class="grid gap-3 sm:grid-cols-[12rem_1fr] sm:items-end"
      >
        <AdminField
          v-slot="field"
          :label="target === 'impressum' ? t.settings.impressum : t.settings.privacy"
        >
          <select
            :id="field.id"
            v-model="settings.legal[target].mode"
            class="a-select"
            @change="store.queue('legal', 0)"
          >
            <option v-for="(label, key) in t.settings.modes" :key="key" :value="key">
              {{ label }}
            </option>
          </select>
        </AdminField>
        <AdminField
          v-if="settings.legal[target].mode === 'url'"
          v-slot="field"
          :label="t.blockFields.url"
          :error="store.error('legal', `${target}.url`)"
        >
          <input
            :id="field.id"
            v-model="settings.legal[target].url"
            class="a-input"
            type="url"
            :aria-invalid="field.invalid"
            @input="store.queue('legal')"
          />
        </AdminField>
      </div>
      <AdminField v-slot="field" :label="t.settings.affiliateLabel">
        <input
          :id="field.id"
          v-model="settings.legal.affiliateLabel"
          class="a-input max-w-[14rem]"
          maxlength="20"
          @input="store.queue('legal')"
        />
      </AdminField>
      <AdminField v-slot="field" :label="t.settings.affiliateNote">
        <textarea
          :id="field.id"
          v-model="settings.legal.affiliateNote"
          class="a-textarea min-h-24"
          maxlength="400"
          @input="store.queue('legal')"
        />
      </AdminField>
    </section>

    <section class="a-section grid gap-4" aria-labelledby="set-footer">
      <h2 id="set-footer" class="a-subheading">{{ t.settings.footer }}</h2>
      <AdminField
        v-slot="field"
        :label="t.settings.notices"
        :hint="t.settings.noticesHint"
        optional
      >
        <textarea
          :id="field.id"
          v-model.lazy="notices"
          class="a-textarea min-h-24"
          :aria-describedby="field.describedby"
        />
      </AdminField>
      <AdminField v-slot="field" :label="t.settings.note" optional>
        <input
          :id="field.id"
          v-model="settings.footer.note"
          class="a-input"
          maxlength="300"
          @input="store.queue('footer')"
        />
      </AdminField>
      <label class="flex items-center gap-3 text-sm">
        <input
          v-model="settings.footer.showRevision"
          type="checkbox"
          class="a-check"
          @change="store.queue('footer', 0)"
        />
        {{ t.settings.showRevision }}
      </label>
    </section>

    <section class="a-section grid gap-4" aria-labelledby="set-analytics">
      <h2 id="set-analytics" class="a-subheading">{{ t.settings.analytics }}</h2>
      <fieldset class="grid gap-2">
        <legend class="a-label mb-1">{{ t.settings.analyticsMode }}</legend>
        <label
          v-for="(label, key) in t.settings.analyticsModes"
          :key="key"
          class="flex items-center gap-3 text-sm"
        >
          <input
            v-model="settings.analytics.mode"
            type="radio"
            class="a-check"
            :value="key"
            @change="store.queue('analytics', 0)"
          />
          {{ label }}
        </label>
      </fieldset>
      <div class="grid gap-4 sm:grid-cols-3">
        <AdminField
          v-slot="field"
          :label="t.settings.retention"
          :error="store.error('analytics', 'retentionDays')"
        >
          <input
            :id="field.id"
            v-model.number="settings.analytics.retentionDays"
            type="number"
            min="1"
            max="365"
            class="a-input"
            :aria-invalid="field.invalid"
            @input="store.queue('analytics')"
          />
        </AdminField>
        <AdminField
          v-slot="field"
          :label="t.settings.utmSource"
          :hint="t.settings.utmSourceHint"
          optional
        >
          <input
            :id="field.id"
            v-model="settings.analytics.utmSource"
            class="a-input"
            maxlength="40"
            :aria-describedby="field.describedby"
            @input="store.queue('analytics')"
          />
        </AdminField>
        <AdminField v-slot="field" :label="t.settings.utmMedium">
          <input
            :id="field.id"
            v-model="settings.analytics.utmMedium"
            class="a-input"
            maxlength="40"
            @input="store.queue('analytics')"
          />
        </AdminField>
      </div>
    </section>

    <section class="a-section grid gap-6" aria-labelledby="set-tools">
      <h2 id="set-tools" class="a-subheading">{{ t.settings.tools }}</h2>
      <div class="grid gap-2">
        <p class="text-sm text-muted">{{ t.settings.linkCheckBody }}</p>
        <button type="button" class="a-btn w-fit" :disabled="checking" @click="checkLinks">
          {{ t.settings.linkCheck }}
        </button>
        <ul v-if="linkResults" class="grid gap-1 text-sm" aria-live="polite">
          <li
            v-for="item in linkResults"
            :key="item.id"
            class="flex flex-wrap gap-2 border-b border-line py-1"
          >
            <span class="break-all">{{ item.url }}</span>
            <span :class="item.result.ok ? 'text-muted' : 'a-error'">
              {{
                item.result.ok
                  ? `${item.result.status} ${t.settings.linkOk}`
                  : f(t.settings.linkFail, {
                      reason: item.result.status ?? item.result.reason ?? '',
                    })
              }}
            </span>
          </li>
        </ul>
      </div>
      <div class="grid gap-2">
        <p class="text-sm text-muted">{{ t.settings.exportBody }}</p>
        <button type="button" class="a-btn w-fit" @click="exportArchive">
          {{ t.settings.export }}
        </button>
      </div>
      <div class="grid gap-2">
        <h3 class="font-semibold">{{ t.settings.import }}</h3>
        <p class="text-sm text-muted">{{ t.settings.importBody }}</p>
        <label class="a-btn w-fit cursor-pointer">
          {{ t.settings.importChoose }}
          <input
            type="file"
            class="sr-only"
            accept=".zip,.json,application/zip,application/json"
            @change="previewImport(($event.target as HTMLInputElement).files)"
          />
        </label>
        <div
          v-if="importPreview"
          class="grid gap-2 rounded-md border border-line p-4 text-sm"
          aria-live="polite"
        >
          <p>{{ f(t.settings.importCounts, importPreview.counts) }}</p>
          <template v-if="importPreview.warnings.length > 0">
            <p class="a-label">{{ t.settings.importWarnings }}</p>
            <ul class="grid gap-1">
              <li
                v-for="(warning, index) in importPreview.warnings"
                :key="index"
                class="border-l-2 border-[var(--wsl-danger)] pl-2"
              >
                {{
                  f(t.settings.warnings[warning.code] ?? warning.code, { target: warning.target })
                }}
              </li>
            </ul>
          </template>
          <button
            type="button"
            class="a-btn a-btn-primary w-fit"
            :disabled="importing"
            @click="applyImport"
          >
            {{ t.settings.importApply }}
          </button>
        </div>
      </div>
      <AdminField v-slot="field" :label="t.settings.adminLanguage">
        <select
          :id="field.id"
          class="a-select max-w-[14rem]"
          :value="locale"
          @change="setLanguage(($event.target as HTMLSelectElement).value as 'de' | 'en')"
        >
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </AdminField>
    </section>
  </div>
</template>
