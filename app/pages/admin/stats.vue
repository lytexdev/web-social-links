<script setup lang="ts">
import { IconArrowDownRight, IconArrowUpRight, IconMinus } from '@tabler/icons-vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })

interface Totals {
  views: number
  clicks: number
  previews: number
  uniques: number
}
interface Row {
  key: string
  views: number
  clicks: number
  label?: string
  ctr?: number
}
interface Report {
  period: { from: string; to: string; source: string | null }
  visitorsMode: boolean
  summary: Totals
  previous: Totals
  series: Array<{ bucket: string; views: number; clicks: number }>
  sources: Array<Row & { label: string }>
  links: Array<{ key: string; label: string; clicks: number; ctr: number }>
  dimensions: Record<string, Row[]>
}

const RANGES = ['24h', '7d', '30d', '90d', 'custom'] as const
const { t, f, locale } = useAdminI18n()
const { request } = useApi()
const toasts = useToasts()
const range = ref<(typeof RANGES)[number]>('7d')
const from = ref('')
const to = ref('')
const source = ref('')
const report = ref<Report | null>(null)
const tables = ref(false)
const loading = ref(false)

useHead({ title: () => t.value.stats.title })

const query = computed(() => {
  const params = new URLSearchParams({ range: range.value })
  if (range.value === 'custom' && from.value && to.value) {
    params.set('from', from.value)
    params.set('to', to.value)
  }
  if (source.value) params.set('source', source.value)
  return params.toString()
})

async function load(): Promise<void> {
  if (range.value === 'custom' && (!from.value || !to.value)) return
  loading.value = true
  try {
    report.value = await request<Report>(`/api/admin/stats?${query.value}`)
  } catch (failure) {
    toasts.push(useFailureMessage()(toFailure(failure)), { tone: 'error' })
  } finally {
    loading.value = false
  }
}

watch([range, source], () => {
  if (range.value !== 'custom') load()
})
onMounted(load)

const number = computed(() => new Intl.NumberFormat(locale.value))
const percent = computed(
  () => new Intl.NumberFormat(locale.value, { style: 'percent', maximumFractionDigits: 1 }),
)

function ctr(totals: Totals): number {
  return totals.views > 0 ? totals.clicks / totals.views : 0
}

const tiles = computed(() => {
  const current = report.value?.summary
  const previous = report.value?.previous
  if (!current || !previous) return []
  const list = [
    {
      key: 'views',
      label: t.value.stats.views,
      value: current.views,
      before: previous.views,
      display: number.value.format(current.views),
      previousDisplay: number.value.format(previous.views),
    },
    {
      key: 'clicks',
      label: t.value.stats.clicks,
      value: current.clicks,
      before: previous.clicks,
      display: number.value.format(current.clicks),
      previousDisplay: number.value.format(previous.clicks),
    },
    {
      key: 'ctr',
      label: t.value.stats.ctr,
      value: ctr(current),
      before: ctr(previous),
      display: percent.value.format(ctr(current)),
      previousDisplay: percent.value.format(ctr(previous)),
    },
    {
      key: 'previews',
      label: t.value.stats.previews,
      value: current.previews,
      before: previous.previews,
      display: number.value.format(current.previews),
      previousDisplay: number.value.format(previous.previews),
    },
  ]
  if (report.value?.visitorsMode) {
    list.push({
      key: 'uniques',
      label: t.value.stats.uniques,
      value: current.uniques,
      before: previous.uniques,
      display: number.value.format(current.uniques),
      previousDisplay: number.value.format(previous.uniques),
    })
  }
  return list
})

function change(
  value: number,
  before: number,
): { direction: 'up' | 'down' | 'flat'; text: string } {
  if (before === 0 && value === 0) return { direction: 'flat', text: t.value.stats.noChange }
  if (before === 0)
    return { direction: 'up', text: f(t.value.stats.change, { sign: '+', value: '100' }) }
  const delta = ((value - before) / before) * 100
  if (Math.abs(delta) < 0.05) return { direction: 'flat', text: t.value.stats.noChange }
  return {
    direction: delta > 0 ? 'up' : 'down',
    text: f(t.value.stats.change, {
      sign: delta > 0 ? '+' : '',
      value: new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(delta),
    }),
  }
}

const series = computed(() => {
  const data = report.value?.series ?? []
  return {
    buckets: data.map((point) => point.bucket),
    lines: [
      {
        key: 'views',
        label: t.value.stats.views,
        color: 'var(--viz-views)',
        values: data.map((point) => point.views),
      },
      {
        key: 'clicks',
        label: t.value.stats.clicks,
        color: 'var(--viz-clicks)',
        values: data.map((point) => point.clicks),
      },
    ],
  }
})

function formatBucket(bucket: string): string {
  if (bucket.includes('T')) return `${bucket.slice(11, 13)}:00`
  const date = new Date(`${bucket}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return bucket
  return new Intl.DateTimeFormat(locale.value, {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(date)
}

const seriesSummary = computed(() =>
  f(t.value.stats.seriesSummary, {
    count: series.value.buckets.length,
    max: number.value.format(Math.max(0, ...series.value.lines.flatMap((line) => line.values))),
  }),
)

function dimensionLabel(dimension: string, key: string): string {
  if (dimension === 'device') return t.value.stats.devices[key] ?? key
  if (dimension === 'browser' && key.startsWith('in-app:')) return `${key.slice(7)} (In-App)`
  if (dimension === 'slug') return `/${key}`
  return key
}

const sourceLabel = computed(
  () => report.value?.sources.find((item) => item.key === source.value)?.label ?? source.value,
)
const dimensionOrder = [
  'referrer',
  'device',
  'country',
  'browser',
  'os',
  'slug',
  'utm_source',
  'utm_medium',
  'utm_campaign',
]
</script>

<template>
  <div>
    <PublishBar :title="t.stats.title" />
    <div class="mb-6 flex flex-wrap items-end gap-3">
      <fieldset class="flex flex-wrap gap-1">
        <legend class="sr-only">{{ t.stats.range }}</legend>
        <button
          v-for="item in RANGES"
          :key="item"
          type="button"
          class="a-btn a-btn-sm"
          :class="range === item ? 'a-btn-primary' : ''"
          :aria-pressed="range === item"
          @click="range = item"
        >
          {{ t.stats.ranges[item] }}
        </button>
      </fieldset>
      <form v-if="range === 'custom'" class="flex flex-wrap items-end gap-2" @submit.prevent="load">
        <AdminField v-slot="field" :label="t.stats.from">
          <input :id="field.id" v-model="from" type="date" class="a-input min-h-9 py-1" />
        </AdminField>
        <AdminField v-slot="field" :label="t.stats.to">
          <input :id="field.id" v-model="to" type="date" class="a-input min-h-9 py-1" />
        </AdminField>
        <button type="submit" class="a-btn a-btn-sm">{{ t.stats.apply }}</button>
      </form>
      <AdminField v-slot="field" :label="t.stats.source">
        <select :id="field.id" v-model="source" class="a-select min-h-9 py-1 text-sm">
          <option value="">{{ t.stats.allSources }}</option>
          <option v-for="item in report?.sources ?? []" :key="item.key" :value="item.key">
            {{ item.label }}
          </option>
        </select>
      </AdminField>
      <div class="ml-auto flex flex-wrap gap-2">
        <button
          type="button"
          class="a-btn a-btn-sm"
          :aria-pressed="tables"
          @click="tables = !tables"
        >
          {{ tables ? t.stats.showCharts : t.stats.showTables }}
        </button>
        <a class="a-btn a-btn-sm" :href="`/api/admin/stats/export.csv?${query}`" download>{{
          t.stats.exportCsv
        }}</a>
      </div>
    </div>
    <p v-if="source" class="mb-4 flex items-center gap-3 text-sm" role="status">
      {{ f(t.stats.filtered, { source: sourceLabel }) }}
      <button type="button" class="a-btn a-btn-sm" @click="source = ''">
        {{ t.stats.clearFilter }}
      </button>
    </p>

    <div v-if="report" class="grid gap-8" :aria-busy="loading">
      <ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <li v-for="tile in tiles" :key="tile.key" class="rounded-md border border-line p-4">
          <p class="label text-muted">{{ tile.label }}</p>
          <p class="mt-2 text-[1.953rem] font-extrabold leading-none tabular">{{ tile.display }}</p>
          <p class="mt-2 flex items-center gap-1 text-xs text-muted tabular">
            <IconArrowUpRight
              v-if="change(tile.value, tile.before).direction === 'up'"
              :size="14"
              aria-hidden="true"
            />
            <IconArrowDownRight
              v-else-if="change(tile.value, tile.before).direction === 'down'"
              :size="14"
              aria-hidden="true"
            />
            <IconMinus v-else :size="14" aria-hidden="true" />
            {{ change(tile.value, tile.before).text }}
          </p>
          <p class="text-xs text-muted tabular">
            {{ f(t.stats.previous, { value: tile.previousDisplay }) }}
          </p>
        </li>
      </ul>

      <p
        v-if="report.summary.views === 0 && report.summary.clicks === 0"
        class="text-sm text-muted"
      >
        {{ t.stats.noData }}
      </p>

      <section class="grid gap-3" aria-labelledby="stats-series">
        <h2 id="stats-series" class="a-subheading">{{ t.stats.series }}</h2>
        <LineChart
          v-if="!tables"
          :buckets="series.buckets"
          :series="series.lines"
          :format="formatBucket"
          :summary="seriesSummary"
        />
        <div v-else class="max-h-96 overflow-auto">
          <table class="a-table">
            <thead>
              <tr>
                <th scope="col">{{ t.stats.date }}</th>
                <th scope="col">{{ t.stats.views }}</th>
                <th scope="col">{{ t.stats.clicks }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="point in report.series" :key="point.bucket">
                <td>{{ formatBucket(point.bucket) }}</td>
                <td>{{ number.format(point.views) }}</td>
                <td>{{ number.format(point.clicks) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="grid gap-8 lg:grid-cols-2">
        <section class="grid content-start gap-3" aria-labelledby="stats-links">
          <h2 id="stats-links" class="a-subheading">{{ t.stats.topLinks }}</h2>
          <BarList
            v-if="!tables"
            :items="
              report.links.map((link) => ({
                key: link.key,
                label: link.label,
                value: link.clicks,
                detail: `${t.stats.ctr} ${percent.format(link.ctr)}`,
              }))
            "
          />
          <table v-else class="a-table">
            <thead>
              <tr>
                <th scope="col">{{ t.stats.label }}</th>
                <th scope="col">{{ t.stats.clicks }}</th>
                <th scope="col">{{ t.stats.ctr }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="link in report.links" :key="link.key">
                <td>{{ link.label }}</td>
                <td>{{ number.format(link.clicks) }}</td>
                <td>{{ percent.format(link.ctr) }}</td>
              </tr>
            </tbody>
          </table>
        </section>
        <section class="grid content-start gap-3" aria-labelledby="stats-sources">
          <h2 id="stats-sources" class="a-subheading">{{ t.stats.sources }}</h2>
          <BarList
            v-if="!tables"
            :items="
              report.sources.map((item) => ({
                key: item.key,
                label: item.label,
                value: item.views,
                detail: `${number.format(item.clicks)} ${t.stats.clicks}`,
              }))
            "
            :action-label="(item) => f(t.stats.filterBy, { label: item.label })"
            @select="source = $event"
          />
          <table v-else class="a-table">
            <thead>
              <tr>
                <th scope="col">{{ t.stats.label }}</th>
                <th scope="col">{{ t.stats.views }}</th>
                <th scope="col">{{ t.stats.clicks }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in report.sources" :key="item.key">
                <td>{{ item.label }}</td>
                <td>{{ number.format(item.views) }}</td>
                <td>{{ number.format(item.clicks) }}</td>
              </tr>
            </tbody>
          </table>
        </section>
        <section
          v-for="dimension in dimensionOrder"
          :key="dimension"
          class="grid content-start gap-3"
          :aria-labelledby="`stats-${dimension}`"
        >
          <h2 :id="`stats-${dimension}`" class="a-subheading">
            {{ t.stats.dimensions[dimension] }}
          </h2>
          <BarList
            v-if="!tables"
            :items="
              (report.dimensions[dimension] ?? []).map((item) => ({
                key: item.key,
                label: dimensionLabel(dimension, item.key),
                value: item.views + item.clicks,
                detail: `${number.format(item.views)} ${t.stats.views} · ${number.format(item.clicks)} ${t.stats.clicks}`,
              }))
            "
          />
          <table v-else class="a-table">
            <thead>
              <tr>
                <th scope="col">{{ t.stats.label }}</th>
                <th scope="col">{{ t.stats.views }}</th>
                <th scope="col">{{ t.stats.clicks }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in report.dimensions[dimension] ?? []" :key="item.key">
                <td>{{ dimensionLabel(dimension, item.key) }}</td>
                <td>{{ number.format(item.views) }}</td>
                <td>{{ number.format(item.clicks) }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  </div>
</template>
