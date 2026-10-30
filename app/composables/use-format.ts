export function useFormat() {
  const { locale } = useAdminI18n()
  const dateTime = computed(
    () => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }),
  )
  const number = computed(() => new Intl.NumberFormat(locale.value))
  return {
    dateTime: (value: number | null | undefined) =>
      value ? dateTime.value.format(new Date(value)) : '',
    number: (value: number) => number.value.format(value),
  }
}
