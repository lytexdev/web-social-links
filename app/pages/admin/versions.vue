<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface Version {
  revision: number
  publishedAt: number
  note: string | null
}

const { t, f } = useAdminI18n()
const { request } = useApi()
const toasts = useToasts()
const status = usePublishStatus()
const format = useFormat()
const versions = ref<Version[]>([])
const restoring = ref<Version | null>(null)

useHead({ title: () => t.value.versions.title })

onMounted(async () => {
  versions.value = await request<Version[]>('/api/admin/versions')
})

async function restore(): Promise<void> {
  const version = restoring.value
  if (!version) return
  await status.track(request(`/api/admin/versions/${version.revision}/restore`, { body: {} }))
  restoring.value = null
  toasts.push(f(t.value.versions.restored, { revision: version.revision }))
}
</script>

<template>
  <div class="max-w-[52rem]">
    <PublishBar :title="t.versions.title" />
    <p v-if="versions.length === 0" class="text-sm text-muted">{{ t.versions.empty }}</p>
    <table v-else class="a-table">
      <thead>
        <tr>
          <th scope="col">{{ t.versions.revision }}</th>
          <th scope="col">{{ t.versions.date }}</th>
          <th scope="col">{{ t.versions.note }}</th>
          <th scope="col">
            <span class="sr-only">{{ t.versions.restore }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="version in versions" :key="version.revision">
          <td class="font-semibold">{{ version.revision }}</td>
          <td>{{ format.dateTime(version.publishedAt) }}</td>
          <td>{{ version.note ?? '' }}</td>
          <td>
            <div class="flex flex-wrap justify-end gap-1">
              <a
                class="a-btn a-btn-sm"
                :href="`/admin/preview?rev=${version.revision}`"
                target="_blank"
                rel="noopener"
                >{{ t.versions.view }}</a
              >
              <button type="button" class="a-btn a-btn-sm" @click="restoring = version">
                {{ t.versions.restore }}
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <ConfirmDialog
      :open="restoring !== null"
      :title="f(t.versions.restoreTitle, { revision: restoring?.revision ?? '' })"
      :body="t.versions.restoreBody"
      :confirm-label="t.versions.restore"
      @update:open="!$event && (restoring = null)"
      @confirm="restore"
    />
  </div>
</template>
