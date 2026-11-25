<script setup lang="ts">
import { IconExternalLink } from '@tabler/icons-vue'
import { CALCULATOR_KEYS, type CalculatorKey } from '#shared/schemas/settings'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t, f } = useAdminI18n()
const store = useSettings()
const settings = computed(() => store.settings.value)
const keys = CALCULATOR_KEYS as readonly CalculatorKey[]
const segments: Record<CalculatorKey, string> = {
  calories: 'kalorien',
  peptide: 'peptide',
  halflife: 'wirkstoff-abbau',
}

useHead({ title: () => t.value.calculators.title })
onBeforeRouteLeave(() => store.flushAll())
onMounted(() => store.load())

const basePath = computed(() => `/${settings.value?.calculators.path ?? ''}`)
const anyEnabled = computed(() => keys.some((key) => settings.value?.calculators[key].enabled))
</script>

<template>
  <div v-if="settings" class="max-w-[64rem]">
    <PublishBar :title="t.calculators.title" />
    <p class="max-w-[44rem] text-sm text-muted">{{ t.calculators.intro }}</p>

    <section class="a-section mt-6 grid gap-4" aria-labelledby="calc-base">
      <h2 id="calc-base" class="a-subheading">{{ t.calculators.base }}</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <AdminField
          v-slot="field"
          :label="t.calculators.path"
          :hint="f(t.calculators.pathHint, { path: settings.calculators.path })"
          :error="store.error('calculators', 'path')"
        >
          <div class="flex items-center gap-1">
            <span class="text-muted" aria-hidden="true">/</span>
            <input
              :id="field.id"
              v-model="settings.calculators.path"
              class="a-input"
              maxlength="32"
              autocomplete="off"
              spellcheck="false"
              :aria-invalid="field.invalid"
              :aria-describedby="field.describedby"
              @input="store.queue('calculators')"
            />
          </div>
        </AdminField>
        <AdminField
          v-slot="field"
          :label="t.calculators.indexTitle"
          :error="store.error('calculators', 'indexTitle')"
        >
          <input
            :id="field.id"
            v-model="settings.calculators.indexTitle"
            class="a-input"
            maxlength="70"
            :aria-invalid="field.invalid"
            @input="store.queue('calculators')"
          />
        </AdminField>
      </div>
      <AdminField
        v-slot="field"
        :label="t.calculators.indexIntro"
        optional
        :hint="t.calculators.indexIntroHint"
        :error="store.error('calculators', 'indexIntro')"
      >
        <textarea
          :id="field.id"
          v-model="settings.calculators.indexIntro"
          class="a-textarea"
          maxlength="600"
          :aria-describedby="field.describedby"
          @input="store.queue('calculators')"
        />
      </AdminField>
      <p v-if="anyEnabled">
        <a class="a-btn a-btn-sm" :href="basePath" target="_blank" rel="noopener">
          <IconExternalLink :size="16" aria-hidden="true" />
          {{ t.calculators.viewIndex }}
        </a>
      </p>
      <p class="a-hint">{{ t.calculators.publishHint }}</p>
    </section>

    <section
      v-for="key in keys"
      :key="key"
      class="a-section grid gap-4"
      :aria-labelledby="`calc-${key}`"
    >
      <h2 :id="`calc-${key}`" class="a-subheading">{{ t.calculators.names[key] }}</h2>
      <p class="max-w-[44rem] text-sm text-muted">{{ t.calculators.descriptions[key] }}</p>
      <label class="flex items-center gap-3 text-sm">
        <input
          v-model="settings.calculators[key].enabled"
          type="checkbox"
          class="a-check"
          @change="store.queue('calculators', 0)"
        />
        {{ f(t.calculators.enabled, { path: `${basePath}/${segments[key]}` }) }}
      </label>
      <AdminField
        v-slot="field"
        :label="t.calculators.heading"
        :error="store.error('calculators', `${key}.title`)"
      >
        <input
          :id="field.id"
          v-model="settings.calculators[key].title"
          class="a-input"
          maxlength="70"
          :placeholder="t.calculators.names[key]"
          :aria-invalid="field.invalid"
          @input="store.queue('calculators')"
        />
      </AdminField>
      <AdminField
        v-slot="field"
        :label="t.calculators.introText"
        optional
        :error="store.error('calculators', `${key}.intro`)"
      >
        <textarea
          :id="field.id"
          v-model="settings.calculators[key].intro"
          class="a-textarea"
          maxlength="600"
          @input="store.queue('calculators')"
        />
      </AdminField>
      <AdminField
        v-slot="field"
        :label="t.calculators.content"
        optional
        :hint="t.calculators.contentHint"
        :error="store.error('calculators', `${key}.content`)"
      >
        <textarea
          :id="field.id"
          v-model="settings.calculators[key].content"
          class="a-textarea min-h-32"
          maxlength="8000"
          :aria-describedby="field.describedby"
          @input="store.queue('calculators')"
        />
      </AdminField>
      <p v-if="settings.calculators[key].enabled">
        <a
          class="a-btn a-btn-sm"
          :href="`${basePath}/${segments[key]}`"
          target="_blank"
          rel="noopener"
        >
          <IconExternalLink :size="16" aria-hidden="true" />
          {{ t.calculators.viewPage }}
        </a>
      </p>
    </section>
  </div>
</template>
