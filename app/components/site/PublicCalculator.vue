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
      :data-spray-label="model.labels.peptide.drawSpray"
      :data-chart-at="model.labels.halflife.chartAt"
      :data-effect-at="model.labels.halflife.effectChartAt"
      :data-material-labels="
        JSON.stringify({
          amount: model.labels.halflife.material.amount,
          potency: model.labels.halflife.material.potency,
        })
      "
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
          <a :href="model.path" class="p-button" data-reset>{{ model.labels.common.reset }}</a>
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
          <a :href="model.path" class="p-button" data-reset>{{ model.labels.common.reset }}</a>
          <span class="sr-only" role="status" data-copy-status />
          <label class="p-button c-remember">
            <input type="checkbox" data-remember />
            <span>{{ model.labels.common.remember }}</span>
          </label>
          <p class="c-hint c-tools-hint">{{ model.labels.common.rememberHint }}</p>
        </div>
      </form>

      <div v-if="model.contentHtml" class="p-prose c-content" v-html="model.contentHtml" />

      <aside class="r-disclaimer" :aria-label="model.labels.common.note">
        <p>{{ model.disclaimer }}</p>
      </aside>
    </main>
    <PublicFooter :footer="model.footer" :text="model.text" />
    <PublicThemeToggle :chrome="model" />
    <PublicToTop :label="model.text.toTop" :icon="model.icons.top" />
  </div>
</template>
