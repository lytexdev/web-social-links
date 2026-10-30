<script setup lang="ts">
const props = defineProps<{ scope: 'setup' | 'account' }>()
const emit = defineEmits<{ enrolled: [codes: string[]] }>()

const { t } = useAdminI18n()
const { request } = useApi()
const enrollment = ref<{ secret: string; qr: string } | null>(null)
const code = ref('')
const error = ref('')
const busy = ref(false)
const copied = ref(false)

const groupedSecret = computed(() => enrollment.value?.secret.match(/.{1,4}/g)?.join(' ') ?? '')

onMounted(async () => {
  try {
    enrollment.value = await request<{ secret: string; qr: string }>(
      `/api/admin/${props.scope}/totp-start`,
      {
        body: {},
      },
    )
  } catch (failure) {
    error.value = useFailureMessage()(toFailure(failure))
  }
})

async function copySecret(): Promise<void> {
  if (!enrollment.value) return
  await navigator.clipboard.writeText(enrollment.value.secret)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

async function confirm(): Promise<void> {
  busy.value = true
  error.value = ''
  try {
    const result = await request<{ recoveryCodes: string[] }>(
      `/api/admin/${props.scope}/totp-confirm`,
      {
        body: { code: code.value },
      },
    )
    emit('enrolled', result.recoveryCodes)
  } catch (failure) {
    const parsed = toFailure(failure)
    error.value = parsed.fields.code
      ? (t.value.fields[parsed.fields.code as keyof typeof t.value.fields] ??
        t.value.fields.invalid)
      : useFailureMessage()(parsed)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="grid gap-5">
    <p class="text-sm text-muted">{{ t.setup.totpBody }}</p>
    <div v-if="enrollment" class="grid gap-5 sm:grid-cols-[10rem_1fr] sm:items-start">
      <img :src="enrollment.qr" alt="" width="160" height="160" class="rounded-md bg-white p-1" />
      <div class="grid gap-2">
        <p class="a-label">{{ t.setup.totpSecret }}</p>
        <code class="a-input a-input-mono flex items-center break-all">{{ groupedSecret }}</code>
        <button type="button" class="a-btn a-btn-sm w-fit" @click="copySecret">
          {{ copied ? t.common.copied : t.common.copy }}
        </button>
        <p class="sr-only" aria-live="polite">{{ copied ? t.common.copied : '' }}</p>
      </div>
    </div>
    <form class="grid gap-4" @submit.prevent="confirm">
      <AdminField v-slot="field" :label="t.setup.totpCode" :error="error || undefined">
        <input
          :id="field.id"
          v-model="code"
          class="a-input a-input-mono max-w-[12rem]"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          :aria-describedby="field.describedby"
          :aria-invalid="field.invalid"
        />
      </AdminField>
      <slot name="actions" :busy="busy" :ready="code.length === 6">
        <button
          type="submit"
          class="a-btn a-btn-primary w-fit"
          :disabled="busy || code.length !== 6"
        >
          {{ t.setup.totpConfirm }}
        </button>
      </slot>
    </form>
  </div>
</template>
