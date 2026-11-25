<script setup lang="ts">
import type { CalculatorIndexModel } from '#shared/types/public'

defineProps<{ model: CalculatorIndexModel }>()
</script>

<template>
  <div class="p-document r-page">
    <a href="/" class="p-back">{{ model.labels.common.home }}</a>
    <main id="main">
      <header class="r-hero">
        <h1 class="r-title">{{ model.heading }}</h1>
        <p v-if="model.intro" class="r-intro">{{ model.intro }}</p>
      </header>
      <ol class="r-list c-index">
        <li v-for="item in model.items" :key="item.href">
          <a class="r-row" :href="item.href">
            <span class="r-row-main">
              <span class="r-row-title">{{ item.title }}</span>
              <span v-if="item.intro" class="r-row-topics">{{ item.intro }}</span>
            </span>
            <span class="p-arrow r-row-arrow" aria-hidden="true" v-html="model.icons.chevron" />
          </a>
        </li>
      </ol>
    </main>
    <PublicFooter :footer="model.footer" :text="model.text" />
  </div>
</template>
