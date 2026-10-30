<script setup lang="ts">
import type { PageModel } from '#shared/types/public'

defineProps<{ model: PageModel }>()
</script>

<template>
  <p v-if="model.preview" class="p-preview-banner">{{ model.text.preview }}</p>
  <div class="p-shell">
    <header class="p-aside">
      <div
        class="p-profile"
        :data-align="model.profileAlign"
        :data-avatar="model.profile.avatar ? '' : undefined"
      >
        <div v-if="model.profile.avatar" class="p-avatar">
          <PublicPicture :image="model.profile.avatar" alt="" eager />
        </div>
        <div>
          <h1 class="p-name">{{ model.profile.displayName || model.title }}</h1>
          <p v-if="model.profile.handle" class="p-handle">{{ model.profile.handle }}</p>
        </div>
        <p v-if="model.profile.bio" class="p-bio">{{ model.profile.bio }}</p>
        <nav
          v-if="model.profile.social.length > 0"
          class="p-social"
          :aria-label="model.text.channels"
        >
          <a
            v-for="item in model.profile.social"
            :key="item.id"
            :href="item.href"
            :aria-label="item.label"
          >
            <span class="contents" aria-hidden="true" v-html="item.icon" />
          </a>
        </nav>
      </div>
    </header>
    <main id="main" class="p-main p-enter">
      <PublicBlock v-for="block in model.blocks" :key="block.id" :block="block" :chrome="model" />
    </main>
    <PublicFooter :footer="model.footer" :text="model.text" />
  </div>
</template>
