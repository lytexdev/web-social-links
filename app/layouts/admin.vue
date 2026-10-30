<script setup lang="ts">
import {
  IconChartLine,
  IconExternalLink,
  IconFileText,
  IconHistory,
  IconLayoutList,
  IconLink,
  IconLogout,
  IconMenu2,
  IconPalette,
  IconPhoto,
  IconSettings,
  IconShieldLock,
  IconX,
} from '@tabler/icons-vue'

const { t, locale } = useAdminI18n()
const session = useAdminSession()
const route = useRoute()
const drawer = ref(false)

const items = computed(() => [
  { to: '/admin', label: t.value.nav.page, icon: IconLayoutList },
  { to: '/admin/design', label: t.value.nav.design, icon: IconPalette },
  { to: '/admin/media', label: t.value.nav.media, icon: IconPhoto },
  { to: '/admin/pages', label: t.value.nav.pages, icon: IconFileText },
  { to: '/admin/stats', label: t.value.nav.stats, icon: IconChartLine },
  { to: '/admin/sources', label: t.value.nav.sources, icon: IconLink },
  { to: '/admin/versions', label: t.value.nav.versions, icon: IconHistory },
  { to: '/admin/settings', label: t.value.nav.settings, icon: IconSettings },
  { to: '/admin/security', label: t.value.nav.security, icon: IconShieldLock },
])

function active(to: string): boolean {
  return to === '/admin' ? route.path === '/admin' : route.path.startsWith(to)
}

watch(
  () => route.path,
  () => (drawer.value = false),
)

async function logout(): Promise<void> {
  await $fetch('/api/admin/auth/logout', {
    method: 'POST',
    headers: { 'x-csrf-token': session.csrf.value },
  }).catch(() => undefined)
  session.me.value = { authenticated: false }
  await navigateTo('/admin/login')
}

useHead({ htmlAttrs: { lang: locale } })
</script>

<template>
  <div class="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent"
      >{{ t.common.skipToContent }}</a
    >
    <header class="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
      <span class="label">web-social-links</span>
      <button
        type="button"
        class="a-btn a-btn-icon"
        :aria-expanded="drawer"
        aria-controls="admin-nav"
        :aria-label="t.common.menu"
        @click="drawer = !drawer"
      >
        <IconX v-if="drawer" :size="20" aria-hidden="true" />
        <IconMenu2 v-else :size="20" aria-hidden="true" />
      </button>
    </header>
    <nav
      id="admin-nav"
      :aria-label="t.common.menu"
      class="border-line lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r"
      :class="drawer ? 'flex flex-col border-b' : 'hidden lg:flex'"
    >
      <p class="label hidden px-5 pt-6 pb-4 text-muted lg:block">web-social-links</p>
      <ul class="grid gap-0.5 px-2 py-2">
        <li v-for="item in items" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150 hover:bg-surface"
            :class="active(item.to) ? 'bg-surface text-text' : 'text-muted'"
            :aria-current="active(item.to) ? 'page' : undefined"
          >
            <component
              :is="item.icon"
              :size="18"
              aria-hidden="true"
              :class="active(item.to) ? 'text-accent' : ''"
            />
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>
      <div class="mt-auto grid gap-1 border-t border-line px-2 py-3">
        <a
          href="/"
          target="_blank"
          rel="noopener"
          class="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm text-muted hover:bg-surface"
        >
          <IconExternalLink :size="18" aria-hidden="true" />
          {{ t.nav.viewSite }}
        </a>
        <button
          type="button"
          class="flex min-h-10 items-center gap-3 rounded-md px-3 text-left text-sm text-muted hover:bg-surface"
          @click="logout"
        >
          <IconLogout :size="18" aria-hidden="true" />
          {{ t.nav.logout }}
          <span class="ml-auto truncate text-xs">{{ session.user.value?.username }}</span>
        </button>
      </div>
    </nav>
    <div class="min-w-0">
      <p
        v-if="session.user.value && !session.user.value.totpEnabled"
        class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2 text-sm text-muted lg:px-8"
      >
        {{ t.nav.totpHint }}
        <NuxtLink to="/admin/security" class="font-semibold text-text underline underline-offset-4">
          {{ t.nav.totpHintAction }}
        </NuxtLink>
      </p>
      <main id="main" tabindex="-1" class="px-4 py-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>
    <ReauthDialog />
    <ToastRegion />
  </div>
</template>
