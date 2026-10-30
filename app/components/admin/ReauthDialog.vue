<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'

const sudo = useSudo()
const session = useAdminSession()
const { t } = useAdminI18n()
const password = ref('')
const code = ref('')
const error = ref('')
const busy = ref(false)

watch(sudo.open, (value) => {
  if (value) {
    password.value = ''
    code.value = ''
    error.value = ''
  }
})

async function submit(): Promise<void> {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/auth/reauth', {
      method: 'POST',
      body: {
        password: password.value,
        ...(session.user.value?.totpEnabled ? { code: code.value } : {}),
      },
      headers: { 'x-csrf-token': session.csrf.value },
    })
    sudo.settle(true)
  } catch (failure) {
    const parsed = toFailure(failure)
    error.value = parsed.status === 429 ? useFailureMessage()(parsed) : t.value.reauth.invalid
  } finally {
    busy.value = false
  }
}

function onOpenChange(value: boolean): void {
  if (!value) sudo.settle(false)
}
</script>

<template>
  <DialogRoot :open="sudo.open.value" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="a-dialog-overlay" />
      <DialogContent class="a-dialog">
        <DialogTitle class="a-subheading">{{ t.reauth.title }}</DialogTitle>
        <DialogDescription class="mt-2 text-sm text-muted">{{ t.reauth.body }}</DialogDescription>
        <form class="mt-5 grid gap-4" @submit.prevent="submit">
          <AdminField v-slot="field" :label="t.reauth.password" :error="error || undefined">
            <PasswordInput v-bind="field" v-model="password" autocomplete="current-password" />
          </AdminField>
          <AdminField v-if="session.user.value?.totpEnabled" v-slot="field" :label="t.reauth.code">
            <input
              :id="field.id"
              v-model="code"
              class="a-input a-input-mono"
              autocomplete="one-time-code"
              :aria-describedby="field.describedby"
              maxlength="40"
            />
          </AdminField>
          <div class="flex justify-end gap-2">
            <button type="button" class="a-btn" @click="sudo.settle(false)">
              {{ t.common.cancel }}
            </button>
            <button type="submit" class="a-btn a-btn-primary" :disabled="busy || !password">
              {{ t.reauth.submit }}
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
