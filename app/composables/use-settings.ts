import type { SettingKey, Settings } from '#shared/schemas/settings'

export function useSettings() {
  const settings = useState<Settings | null>('settings', () => null)
  const privacyReview = useState('privacy-review', () => false)
  const errors = useState<Partial<Record<SettingKey, Record<string, string>>>>(
    'settings-errors',
    () => ({}),
  )
  const { request } = useApi()
  const status = usePublishStatus()
  const timers = new Map<SettingKey, ReturnType<typeof setTimeout>>()

  async function load(): Promise<Settings> {
    const result = await request<{ settings: Settings; privacyReview: boolean }>(
      '/api/admin/settings',
    )
    settings.value = result.settings
    privacyReview.value = result.privacyReview
    return result.settings
  }

  async function save<K extends SettingKey>(key: K): Promise<void> {
    clearTimeout(timers.get(key))
    timers.delete(key)
    status.clearPending(`setting:${key}`)
    if (!settings.value) return
    try {
      const result = await status.track(
        request<{ value: Settings[K]; privacyReview: boolean }>(`/api/admin/settings/${key}`, {
          method: 'PUT',
          body: settings.value[key],
        }),
      )
      errors.value = { ...errors.value, [key]: {} }
      if (result.privacyReview) privacyReview.value = true
    } catch (failure) {
      errors.value = { ...errors.value, [key]: toFailure(failure).fields }
    }
  }

  function queue(key: SettingKey, delay = 600): void {
    clearTimeout(timers.get(key))
    status.markPending(`setting:${key}`)
    timers.set(
      key,
      setTimeout(() => save(key), delay),
    )
  }

  async function flushAll(): Promise<void> {
    await Promise.all([...timers.keys()].map((key) => save(key)))
  }

  const { t } = useAdminI18n()

  function error(key: SettingKey, field: string): string | undefined {
    const code = errors.value[key]?.[field]
    if (!code) return undefined
    return t.value.errors[code] ?? t.value.errors.invalid
  }

  return { settings, privacyReview, load, save, queue, flushAll, error }
}
