<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useAdminI18n()
const blocks = useBlocks()
const store = useSettings()
const showPreview = ref(false)

useHead({ title: () => t.value.editor.title })

onMounted(async () => {
  await Promise.all([blocks.load(), store.load()])
})

const list = ref<{ expand: (id: string) => void } | null>(null)

onBeforeRouteLeave(async () => {
  await Promise.all([blocks.flushAll(), store.flushAll()])
})
</script>

<template>
  <div>
    <PublishBar :title="t.editor.title" />
    <div class="grid gap-10 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <div class="grid content-start gap-10">
        <ProfileEditor />
        <section class="grid gap-4" aria-labelledby="blocks-title">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 id="blocks-title" class="a-subheading">{{ t.editor.blocks }}</h2>
            <div class="flex gap-2">
              <button
                type="button"
                class="a-btn xl:hidden"
                :aria-expanded="showPreview"
                @click="showPreview = !showPreview"
              >
                {{ showPreview ? t.editor.hidePreview : t.editor.showPreview }}
              </button>
              <InsertMenu
                :parent-id="null"
                :label="t.editor.insert"
                @created="list?.expand($event)"
              />
            </div>
          </div>
          <div v-if="showPreview" class="xl:hidden"><PreviewFrame /></div>
          <BlockList ref="list" />
        </section>
      </div>
      <aside class="hidden xl:block" :aria-label="t.editor.preview">
        <div class="sticky top-6"><PreviewFrame /></div>
      </aside>
    </div>
  </div>
</template>
