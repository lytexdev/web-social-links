import type { MeResponse } from '#shared/schemas/auth'

export function useAdminSession() {
  const me = useState<MeResponse | null>('admin-me', () => null)

  async function load(): Promise<MeResponse> {
    const result = await $fetch<MeResponse>('/api/admin/auth/me', { cache: 'no-store' })
    me.value = result
    return result
  }

  const csrf = computed(() => (me.value?.authenticated ? me.value.csrfToken : ''))
  const user = computed(() => (me.value?.authenticated ? me.value.user : null))

  return { me, load, csrf, user }
}
