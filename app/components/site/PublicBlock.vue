<script setup lang="ts">
import type { BlockView, ChromeModel } from '#shared/types/public'

defineProps<{ block: BlockView; chrome: ChromeModel }>()
</script>

<template>
  <section
    v-if="block.kind === 'group'"
    :aria-labelledby="block.title ? `g-${block.id}` : undefined"
  >
    <details v-if="block.collapsible" class="p-details" :open="block.open">
      <summary>
        <h2 :id="`g-${block.id}`" class="p-label">
          <span v-if="block.index" class="p-index">{{ block.index }}</span>
          {{ block.title }}
        </h2>
        <span aria-hidden="true" class="text-muted" v-html="chrome.icons.chevron" />
      </summary>
      <PublicGroupItems
        :layout="block.layout"
        :items="block.children"
        :text="chrome.text"
        :arrow="chrome.icons.arrow"
      />
    </details>
    <template v-else>
      <h2 v-if="block.title" :id="`g-${block.id}`" class="p-label">
        <span v-if="block.index" class="p-index">{{ block.index }}</span>
        {{ block.title }}
      </h2>
      <PublicGroupItems
        :layout="block.layout"
        :items="block.children"
        :text="chrome.text"
        :arrow="chrome.icons.arrow"
      />
    </template>
  </section>
  <ul v-else-if="block.kind === 'link'" class="p-list">
    <li><PublicLink :link="block" :text="chrome.text" :arrow="chrome.icons.arrow" /></li>
  </ul>
  <div v-else-if="block.kind === 'tile'"><PublicTile :tile="block" :text="chrome.text" /></div>
  <div v-else-if="block.kind === 'text'" class="p-prose" v-html="block.html" />
  <h2 v-else-if="block.kind === 'heading' && block.level === 2" class="grid gap-2">
    <span v-if="block.index" class="p-label"
      ><span class="p-index">{{ block.index }}</span></span
    >
    <span class="p-heading">{{ block.text }}</span>
  </h2>
  <h3 v-else-if="block.kind === 'heading'" class="p-heading p-heading-3">{{ block.text }}</h3>
  <figure v-else-if="block.kind === 'image'" class="p-figure">
    <a
      v-if="block.href"
      :href="block.href"
      :target="block.newTab ? '_blank' : undefined"
      :rel="block.newTab ? 'noopener' : undefined"
    >
      <PublicPicture :image="block.image" />
    </a>
    <PublicPicture v-else :image="block.image" />
    <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
  </figure>
  <div v-else-if="block.kind === 'code'" class="p-ticket">
    <p class="p-label">
      <span>{{ block.label }}</span>
      <span v-if="block.affiliate" class="p-tag">{{ chrome.text.affiliate }}</span>
    </p>
    <p :id="`c-${block.id}`" class="p-code">{{ block.code }}</p>
    <p v-if="block.partner" class="p-sub">{{ block.partner }}</p>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="p-button"
        hidden
        :data-copy="`c-${block.id}`"
        :data-copied="chrome.text.copied"
      >
        <span aria-hidden="true" class="contents" v-html="chrome.icons.copy" />
        <span>{{ chrome.text.copy }}</span>
      </button>
      <a v-if="block.href" :href="block.href" class="p-button">
        {{ block.partner || block.label }}
        <span aria-hidden="true" class="contents" v-html="chrome.icons.arrow" />
      </a>
    </div>
    <p class="sr-only" aria-live="polite" :data-copy-status="`c-${block.id}`" />
  </div>
  <aside v-else-if="block.kind === 'notice'" class="p-notice" :data-tone="block.tone">
    <p v-if="block.title" class="mb-1 font-semibold">{{ block.title }}</p>
    <div class="p-prose" v-html="block.html" />
  </aside>
  <hr v-else-if="block.kind === 'divider'" class="p-divider" />
  <div
    v-else-if="block.kind === 'spacer'"
    class="p-spacer"
    :data-size="block.size"
    aria-hidden="true"
  />
</template>
