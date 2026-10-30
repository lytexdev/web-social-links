<script setup lang="ts">
import { SECURITY_EVENT_LABEL_KEYS } from '#shared/constants/security'

definePageMeta({ layout: 'admin', middleware: 'admin' })

interface SessionItem {
  id: string
  current: boolean
  uaFamily: string
  ip: string
  createdAt: number
  lastSeenAt: number
}
interface BanItem {
  ip: string
  reason: string
  expiresAt: number
}
interface EventItem {
  id: number
  type: string
  ip: string | null
  username: string | null
  meta: Record<string, unknown> | null
  createdAt: number
}

const { t, f } = useAdminI18n()
const session = useAdminSession()
const { request } = useApi()
const toasts = useToasts()
const failureMessage = useFailureMessage()
const format = useFormat()

useHead({ title: () => t.value.security.title })

const newUsername = ref(session.user.value?.username ?? '')
const newPassword = ref('')
const fields = ref<Record<string, string>>({})
const busy = ref('')
const enrolling = ref(false)
const freshCodes = ref<string[]>([])
const disabling = ref(false)
const disablePassword = ref('')
const disableCode = ref('')
const disableError = ref('')
const sessions = ref<SessionItem[] | null>(null)
const bans = ref<BanItem[]>([])
const events = ref<EventItem[]>([])
const nextCursor = ref<number | null>(null)
const eventType = ref('')

function fieldError(name: string): string | undefined {
  const code = fields.value[name]
  return code
    ? (t.value.fields[code as keyof typeof t.value.fields] ?? t.value.fields.invalid)
    : undefined
}

async function act(key: string, action: () => Promise<void>): Promise<void> {
  busy.value = key
  fields.value = {}
  try {
    await action()
  } catch (failure) {
    const parsed = toFailure(failure)
    if (parsed.code === 'reauth_cancelled') return
    fields.value = parsed.fields
    if (Object.keys(parsed.fields).length === 0)
      toasts.push(failureMessage(parsed), { tone: 'error' })
  } finally {
    busy.value = ''
  }
}

const saveUsername = () =>
  act('username', async () => {
    await request('/api/admin/account/username', { body: { username: newUsername.value } })
    await session.load()
    toasts.push(t.value.security.usernameChanged)
  })

const savePassword = () =>
  act('password', async () => {
    await request('/api/admin/account/password', { body: { password: newPassword.value } })
    newPassword.value = ''
    await session.load()
    toasts.push(t.value.security.passwordChanged)
  })

async function enrolled(codes: string[]): Promise<void> {
  enrolling.value = false
  freshCodes.value = codes
  await session.load()
  toasts.push(t.value.security.totpEnabled)
}

const regenerate = () =>
  act('regenerate', async () => {
    const result = await request<{ recoveryCodes: string[] }>('/api/admin/account/recovery-codes', {
      body: {},
    })
    freshCodes.value = result.recoveryCodes
    await session.load()
  })

async function disable(): Promise<void> {
  disableError.value = ''
  await act('disable', async () => {
    try {
      await request('/api/admin/account/totp-disable', {
        body: { password: disablePassword.value, code: disableCode.value },
      })
    } catch (failure) {
      const parsed = toFailure(failure)
      if (parsed.code === 'credentials_invalid') {
        disableError.value = t.value.reauth.invalid
        return
      }
      throw parsed
    }
    disabling.value = false
    disablePassword.value = ''
    disableCode.value = ''
    await session.load()
    toasts.push(t.value.security.totpDisabled)
  })
}

const loadSessions = () =>
  act('sessions', async () => {
    sessions.value = await request<SessionItem[]>('/api/admin/sessions')
  })

const revoke = (id: string) =>
  act(`revoke-${id}`, async () => {
    await request(`/api/admin/sessions/${id}`, { method: 'DELETE' })
    sessions.value = sessions.value?.filter((item) => item.id !== id) ?? null
    toasts.push(t.value.security.revoked)
  })

const revokeOthers = () =>
  act('revoke-others', async () => {
    const result = await request<{ removed: number }>('/api/admin/sessions/others', {
      method: 'DELETE',
    })
    sessions.value = sessions.value?.filter((item) => item.current) ?? null
    toasts.push(f(t.value.security.revokedOthers, { count: result.removed }))
  })

async function loadBans(): Promise<void> {
  bans.value = await request<BanItem[]>('/api/admin/security/bans')
}

const unban = (ip: string) =>
  act(`unban-${ip}`, async () => {
    await request(`/api/admin/security/bans/${encodeURIComponent(ip)}`, { method: 'DELETE' })
    await loadBans()
    toasts.push(t.value.security.unbanned)
  })

async function loadEvents(append = false): Promise<void> {
  const params = new URLSearchParams({ limit: '50' })
  if (eventType.value) params.set('type', eventType.value)
  if (append && nextCursor.value) params.set('before', String(nextCursor.value))
  const result = await request<{ events: EventItem[]; next: number | null }>(
    `/api/admin/security/events?${params}`,
  )
  events.value = append ? [...events.value, ...result.events] : result.events
  nextCursor.value = result.next
}

function details(meta: Record<string, unknown> | null): string {
  if (!meta) return ''
  return Object.entries(meta)
    .map(
      ([key, value]) =>
        `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`,
    )
    .join(', ')
}

watch(eventType, () => loadEvents())
onMounted(() =>
  Promise.all([loadBans(), loadEvents()]).catch((failure) =>
    toasts.push(failureMessage(toFailure(failure)), { tone: 'error' }),
  ),
)
</script>

<template>
  <div class="max-w-[52rem]">
    <h1 class="a-heading">{{ t.security.title }}</h1>

    <section class="a-section mt-6 grid gap-6" aria-labelledby="sec-account">
      <h2 id="sec-account" class="a-subheading">{{ t.security.account }}</h2>
      <form class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" @submit.prevent="saveUsername">
        <AdminField v-slot="field" :label="t.security.username" :error="fieldError('username')">
          <input
            :id="field.id"
            v-model="newUsername"
            class="a-input"
            autocomplete="username"
            autocapitalize="off"
            maxlength="32"
            :aria-describedby="field.describedby"
            :aria-invalid="field.invalid"
          />
        </AdminField>
        <button
          type="submit"
          class="a-btn"
          :disabled="busy === 'username' || newUsername === session.user.value?.username"
        >
          {{ t.security.changeUsername }}
        </button>
      </form>
      <form class="grid gap-3" @submit.prevent="savePassword">
        <div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <AdminField
            v-slot="field"
            :label="t.security.newPassword"
            :error="fieldError('password')"
          >
            <PasswordInput v-bind="field" v-model="newPassword" autocomplete="new-password" />
          </AdminField>
          <button
            type="submit"
            class="a-btn"
            :disabled="busy === 'password' || newPassword.length < 12"
          >
            {{ t.security.changePassword }}
          </button>
        </div>
        <PasswordStrength
          :password="newPassword"
          :user-inputs="[session.user.value?.username ?? '']"
        />
      </form>
    </section>

    <section class="a-section grid gap-4" aria-labelledby="sec-totp">
      <h2 id="sec-totp" class="a-subheading">{{ t.security.totp }}</h2>
      <p class="text-sm text-muted">
        {{
          session.user.value?.totpEnabled
            ? f(t.security.totpOn, { count: session.user.value.recoveryCodesLeft })
            : t.security.totpOff
        }}
      </p>
      <RecoveryCodes
        v-if="freshCodes.length > 0"
        :codes="freshCodes"
        @confirmed="freshCodes = []"
      />
      <template v-else-if="session.user.value?.totpEnabled">
        <div v-if="!disabling" class="flex flex-wrap gap-2">
          <button type="button" class="a-btn" :disabled="busy === 'regenerate'" @click="regenerate">
            {{ t.security.regenerate }}
          </button>
          <button type="button" class="a-btn a-btn-danger" @click="disabling = true">
            {{ t.security.totpDisable }}
          </button>
        </div>
        <form
          v-else
          class="grid max-w-[28rem] gap-4 rounded-md border border-line p-4"
          @submit.prevent="disable"
        >
          <h3 class="font-semibold">{{ t.security.totpDisableTitle }}</h3>
          <p class="text-sm text-muted">{{ t.security.totpDisableBody }}</p>
          <AdminField v-slot="field" :label="t.reauth.password" :error="disableError || undefined">
            <PasswordInput
              v-bind="field"
              v-model="disablePassword"
              autocomplete="current-password"
            />
          </AdminField>
          <AdminField v-slot="field" :label="t.reauth.code">
            <input
              :id="field.id"
              v-model="disableCode"
              class="a-input a-input-mono"
              autocomplete="one-time-code"
              maxlength="40"
            />
          </AdminField>
          <div class="flex gap-2">
            <button type="button" class="a-btn" @click="disabling = false">
              {{ t.common.cancel }}
            </button>
            <button
              type="submit"
              class="a-btn a-btn-danger"
              :disabled="busy === 'disable' || !disablePassword || !disableCode"
            >
              {{ t.security.totpDisable }}
            </button>
          </div>
        </form>
      </template>
      <template v-else>
        <TotpEnrollment v-if="enrolling" scope="account" @enrolled="enrolled" />
        <button v-else type="button" class="a-btn a-btn-primary w-fit" @click="enrolling = true">
          {{ t.security.totpSetup }}
        </button>
      </template>
    </section>

    <section class="a-section grid gap-4" aria-labelledby="sec-sessions">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="sec-sessions" class="a-subheading">{{ t.security.sessions }}</h2>
        <button
          v-if="sessions && sessions.length > 1"
          type="button"
          class="a-btn a-btn-sm"
          :disabled="busy === 'revoke-others'"
          @click="revokeOthers"
        >
          {{ t.security.revokeOthers }}
        </button>
      </div>
      <button
        v-if="!sessions"
        type="button"
        class="a-btn w-fit"
        :disabled="busy === 'sessions'"
        @click="loadSessions"
      >
        {{ t.security.showSessions }}
      </button>
      <div v-else class="overflow-x-auto">
        <table class="a-table">
          <thead>
            <tr>
              <th scope="col">{{ t.security.details }}</th>
              <th scope="col">{{ t.security.address }}</th>
              <th scope="col">{{ t.security.lastSeen }}</th>
              <th scope="col">
                <span class="sr-only">{{ t.security.revoke }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sessions" :key="item.id">
              <td>
                {{ item.uaFamily }}
                <span v-if="item.current" class="a-tag ml-2">{{ t.security.current }}</span>
                <span class="block text-xs text-muted"
                  >{{ t.security.started }} {{ format.dateTime(item.createdAt) }}</span
                >
              </td>
              <td>{{ item.ip }}</td>
              <td>{{ format.dateTime(item.lastSeenAt) }}</td>
              <td class="text-right">
                <button
                  v-if="!item.current"
                  type="button"
                  class="a-btn a-btn-sm"
                  :disabled="busy === `revoke-${item.id}`"
                  @click="revoke(item.id)"
                >
                  {{ t.security.revoke }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="a-section grid gap-4" aria-labelledby="sec-bans">
      <h2 id="sec-bans" class="a-subheading">{{ t.security.bans }}</h2>
      <p v-if="bans.length === 0" class="text-sm text-muted">{{ t.security.bansEmpty }}</p>
      <ul v-else class="grid gap-2">
        <li
          v-for="ban in bans"
          :key="ban.ip"
          class="flex flex-wrap items-center gap-3 border-b border-line pb-2 text-sm"
        >
          <span class="font-semibold tabular">{{ ban.ip }}</span>
          <span class="text-muted">{{ ban.reason }}</span>
          <span class="text-muted"
            >{{ t.security.bannedUntil }} {{ format.dateTime(ban.expiresAt) }}</span
          >
          <button
            type="button"
            class="a-btn a-btn-sm ml-auto"
            :disabled="busy === `unban-${ban.ip}`"
            @click="unban(ban.ip)"
          >
            {{ t.security.unban }}
          </button>
        </li>
      </ul>
    </section>

    <section class="a-section grid gap-4" aria-labelledby="sec-log">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <h2 id="sec-log" class="a-subheading">{{ t.security.log }}</h2>
        <AdminField v-slot="field" :label="t.security.filter">
          <select :id="field.id" v-model="eventType" class="a-select min-w-[14rem]">
            <option value="">{{ t.security.allTypes }}</option>
            <option v-for="type in SECURITY_EVENT_LABEL_KEYS" :key="type" :value="type">
              {{ t.security.events[type] ?? type }}
            </option>
          </select>
        </AdminField>
      </div>
      <p v-if="events.length === 0" class="text-sm text-muted">{{ t.security.logEmpty }}</p>
      <div v-else class="overflow-x-auto">
        <table class="a-table">
          <thead>
            <tr>
              <th scope="col">{{ t.security.time }}</th>
              <th scope="col">{{ t.security.event }}</th>
              <th scope="col">{{ t.security.address }}</th>
              <th scope="col">{{ t.security.user }}</th>
              <th scope="col">{{ t.security.details }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in events" :key="item.id">
              <td class="whitespace-nowrap">{{ format.dateTime(item.createdAt) }}</td>
              <td>{{ t.security.events[item.type] ?? item.type }}</td>
              <td class="tabular">{{ item.ip ?? '' }}</td>
              <td>{{ item.username ?? '' }}</td>
              <td class="max-w-[16rem] break-words text-xs text-muted">{{ details(item.meta) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button v-if="nextCursor" type="button" class="a-btn w-fit" @click="loadEvents(true)">
        {{ t.security.loadMore }}
      </button>
    </section>
  </div>
</template>
