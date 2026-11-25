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
      :data-route-labels="JSON.stringify(model.labels.halflife.routes)"
      :data-route-notes="JSON.stringify(model.labels.halflife.routeNotes)"
      :data-chart-at="model.labels.halflife.chartAt"
      :data-picker-labels="
        JSON.stringify({
          search: model.labels.halflife.searchSubstance,
          none: model.labels.halflife.noMatch,
          categories: model.labels.halflife.categories,
        })
      "
    >
      <form class="c-form" method="get">
        <header class="r-hero c-head">
          <div class="c-head-text">
            <h1 class="r-title">{{ model.heading }}</h1>
            <p v-if="model.intro" class="r-intro">{{ model.intro }}</p>
          </div>
          <fieldset v-if="model.calculator === 'peptide'" class="c-modes">
            <legend class="sr-only">{{ model.labels.peptide.mode }}</legend>
            <label v-for="key in ['syringe', 'spray']" :key="key" class="c-mode">
              <input
                type="radio"
                name="mode"
                :value="key"
                :checked="(model.form.mode ?? 'syringe') === key"
              />
              <span>{{ model.labels.peptide.modes[key] }}</span>
            </label>
          </fieldset>
        </header>

        <PublicCalcCalories v-if="model.calculator === 'calories'" :model="model" />
        <PublicCalcHalflife v-else-if="model.calculator === 'halflife'" :model="model" />
        <PublicCalcPeptide v-else :model="model" />
        <p class="c-submit">
          <button type="submit" class="p-button">{{ model.labels.common.submit }}</button>
          <span class="c-hint">{{ model.labels.common.noScript }}</span>
        </p>

        <div class="c-tools" data-tools hidden>
          <button
            type="button"
            class="p-button"
            data-copy-url
            :data-copied="model.labels.common.copied"
          >
            <span aria-hidden="true" v-html="model.icons.copy" />
            <span data-copy-label>{{ model.labels.common.copyLink }}</span>
          </button>
          <span class="sr-only" role="status" data-copy-status />
          <label class="c-remember">
            <input type="checkbox" data-remember />
            <span>
              {{ model.labels.common.remember }}
              <span class="c-hint">{{ model.labels.common.rememberHint }}</span>
            </span>
          </label>
        </div>
      </form>

      <aside class="r-disclaimer" :aria-label="model.labels.common.note">
        <p>{{ model.disclaimer }}</p>
      </aside>
    </main>
    <PublicFooter :footer="model.footer" :text="model.text" />
    <PublicToTop :label="model.text.toTop" :icon="model.icons.top" />
  </div>
</template>
