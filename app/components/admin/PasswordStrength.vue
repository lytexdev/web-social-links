<script setup lang="ts">
import type { ZxcvbnFactory } from '@zxcvbn-ts/core'

const props = defineProps<{ password: string; userInputs?: string[] }>()
const { t } = useAdminI18n()
const score = ref<number | null>(null)
let checker: ZxcvbnFactory | null = null

async function load(): Promise<ZxcvbnFactory> {
  if (checker) return checker
  const [core, common, german, english] = await Promise.all([
    import('@zxcvbn-ts/core'),
    import('@zxcvbn-ts/language-common'),
    import('@zxcvbn-ts/language-de'),
    import('@zxcvbn-ts/language-en'),
  ])
  checker = new core.ZxcvbnFactory({
    graphs: common.adjacencyGraphs,
    dictionary: { ...common.dictionary, ...german.dictionary, ...english.dictionary },
    translations: english.translations,
  })
  return checker
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => props.password,
  (value) => {
    clearTimeout(timer)
    if (!value) {
      score.value = null
      return
    }
    timer = setTimeout(async () => {
      const instance = await load()
      score.value = instance.check(value.slice(0, 128), props.userInputs ?? []).score
    }, 150)
  },
)

const label = computed(() =>
  score.value === null ? '' : (t.value.strength.levels[score.value] ?? ''),
)
</script>

<template>
  <div class="grid gap-1" aria-live="polite">
    <div class="a-strength" :data-score="score ?? undefined" aria-hidden="true">
      <span v-for="index in 5" :key="index" />
    </div>
    <p class="a-hint min-h-5">
      <template v-if="label">{{ t.strength.label }}: {{ label }}</template>
    </p>
  </div>
</template>
