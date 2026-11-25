<script setup lang="ts">
import type { ReferenceIndexModel } from '#shared/types/public'

defineProps<{ model: ReferenceIndexModel }>()
</script>

<template>
  <div class="p-document r-page">
    <a href="/" class="p-back">{{ model.labels.home }}</a>
    <main id="main" class="r-index">
      <header class="r-hero">
        <h1 class="p-name r-heading">{{ model.heading }}</h1>
        <p v-if="model.intro" class="r-intro">{{ model.intro }}</p>
      </header>

      <form class="r-search" role="search" method="get" :action="model.basePath">
        <label for="r-q" class="r-search-label">{{ model.labels.search }}</label>
        <div class="r-search-row">
          <input
            id="r-q"
            class="r-input"
            type="search"
            name="q"
            :value="model.query.q"
            :placeholder="model.labels.searchHint"
            autocomplete="off"
            enterkeyhint="search"
            maxlength="100"
            data-r-search
          />
          <input v-if="model.query.type" type="hidden" name="type" :value="model.query.type" />
          <input v-if="model.query.topic" type="hidden" name="topic" :value="model.query.topic" />
          <button type="submit" class="p-button r-submit">{{ model.labels.submit }}</button>
        </div>
      </form>

      <nav class="r-filters" :aria-label="model.labels.filters">
        <ul class="r-segments">
          <li v-for="item in model.types" :key="item.href">
            <a class="r-segment" :href="item.href" :aria-current="item.active ? 'page' : undefined"
              >{{ item.label }} <span class="r-segment-count">{{ item.count }}</span></a
            >
          </li>
        </ul>
        <div v-if="model.topics.length > 0" class="r-topic-block">
          <p class="r-filter-label">{{ model.labels.topics }}</p>
          <ul class="r-chips">
            <li v-for="item in model.topics" :key="item.name">
              <a class="r-chip" :href="item.href" :aria-current="item.active ? 'true' : undefined"
                >{{ item.name }} <span class="r-chip-count">{{ item.count }}</span></a
              >
            </li>
          </ul>
          <details v-if="model.moreTopics.length > 0" class="r-more">
            <summary>{{ model.labels.moreTopics }} ({{ model.moreTopics.length }})</summary>
            <ul class="r-chips">
              <li v-for="item in model.moreTopics" :key="item.name">
                <a class="r-chip" :href="item.href"
                  >{{ item.name }} <span class="r-chip-count">{{ item.count }}</span></a
                >
              </li>
            </ul>
          </details>
        </div>
      </nav>

      <div class="r-status">
        <p
          class="r-count"
          role="status"
          data-r-count
          :data-one="model.labels.resultOne"
          :data-many="model.labels.results"
        >
          {{ model.results }}
        </p>
        <a v-if="model.resetHref" class="r-reset" :href="model.resetHref">{{
          model.labels.reset
        }}</a>
      </div>

      <p class="r-empty" :hidden="model.groups.length > 0" data-r-empty>{{ model.labels.none }}</p>

      <section
        v-for="(group, index) in model.groups"
        :key="group.label"
        class="r-group"
        :aria-labelledby="`r-group-${index}`"
        data-r-group
      >
        <h2 :id="`r-group-${index}`" class="p-label r-group-label">{{ group.label }}</h2>
        <ol class="r-list">
          <li v-for="item in group.items" :key="item.href" data-r-item :data-search="item.search">
            <a class="r-row" :href="item.href">
              <span class="r-row-main">
                <span class="r-row-title">{{ item.title }}</span>
                <span class="r-row-meta">
                  <span class="p-tag">{{ item.kind }}</span>
                  <time v-if="item.datetime" :datetime="item.datetime">{{ item.date }}</time>
                  <span>{{ item.meta }}</span>
                </span>
                <span v-if="item.topics.length > 0" class="r-row-topics">{{
                  item.topics.join(' · ')
                }}</span>
              </span>
              <span class="p-arrow r-row-arrow" aria-hidden="true" v-html="model.icons.chevron" />
            </a>
          </li>
        </ol>
      </section>
    </main>
    <PublicFooter :footer="model.footer" :text="model.text" />
  </div>
</template>
