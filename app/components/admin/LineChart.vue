<script setup lang="ts">
export interface LineSeries {
  key: string
  label: string
  color: string
  values: number[]
}

const props = defineProps<{
  buckets: string[]
  series: LineSeries[]
  format: (bucket: string) => string
  summary: string
}>()
const { locale } = useAdminI18n()

const WIDTH = 640
const HEIGHT = 220
const PAD = { top: 16, right: 64, bottom: 28, left: 44 }
const active = ref<number | null>(null)
const root = ref<HTMLElement | null>(null)

const number = computed(() => new Intl.NumberFormat(locale.value))
const maxValue = computed(() => Math.max(1, ...props.series.flatMap((series) => series.values)))
const ticks = computed(() => {
  const raw = maxValue.value / 4
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step =
    [1, 2, 5, 10].map((factor) => factor * magnitude).find((value) => value >= raw) ?? raw
  return Array.from({ length: 5 }, (_, index) => index * Math.max(1, Math.ceil(step)))
})
const top = computed(() => ticks.value.at(-1) ?? 1)
const innerWidth = WIDTH - PAD.left - PAD.right
const innerHeight = HEIGHT - PAD.top - PAD.bottom

function x(index: number): number {
  const count = Math.max(1, props.buckets.length - 1)
  return PAD.left + (index / count) * innerWidth
}

function y(value: number): number {
  return PAD.top + innerHeight - (value / top.value) * innerHeight
}

function path(values: number[]): string {
  return values
    .map(
      (value, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(value).toFixed(1)}`,
    )
    .join(' ')
}

const labelIndexes = computed(() => {
  const count = props.buckets.length
  if (count <= 1) return [0]
  const step = Math.ceil(count / 6)
  return Array.from({ length: count }, (_, index) => index).filter(
    (index) => index % step === 0 || index === count - 1,
  )
})

const endLabels = computed(() => {
  const last = props.buckets.length - 1
  const items = props.series.map((series) => ({
    ...series,
    value: series.values[last] ?? 0,
    y: y(series.values[last] ?? 0),
  }))
  items.sort((a, b) => b.y - a.y)
  for (let index = 1; index < items.length; index++) {
    const previous = items[index - 1]
    const item = items[index]
    if (previous && item && previous.y - item.y < 14) item.y = previous.y - 14
  }
  return items
})

function onMove(event: PointerEvent): void {
  const svg = event.currentTarget as SVGElement
  const rect = svg.getBoundingClientRect()
  const relative = ((event.clientX - rect.left) / rect.width) * WIDTH
  const count = props.buckets.length
  if (count === 0) return
  const index = Math.round(((relative - PAD.left) / innerWidth) * (count - 1))
  active.value = Math.min(count - 1, Math.max(0, index))
}

function onKey(event: KeyboardEvent): void {
  const count = props.buckets.length
  if (count === 0) return
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault()
    const current = active.value ?? (event.key === 'ArrowRight' ? -1 : count)
    active.value = Math.min(count - 1, Math.max(0, current + (event.key === 'ArrowRight' ? 1 : -1)))
  } else if (event.key === 'Escape') active.value = null
}

const tooltip = computed(() => {
  if (active.value === null) return null
  const index = active.value
  return {
    left: `${(x(index) / WIDTH) * 100}%`,
    title: props.format(props.buckets[index] ?? ''),
    rows: props.series.map((series) => ({
      label: series.label,
      color: series.color,
      value: number.value.format(series.values[index] ?? 0),
    })),
  }
})
</script>

<template>
  <div ref="root" class="a-viz relative max-w-[48rem]">
    <ul class="mb-2 flex flex-wrap gap-4 text-xs text-muted" aria-hidden="true">
      <li v-for="item in series" :key="item.key" class="flex items-center gap-2">
        <svg width="16" height="8" aria-hidden="true">
          <line
            x1="0"
            y1="4"
            x2="16"
            y2="4"
            :stroke="item.color"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        {{ item.label }}
      </li>
    </ul>
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="h-auto w-full touch-none"
      role="img"
      :aria-label="summary"
      tabindex="0"
      @pointermove="onMove"
      @pointerleave="active = null"
      @keydown="onKey"
      @blur="active = null"
    >
      <g>
        <line
          v-for="tick in ticks"
          :key="tick"
          :x1="PAD.left"
          :x2="WIDTH - PAD.right"
          :y1="y(tick)"
          :y2="y(tick)"
          stroke="var(--viz-grid)"
          stroke-width="1"
        />
        <text
          v-for="tick in ticks"
          :key="`t${tick}`"
          :x="PAD.left - 8"
          :y="y(tick) + 4"
          text-anchor="end"
          class="fill-[var(--wsl-muted)] text-[11px] tabular"
        >
          {{ number.format(tick) }}
        </text>
        <text
          v-for="index in labelIndexes"
          :key="`b${index}`"
          :x="x(index)"
          :y="HEIGHT - 8"
          text-anchor="middle"
          class="fill-[var(--wsl-muted)] text-[11px] tabular"
        >
          {{ format(buckets[index] ?? '') }}
        </text>
      </g>
      <line
        v-if="active !== null"
        :x1="x(active)"
        :x2="x(active)"
        :y1="PAD.top"
        :y2="PAD.top + innerHeight"
        stroke="var(--wsl-muted)"
        stroke-width="1"
      />
      <g v-for="item in series" :key="item.key">
        <path
          :d="path(item.values)"
          fill="none"
          :stroke="item.color"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle
          v-if="active !== null"
          :cx="x(active)"
          :cy="y(item.values[active] ?? 0)"
          r="4"
          :fill="item.color"
          stroke="var(--wsl-bg)"
          stroke-width="2"
        />
        <circle
          v-else-if="buckets.length > 0"
          :cx="x(buckets.length - 1)"
          :cy="y(item.values.at(-1) ?? 0)"
          r="4"
          :fill="item.color"
          stroke="var(--wsl-bg)"
          stroke-width="2"
        />
      </g>
      <text
        v-for="item in endLabels"
        :key="`e${item.key}`"
        :x="WIDTH - PAD.right + 8"
        :y="item.y + 4"
        class="fill-[var(--wsl-text)] text-[11px] font-semibold tabular"
      >
        {{ number.format(item.value) }}
      </text>
    </svg>
    <div
      v-if="tooltip"
      class="pointer-events-none absolute top-8 z-10 -translate-x-1/2 rounded-md border border-line bg-bg px-3 py-2 text-xs shadow-none"
      :style="{ left: tooltip.left }"
      role="status"
    >
      <p class="mb-1 font-semibold tabular">{{ tooltip.title }}</p>
      <p v-for="row in tooltip.rows" :key="row.label" class="flex items-center gap-2 tabular">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :style="{ background: row.color }"
          aria-hidden="true"
        />
        <span class="text-muted">{{ row.label }}</span>
        <span class="ml-auto font-semibold">{{ row.value }}</span>
      </p>
    </div>
  </div>
</template>
