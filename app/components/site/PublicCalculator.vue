<script setup lang="ts">
import type { CalculatorPageModel } from '#shared/types/public'

defineProps<{ model: CalculatorPageModel }>()
</script>

<template>
  <div class="p-document r-page c-wide">
    <a :href="model.indexHref ?? '/'" class="p-back">
      <span aria-hidden="true" v-html="model.icons.back" />
      {{ model.indexHref ? model.labels.common.all : model.labels.common.home }}
    </a>
    <main
      id="main"
      class="c-page"
      :data-calculator="model.calculator"
      :data-duration-words="JSON.stringify(model.labels.halflife.duration)"
    >
      <header class="r-hero">
        <h1 class="r-title">{{ model.heading }}</h1>
        <p v-if="model.intro" class="r-intro">{{ model.intro }}</p>
      </header>

      <form class="c-form" method="get">
        <PublicCalcCalories v-if="model.calculator === 'calories'" :model="model" />
        <PublicCalcHalflife v-else-if="model.calculator === 'halflife'" :model="model" />
        <PublicCalcPeptide v-else :model="model" />
        <p class="c-submit">
          <button type="submit" class="p-button">{{ model.labels.common.submit }}</button>
          <span class="c-hint">{{ model.labels.common.noScript }}</span>
        </p>
      </form>

      <aside class="r-disclaimer" :aria-label="model.labels.common.note">
        <p>{{ model.disclaimer }}</p>
      </aside>
    </main>
    <PublicFooter :footer="model.footer" :text="model.text" />
    <PublicToTop :label="model.text.toTop" :icon="model.icons.top" />
  </div>
</template>
