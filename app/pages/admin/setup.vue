<script setup lang="ts">
definePageMeta({ layout: 'admin-bare', middleware: 'admin' })

type Step = 'password' | 'username' | 'totp' | 'recovery' | 'done'

const { t, f } = useAdminI18n()
const session = useAdminSession()
const { request } = useApi()
const step = ref<Step>(session.user.value?.mustChangePassword ? 'password' : 'username')
const password = ref('')
const username = ref(session.user.value?.username ?? '')
const fields = ref<Record<string, string>>({})
const error = ref('')
const busy = ref(false)
const codes = ref<string[]>([])
const totpSkipped = ref(false)
const heading = ref<HTMLElement | null>(null)

const order: Step[] = ['password', 'username', 'totp', 'done']
const position = computed(
  () => Math.max(order.indexOf(step.value === 'recovery' ? 'totp' : step.value), 0) + 1,
)
const title = computed(
  () =>
    ({
      password: t.value.setup.passwordTitle,
      username: t.value.setup.usernameTitle,
      totp: t.value.setup.totpTitle,
      recovery: t.value.setup.recoveryTitle,
      done: t.value.setup.doneTitle,
    })[step.value],
)

useHead({ title: () => t.value.setup.title })

watch(step, async () => {
  fields.value = {}
  error.value = ''
  await nextTick()
  heading.value?.focus()
})

function fieldError(name: string): string | undefined {
  const code = fields.value[name]
  if (!code) return undefined
  return t.value.fields[code as keyof typeof t.value.fields] ?? t.value.fields.invalid
}

async function run(action: () => Promise<void>): Promise<void> {
  busy.value = true
  fields.value = {}
  error.value = ''
  try {
    await action()
  } catch (failure) {
    const parsed = toFailure(failure)
    fields.value = parsed.fields
    if (Object.keys(parsed.fields).length === 0) error.value = useFailureMessage()(parsed)
  } finally {
    busy.value = false
  }
}

const savePassword = () =>
  run(async () => {
    await request('/api/admin/setup/password', { body: { password: password.value } })
    password.value = ''
    await session.load()
    step.value = 'username'
  })

const saveUsername = () =>
  run(async () => {
    if (username.value.trim().toLowerCase() !== session.user.value?.username) {
      await request('/api/admin/setup/username', { body: { username: username.value } })
      await session.load()
    }
    step.value = session.user.value?.totpEnabled ? 'done' : 'totp'
  })

async function enrolled(list: string[]): Promise<void> {
  codes.value = list
  await session.load()
  step.value = 'recovery'
}

function skipTotp(): void {
  totpSkipped.value = true
  step.value = 'done'
}

const finish = () =>
  run(async () => {
    await request('/api/admin/setup/finish', { body: {} })
    await session.load()
    await navigateTo('/admin')
  })
</script>

<template>
  <div>
    <p class="label text-muted">
      {{ t.setup.title }} · {{ f(t.setup.step, { current: position, total: order.length }) }}
    </p>
    <h1 ref="heading" tabindex="-1" class="a-heading mt-3">{{ title }}</h1>
    <p v-if="error" role="alert" class="a-error mt-4">{{ error }}</p>

    <form v-if="step === 'password'" class="mt-6 grid gap-4" @submit.prevent="savePassword">
      <p class="text-sm text-muted">{{ t.setup.passwordBody }}</p>
      <AdminField v-slot="field" :label="t.setup.passwordLabel" :error="fieldError('password')">
        <PasswordInput v-bind="field" v-model="password" autocomplete="new-password" />
      </AdminField>
      <PasswordStrength :password="password" :user-inputs="[session.user.value?.username ?? '']" />
      <button
        type="submit"
        class="a-btn a-btn-primary w-fit"
        :disabled="busy || password.length < 12"
      >
        {{ t.common.continue }}
      </button>
    </form>

    <form v-else-if="step === 'username'" class="mt-6 grid gap-4" @submit.prevent="saveUsername">
      <p class="text-sm text-muted">{{ t.setup.usernameBody }}</p>
      <AdminField v-slot="field" :label="t.setup.usernameLabel" :error="fieldError('username')">
        <input
          :id="field.id"
          v-model="username"
          class="a-input"
          autocomplete="username"
          autocapitalize="off"
          spellcheck="false"
          maxlength="32"
          :aria-describedby="field.describedby"
          :aria-invalid="field.invalid"
        />
      </AdminField>
      <div class="flex gap-2">
        <button type="submit" class="a-btn a-btn-primary" :disabled="busy">
          {{ t.common.continue }}
        </button>
      </div>
    </form>

    <div v-else-if="step === 'totp'" class="mt-6">
      <TotpEnrollment scope="setup" @enrolled="enrolled">
        <template #actions="{ busy: confirming, ready }">
          <div class="flex flex-wrap gap-2">
            <button type="submit" class="a-btn a-btn-primary" :disabled="confirming || !ready">
              {{ t.setup.totpConfirm }}
            </button>
            <button type="button" class="a-btn a-btn-quiet" @click="skipTotp">
              {{ t.common.skip }}
            </button>
          </div>
        </template>
      </TotpEnrollment>
    </div>

    <div v-else-if="step === 'recovery'" class="mt-6">
      <RecoveryCodes :codes="codes" @confirmed="step = 'done'" />
    </div>

    <div v-else class="mt-6 grid gap-4">
      <p class="text-sm text-muted">{{ t.setup.doneBody }}</p>
      <p v-if="totpSkipped" class="text-sm text-muted">{{ t.setup.doneSkippedTotp }}</p>
      <button type="button" class="a-btn a-btn-primary w-fit" :disabled="busy" @click="finish">
        {{ t.setup.finish }}
      </button>
    </div>
  </div>
</template>
