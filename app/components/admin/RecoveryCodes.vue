<script setup lang="ts">
const props = defineProps<{ codes: string[] }>()
const emit = defineEmits<{ confirmed: [] }>()
const { t, f } = useAdminI18n()
const saved = ref(false)

function download(): void {
  const host = window.location.host
  const content = f(t.value.setup.recoveryFile, {
    host,
    date: new Date().toLocaleString(),
    codes: props.codes.join('\n'),
  })
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `recovery-codes-${host}.txt`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="grid gap-4">
    <p class="text-sm text-muted">{{ t.setup.recoveryBody }}</p>
    <ol
      class="grid grid-cols-1 gap-x-6 gap-y-1 rounded-md border border-line p-4 font-semibold tabular sm:grid-cols-2"
    >
      <li v-for="code in codes" :key="code" class="tracking-wider">{{ code }}</li>
    </ol>
    <button type="button" class="a-btn w-fit" @click="download">
      {{ t.setup.recoveryDownload }}
    </button>
    <label class="flex items-center gap-3 text-sm">
      <input v-model="saved" type="checkbox" class="a-check" />
      {{ t.setup.recoveryConfirm }}
    </label>
    <button
      type="button"
      class="a-btn a-btn-primary w-fit"
      :disabled="!saved"
      @click="emit('confirmed')"
    >
      {{ t.common.continue }}
    </button>
  </div>
</template>
