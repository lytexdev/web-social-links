import type { Messages } from '~/i18n/de'

export function interpolate(
  template: string,
  values: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
}

export function useAdminI18n() {
  const session = useAdminSession()
  const locale = computed(() =>
    session.me.value?.authenticated ? session.me.value.user.locale : 'de',
  )
  const t = computed<Messages>(() => useMessages(locale.value))
  return { t, locale, f: interpolate }
}
