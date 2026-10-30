<script setup lang="ts">
import { PRESETS, checkThemeContrast, type Palette } from '#shared/schemas/theme'
import { contrastRatio } from '#shared/utils/contrast'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t, f } = useAdminI18n()
const store = useSettings()
const { request } = useApi()
const theme = computed(() => store.settings.value?.theme)
const avatarColor = ref<string | null>(null)
const keys: Array<keyof Palette> = ['bg', 'surface', 'line', 'text', 'muted', 'accent', 'onAccent']

onBeforeRouteLeave(() => store.flushAll())

useHead({ title: () => t.value.design.title })

onMounted(async () => {
  const settings = await store.load()
  if (settings.profile.avatar) {
    const list =
      await request<Array<{ id: string; dominantColor: string | null }>>('/api/admin/media')
    avatarColor.value =
      list.find((item) => item.id === settings.profile.avatar)?.dominantColor ?? null
  }
})

const checks = computed(() => (theme.value ? checkThemeContrast(theme.value) : []))
const failing = computed(() => checks.value.filter((check) => !check.ok).length)
const schemes = computed<Array<'dark' | 'light'>>(() =>
  theme.value?.scheme === 'auto'
    ? ['dark', 'light']
    : theme.value?.scheme === 'light'
      ? ['light']
      : ['dark'],
)

const suggestion = computed(() => {
  const color = avatarColor.value
  const palette = theme.value?.dark
  if (!color || !palette) return null
  return contrastRatio(color, palette.bg) >= 3 && contrastRatio(palette.onAccent, color) >= 4.5
    ? color
    : null
})

function applyPreset(name: 'datasheet' | 'paper'): void {
  if (!theme.value) return
  theme.value.preset = name
  theme.value.dark = { ...PRESETS[name].dark }
  theme.value.light = { ...PRESETS[name].light }
  store.queue('theme', 0)
}

function setColor(scheme: 'dark' | 'light', key: keyof Palette, value: string): void {
  if (!theme.value) return
  theme.value[scheme][key] = value.toLowerCase()
  if (/^#[0-9a-f]{6}$/i.test(value)) store.queue('theme', 300)
}

function choose<
  K extends 'scheme' | 'background' | 'rowStyle' | 'density' | 'profileAlign' | 'avatarShape',
>(key: K, value: string): void {
  if (!theme.value) return
  ;(theme.value as Record<K, string>)[key] = value
  store.queue('theme', 0)
}
</script>

<template>
  <div v-if="theme">
    <PublishBar :title="t.design.title" />
    <div class="grid gap-10 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <div class="grid content-start gap-8">
        <fieldset class="grid gap-3">
          <legend class="a-subheading mb-3">{{ t.design.presets }}</legend>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(label, key) in t.design.presetNames"
              :key="key"
              type="button"
              class="a-btn"
              :class="theme.preset === key ? 'a-btn-primary' : ''"
              :aria-pressed="theme.preset === key"
              @click="applyPreset(key as 'datasheet' | 'paper')"
            >
              {{ label }}
            </button>
          </div>
        </fieldset>

        <div class="grid gap-6 sm:grid-cols-2">
          <AdminField
            v-for="option in [
              'scheme',
              'background',
              'rowStyle',
              'density',
              'profileAlign',
              'avatarShape',
            ] as const"
            :key="option"
            v-slot="field"
            :label="
              {
                scheme: t.design.scheme,
                background: t.design.background,
                rowStyle: t.design.rowStyle,
                density: t.design.density,
                profileAlign: t.design.align,
                avatarShape: t.design.avatarShape,
              }[option]
            "
          >
            <select
              :id="field.id"
              class="a-select"
              :value="theme[option]"
              @change="choose(option, ($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="(label, key) in {
                  scheme: t.design.schemes,
                  background: t.design.backgrounds,
                  rowStyle: t.design.rowStyles,
                  density: t.design.densities,
                  profileAlign: t.design.aligns,
                  avatarShape: t.design.avatarShapes,
                }[option]"
                :key="key"
                :value="key"
              >
                {{ label }}
              </option>
            </select>
          </AdminField>
          <AdminField v-slot="field" :label="t.design.radius">
            <select
              :id="field.id"
              class="a-select"
              :value="theme.radius"
              @change="
                ((theme.radius = Number(($event.target as HTMLSelectElement).value) as 0),
                store.queue('theme', 0))
              "
            >
              <option v-for="value in [0, 6, 12, 999]" :key="value" :value="value">
                {{ value === 999 ? t.design.pill : `${value} px` }}
              </option>
            </select>
          </AdminField>
        </div>

        <p v-if="suggestion" class="flex flex-wrap items-center gap-3 text-sm">
          <span
            class="inline-block h-5 w-5 rounded border border-line"
            :style="{ background: suggestion }"
            aria-hidden="true"
          />
          {{ f(t.design.suggestAccent, { color: suggestion }) }}
          <button
            type="button"
            class="a-btn a-btn-sm"
            @click="setColor('dark', 'accent', suggestion)"
          >
            {{ t.design.useSuggestion }}
          </button>
        </p>

        <section
          v-for="scheme in schemes"
          :key="scheme"
          class="grid gap-3"
          :aria-labelledby="`palette-${scheme}`"
        >
          <h2 :id="`palette-${scheme}`" class="a-subheading">
            {{ scheme === 'dark' ? t.design.paletteDark : t.design.paletteLight }}
          </h2>
          <div class="grid gap-3 sm:grid-cols-2">
            <div
              v-for="key in keys"
              :key="key"
              class="grid grid-cols-[2.75rem_1fr] items-end gap-2"
            >
              <input
                type="color"
                class="a-swatch"
                :value="theme[scheme][key]"
                :aria-label="`${t.design.colorNames[key]} ${scheme === 'dark' ? t.design.paletteDark : t.design.paletteLight}`"
                @input="setColor(scheme, key, ($event.target as HTMLInputElement).value)"
              />
              <AdminField
                v-slot="field"
                :label="t.design.colorNames[key] ?? key"
                :error="store.error('theme', `${scheme}.${key}`)"
              >
                <input
                  :id="field.id"
                  class="a-input a-input-mono"
                  :value="theme[scheme][key]"
                  maxlength="7"
                  :aria-invalid="field.invalid"
                  @input="setColor(scheme, key, ($event.target as HTMLInputElement).value)"
                />
              </AdminField>
            </div>
          </div>
        </section>

        <section class="grid gap-3" aria-labelledby="contrast-title">
          <h2 id="contrast-title" class="a-subheading">{{ t.design.contrast }}</h2>
          <p role="status" class="text-sm" :class="failing > 0 ? 'a-error' : 'text-muted'">
            {{ failing > 0 ? f(t.design.contrastFail, { count: failing }) : t.design.contrastOk }}
          </p>
          <table class="a-table">
            <thead>
              <tr>
                <th scope="col">{{ t.design.pair }}</th>
                <th scope="col">{{ t.design.ratio }}</th>
                <th scope="col">{{ t.design.required }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="check in checks" :key="`${check.scheme}-${check.pair}`">
                <td>
                  {{ t.design.pairs[check.pair] ?? check.pair }}
                  <span class="text-xs text-muted"
                    >({{
                      check.scheme === 'dark' ? t.design.paletteDark : t.design.paletteLight
                    }})</span
                  >
                </td>
                <td :class="check.ok ? '' : 'a-error'">{{ check.ratio.toFixed(2) }}:1</td>
                <td>{{ check.required }}:1</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
      <aside :aria-label="t.editor.preview">
        <div class="sticky top-6"><PreviewFrame /></div>
      </aside>
    </div>
  </div>
</template>
