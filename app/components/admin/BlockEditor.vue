<script setup lang="ts">
import type { BlockNode } from '#shared/schemas/content'
import { strictBlockData } from '#shared/schemas/content'
import { checkLinkUrl } from '#shared/utils/url-policy'

const props = defineProps<{ node: BlockNode }>()
const { t } = useAdminI18n()
const blocks = useBlocks()

const data = computed(() => props.node.data)
const serverErrors = computed(() => blocks.fieldErrors.value[props.node.id] ?? {})

const localErrors = computed(() => {
  const result = strictBlockData[props.node.type].safeParse(props.node.data)
  const errors: Record<string, string> = {}
  if (!result.success)
    for (const issue of result.error.issues) errors[issue.path.join('.')] ??= issue.message
  return errors
})

function error(field: string): string | undefined {
  const code = serverErrors.value[field] ?? localErrors.value[field]
  return code ? (t.value.errors[code] ?? t.value.errors.invalid) : undefined
}

function text(field: string): string {
  const value = data.value[field]
  return typeof value === 'string' ? value : ''
}

function flag(field: string): boolean {
  return data.value[field] === true
}

function set(field: string, value: unknown): void {
  blocks.patchData(props.node.id, { [field]: value })
}

const httpWarning = computed(() => {
  const url = text('url')
  if (!url) return undefined
  const check = checkLinkUrl(url)
  return check.ok && check.warning ? t.value.blockFields.httpWarning : undefined
})

function toLocal(value: number | null): string {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(value - offset).toISOString().slice(0, 16)
}

function fromLocal(value: string): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

const icon = computed({
  get: () => (typeof data.value.icon === 'string' ? data.value.icon : null),
  set: (value: string | null) => set('icon', value),
})
const thumbnail = computed({
  get: () => (typeof data.value.thumbnail === 'string' ? data.value.thumbnail : null),
  set: (value: string | null) => set('thumbnail', value),
})
const image = computed({
  get: () => (typeof data.value.image === 'string' ? data.value.image : null),
  set: (value: string | null) => set('image', value),
})
const media = computed({
  get: () => (typeof data.value.media === 'string' && data.value.media ? data.value.media : null),
  set: (value: string | null) => set('media', value ?? ''),
})
</script>

<template>
  <div class="grid gap-4 border-t border-line bg-surface/40 px-3 py-4 sm:px-4">
    <template v-if="node.type === 'link'">
      <div class="grid gap-4 sm:grid-cols-2">
        <AdminField v-slot="field" :label="t.blockFields.title" :error="error('title')">
          <input
            :id="field.id"
            class="a-input"
            :value="text('title')"
            maxlength="80"
            :aria-describedby="field.describedby"
            :aria-invalid="field.invalid"
            @input="set('title', ($event.target as HTMLInputElement).value)"
          />
        </AdminField>
        <AdminField
          v-slot="field"
          :label="t.blockFields.subtitle"
          :error="error('subtitle')"
          optional
        >
          <input
            :id="field.id"
            class="a-input"
            :value="text('subtitle')"
            maxlength="120"
            :aria-describedby="field.describedby"
            @input="set('subtitle', ($event.target as HTMLInputElement).value)"
          />
        </AdminField>
      </div>
      <AdminField
        v-slot="field"
        :label="t.blockFields.url"
        :hint="httpWarning ?? t.blockFields.urlHint"
        :error="error('url')"
      >
        <input
          :id="field.id"
          class="a-input"
          type="url"
          inputmode="url"
          :value="text('url')"
          maxlength="2048"
          :aria-describedby="field.describedby"
          :aria-invalid="field.invalid"
          @input="set('url', ($event.target as HTMLInputElement).value)"
        />
      </AdminField>
      <div class="grid gap-4 sm:grid-cols-2">
        <AdminField
          v-slot="field"
          :label="t.blockFields.variant"
          :hint="text('variant') === 'featured' ? t.blockFields.featuredHint : undefined"
        >
          <select
            :id="field.id"
            class="a-select"
            :value="text('variant')"
            :aria-describedby="field.describedby"
            @change="set('variant', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="(label, key) in t.blockFields.variants" :key="key" :value="key">
              {{ label }}
            </option>
          </select>
        </AdminField>
        <AdminField v-slot="field" :label="t.blockFields.badge" :error="error('badge')" optional>
          <input
            :id="field.id"
            class="a-input"
            :value="text('badge')"
            maxlength="24"
            @input="set('badge', ($event.target as HTMLInputElement).value)"
          />
        </AdminField>
      </div>
      <IconField
        v-if="text('variant') !== 'thumbnail'"
        v-model="icon"
        :label="t.blockFields.icon"
      />
      <MediaField v-else v-model="thumbnail" :label="t.blockFields.thumbnail" />
      <div class="grid gap-2 text-sm">
        <label class="flex items-center gap-3"
          ><input
            type="checkbox"
            class="a-check"
            :checked="flag('affiliate')"
            @change="set('affiliate', ($event.target as HTMLInputElement).checked)"
          />{{ t.blockFields.affiliate }}</label
        >
        <label class="flex items-center gap-3"
          ><input
            type="checkbox"
            class="a-check"
            :checked="flag('appendUtm')"
            @change="set('appendUtm', ($event.target as HTMLInputElement).checked)"
          />{{ t.blockFields.appendUtm }}</label
        >
        <label class="flex items-center gap-3"
          ><input
            type="checkbox"
            class="a-check"
            :checked="flag('newTab')"
            @change="set('newTab', ($event.target as HTMLInputElement).checked)"
          />{{ t.blockFields.newTab }}</label
        >
      </div>
    </template>

    <template v-else-if="node.type === 'tile'">
      <AdminField v-slot="field" :label="t.blockFields.label" :error="error('label')">
        <input
          :id="field.id"
          class="a-input"
          :value="text('label')"
          maxlength="60"
          :aria-describedby="field.describedby"
          :aria-invalid="field.invalid"
          @input="set('label', ($event.target as HTMLInputElement).value)"
        />
      </AdminField>
      <AdminField
        v-slot="field"
        :label="t.blockFields.url"
        :hint="httpWarning ?? t.blockFields.urlHint"
        :error="error('url')"
      >
        <input
          :id="field.id"
          class="a-input"
          type="url"
          :value="text('url')"
          maxlength="2048"
          :aria-describedby="field.describedby"
          :aria-invalid="field.invalid"
          @input="set('url', ($event.target as HTMLInputElement).value)"
        />
      </AdminField>
      <div class="grid gap-4 sm:grid-cols-2">
        <MediaField v-model="image" :label="t.blockFields.image" />
        <IconField v-model="icon" :label="t.blockFields.icon" />
      </div>
      <div class="grid gap-2 text-sm">
        <label class="flex items-center gap-3"
          ><input
            type="checkbox"
            class="a-check"
            :checked="flag('affiliate')"
            @change="set('affiliate', ($event.target as HTMLInputElement).checked)"
          />{{ t.blockFields.affiliate }}</label
        >
        <label class="flex items-center gap-3"
          ><input
            type="checkbox"
            class="a-check"
            :checked="flag('newTab')"
            @change="set('newTab', ($event.target as HTMLInputElement).checked)"
          />{{ t.blockFields.newTab }}</label
        >
      </div>
    </template>

    <template v-else-if="node.type === 'group'">
      <div class="grid gap-4 sm:grid-cols-2">
        <AdminField v-slot="field" :label="t.blockFields.title" :error="error('title')" optional>
          <input
            :id="field.id"
            class="a-input"
            :value="text('title')"
            maxlength="60"
            @input="set('title', ($event.target as HTMLInputElement).value)"
          />
        </AdminField>
        <AdminField v-slot="field" :label="t.blockFields.layout">
          <select
            :id="field.id"
            class="a-select"
            :value="text('layout')"
            @change="set('layout', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="(label, key) in t.blockFields.layouts" :key="key" :value="key">
              {{ label }}
            </option>
          </select>
        </AdminField>
      </div>
      <div class="grid gap-2 text-sm">
        <label class="flex items-center gap-3"
          ><input
            type="checkbox"
            class="a-check"
            :checked="flag('collapsible')"
            @change="set('collapsible', ($event.target as HTMLInputElement).checked)"
          />{{ t.blockFields.collapsible }}</label
        >
        <label v-if="flag('collapsible')" class="flex items-center gap-3"
          ><input
            type="checkbox"
            class="a-check"
            :checked="flag('open')"
            @change="set('open', ($event.target as HTMLInputElement).checked)"
          />{{ t.blockFields.open }}</label
        >
      </div>
    </template>

    <template v-else-if="node.type === 'text' || node.type === 'notice'">
      <AdminField
        v-if="node.type === 'notice'"
        v-slot="field"
        :label="t.blockFields.title"
        optional
      >
        <input
          :id="field.id"
          class="a-input"
          :value="text('title')"
          maxlength="60"
          @input="set('title', ($event.target as HTMLInputElement).value)"
        />
      </AdminField>
      <AdminField
        v-slot="field"
        :label="t.blockFields.markdown"
        :hint="t.blockFields.markdownHint"
        :error="error('markdown')"
      >
        <textarea
          :id="field.id"
          class="a-textarea"
          :value="text('markdown')"
          :maxlength="node.type === 'text' ? 2000 : 1000"
          :aria-describedby="field.describedby"
          @input="set('markdown', ($event.target as HTMLTextAreaElement).value)"
        />
      </AdminField>
      <AdminField v-if="node.type === 'notice'" v-slot="field" :label="t.blockFields.tone">
        <select
          :id="field.id"
          class="a-select"
          :value="text('tone')"
          @change="set('tone', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="(label, key) in t.blockFields.tones" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
      </AdminField>
    </template>

    <template v-else-if="node.type === 'heading'">
      <div class="grid gap-4 sm:grid-cols-[1fr_14rem]">
        <AdminField v-slot="field" :label="t.blockFields.text" :error="error('text')">
          <input
            :id="field.id"
            class="a-input"
            :value="text('text')"
            maxlength="80"
            :aria-invalid="field.invalid"
            :aria-describedby="field.describedby"
            @input="set('text', ($event.target as HTMLInputElement).value)"
          />
        </AdminField>
        <AdminField v-slot="field" :label="t.blockFields.level">
          <select
            :id="field.id"
            class="a-select"
            :value="String(data.level ?? 2)"
            @change="set('level', Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="(label, key) in t.blockFields.levels" :key="key" :value="key">
              {{ label }}
            </option>
          </select>
        </AdminField>
      </div>
    </template>

    <template v-else-if="node.type === 'image'">
      <MediaField v-model="media" :label="t.blockFields.image" />
      <AdminField
        v-slot="field"
        :label="t.blockFields.alt"
        :hint="t.blockFields.altHint"
        :error="error('alt')"
      >
        <input
          :id="field.id"
          class="a-input"
          :value="text('alt')"
          maxlength="200"
          :disabled="flag('decorative')"
          :aria-describedby="field.describedby"
          @input="set('alt', ($event.target as HTMLInputElement).value)"
        />
      </AdminField>
      <label class="flex items-center gap-3 text-sm"
        ><input
          type="checkbox"
          class="a-check"
          :checked="flag('decorative')"
          @change="set('decorative', ($event.target as HTMLInputElement).checked)"
        />{{ t.blockFields.decorative }}</label
      >
      <AdminField v-slot="field" :label="t.blockFields.caption" optional>
        <input
          :id="field.id"
          class="a-input"
          :value="text('caption')"
          maxlength="200"
          @input="set('caption', ($event.target as HTMLInputElement).value)"
        />
      </AdminField>
      <AdminField v-slot="field" :label="t.blockFields.url" :error="error('url')" optional>
        <input
          :id="field.id"
          class="a-input"
          type="url"
          :value="text('url')"
          maxlength="2048"
          :aria-invalid="field.invalid"
          @input="set('url', ($event.target as HTMLInputElement).value)"
        />
      </AdminField>
    </template>

    <template v-else-if="node.type === 'code'">
      <div class="grid gap-4 sm:grid-cols-2">
        <AdminField v-slot="field" :label="t.blockFields.label" :error="error('label')">
          <input
            :id="field.id"
            class="a-input"
            :value="text('label')"
            maxlength="60"
            :aria-invalid="field.invalid"
            @input="set('label', ($event.target as HTMLInputElement).value)"
          />
        </AdminField>
        <AdminField v-slot="field" :label="t.blockFields.code" :error="error('code')">
          <input
            :id="field.id"
            class="a-input a-input-mono"
            :value="text('code')"
            maxlength="40"
            :aria-invalid="field.invalid"
            @input="set('code', ($event.target as HTMLInputElement).value)"
          />
        </AdminField>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <AdminField v-slot="field" :label="t.blockFields.partner" optional>
          <input
            :id="field.id"
            class="a-input"
            :value="text('partner')"
            maxlength="60"
            @input="set('partner', ($event.target as HTMLInputElement).value)"
          />
        </AdminField>
        <AdminField v-slot="field" :label="t.blockFields.url" :error="error('url')" optional>
          <input
            :id="field.id"
            class="a-input"
            type="url"
            :value="text('url')"
            maxlength="2048"
            :aria-invalid="field.invalid"
            @input="set('url', ($event.target as HTMLInputElement).value)"
          />
        </AdminField>
      </div>
      <label class="flex items-center gap-3 text-sm"
        ><input
          type="checkbox"
          class="a-check"
          :checked="flag('affiliate')"
          @change="set('affiliate', ($event.target as HTMLInputElement).checked)"
        />{{ t.blockFields.affiliate }}</label
      >
    </template>

    <template v-else-if="node.type === 'spacer'">
      <AdminField v-slot="field" :label="t.blockFields.size">
        <select
          :id="field.id"
          class="a-select max-w-[14rem]"
          :value="text('size')"
          @change="set('size', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="(label, key) in t.blockFields.sizes" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
      </AdminField>
    </template>

    <fieldset class="grid gap-3 border-t border-line pt-4">
      <legend class="a-label mb-2">{{ t.editor.schedule }}</legend>
      <label class="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          class="a-check"
          :checked="node.visible"
          @change="
            blocks.patchMeta(node.id, { visible: ($event.target as HTMLInputElement).checked })
          "
        />
        {{ t.editor.visible }}
      </label>
      <div class="grid gap-4 sm:grid-cols-2">
        <AdminField v-slot="field" :label="t.editor.visibleFrom" optional>
          <input
            :id="field.id"
            type="datetime-local"
            class="a-input"
            :value="toLocal(node.visibleFrom)"
            @change="
              blocks.patchMeta(node.id, {
                visibleFrom: fromLocal(($event.target as HTMLInputElement).value),
              })
            "
          />
        </AdminField>
        <AdminField
          v-slot="field"
          :label="t.editor.visibleUntil"
          :error="error('visibleUntil')"
          optional
        >
          <input
            :id="field.id"
            type="datetime-local"
            class="a-input"
            :value="toLocal(node.visibleUntil)"
            :aria-invalid="field.invalid"
            @change="
              blocks.patchMeta(node.id, {
                visibleUntil: fromLocal(($event.target as HTMLInputElement).value),
              })
            "
          />
        </AdminField>
      </div>
    </fieldset>
  </div>
</template>
