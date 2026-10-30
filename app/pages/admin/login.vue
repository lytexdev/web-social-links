<script setup lang="ts">
definePageMeta({ layout: 'admin-bare', middleware: 'admin' })

const { t, f } = useAdminI18n()
const session = useAdminSession()
const username = ref('')
const password = ref('')
const website = ref('')
const formToken = ref('')
const challenge = ref('')
const code = ref('')
const useRecovery = ref(false)
const error = ref('')
const busy = ref(false)
const codeInput = ref<HTMLInputElement | null>(null)

useHead({ title: () => t.value.login.title })

async function refreshToken(): Promise<void> {
  formToken.value = (await $fetch<{ token: string }>('/api/admin/auth/form-token')).token
}

onMounted(refreshToken)

async function finish(next: string): Promise<void> {
  await session.load()
  await navigateTo(next === 'setup' ? '/admin/setup' : '/admin')
}

function describe(failure: ApiFailure): string {
  if (failure.status === 429)
    return f(t.value.login.rateLimited, {
      minutes: Math.max(1, Math.ceil(failure.retryAfter / 60)),
    })
  if (failure.code === 'invalid_credentials') return t.value.login.invalid
  return useFailureMessage()(failure)
}

async function submit(): Promise<void> {
  busy.value = true
  error.value = ''
  try {
    const result = await $fetch<{ next: string; challenge?: string }>('/api/admin/auth/login', {
      method: 'POST',
      body: {
        username: username.value,
        password: password.value,
        website: website.value,
        formToken: formToken.value,
      },
    })
    if (result.next === 'totp' && result.challenge) {
      challenge.value = result.challenge
      password.value = ''
      await nextTick()
      codeInput.value?.focus()
      return
    }
    await finish(result.next)
  } catch (failure) {
    error.value = describe(toFailure(failure))
    await refreshToken().catch(() => undefined)
  } finally {
    busy.value = false
  }
}

async function verify(): Promise<void> {
  busy.value = true
  error.value = ''
  try {
    const result = await $fetch<{ next: string }>('/api/admin/auth/totp', {
      method: 'POST',
      body: { challenge: challenge.value, code: code.value },
    })
    await finish(result.next)
  } catch (failure) {
    const parsed = toFailure(failure)
    if (parsed.code === 'challenge_expired') {
      challenge.value = ''
      code.value = ''
      error.value = t.value.login.expired
      await refreshToken().catch(() => undefined)
    } else if (parsed.code === 'code_invalid') {
      error.value = f(t.value.login.codeInvalid, { remaining: parsed.fields.code ?? '0' })
      code.value = ''
    } else error.value = useFailureMessage()(parsed)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <p class="label text-muted">web-social-links</p>
    <h1 class="a-heading mt-3">{{ challenge ? t.login.totpTitle : t.login.title }}</h1>
    <p v-if="error" role="alert" class="a-error mt-4 text-sm">{{ error }}</p>

    <form v-if="!challenge" class="mt-6 grid gap-4" novalidate @submit.prevent="submit">
      <AdminField v-slot="field" :label="t.login.username">
        <input
          :id="field.id"
          v-model="username"
          class="a-input"
          name="username"
          autocomplete="username"
          autocapitalize="off"
          spellcheck="false"
          maxlength="64"
          required
        />
      </AdminField>
      <AdminField v-slot="field" :label="t.login.password">
        <PasswordInput v-bind="field" v-model="password" autocomplete="current-password" />
      </AdminField>
      <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label for="login-website">{{ t.login.honeypot }}</label>
        <input
          id="login-website"
          v-model="website"
          name="website"
          type="text"
          tabindex="-1"
          autocomplete="off"
        />
      </div>
      <button type="submit" class="a-btn a-btn-primary mt-2" :disabled="busy || !formToken">
        {{ t.login.submit }}
      </button>
    </form>

    <form v-else class="mt-6 grid gap-4" novalidate @submit.prevent="verify">
      <AdminField v-slot="field" :label="useRecovery ? t.login.recoveryLabel : t.login.totpLabel">
        <input
          :id="field.id"
          ref="codeInput"
          v-model="code"
          class="a-input a-input-mono"
          :inputmode="useRecovery ? 'text' : 'numeric'"
          :autocomplete="useRecovery ? 'off' : 'one-time-code'"
          :maxlength="useRecovery ? 24 : 6"
          autocapitalize="characters"
          spellcheck="false"
          required
        />
      </AdminField>
      <button type="submit" class="a-btn a-btn-primary" :disabled="busy || !code">
        {{ t.login.verify }}
      </button>
      <button
        type="button"
        class="a-btn a-btn-quiet"
        @click="((useRecovery = !useRecovery), (code = ''))"
      >
        {{ useRecovery ? t.login.useTotp : t.login.useRecovery }}
      </button>
    </form>
  </div>
</template>
