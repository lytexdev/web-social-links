export interface Toast {
  id: number
  message: string
  tone: 'info' | 'error'
  action?: { label: string; run: () => void | Promise<void> }
  duration: number
}

let counter = 0

export function useToasts() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function push(message: string, options: Partial<Omit<Toast, 'id' | 'message'>> = {}): number {
    const id = ++counter
    const toast: Toast = {
      id,
      message,
      tone: options.tone ?? 'info',
      action: options.action,
      duration: options.duration ?? 5000,
    }
    toasts.value = [...toasts.value, toast]
    return id
  }

  return { toasts, push, dismiss }
}

export function useFailureMessage() {
  const { t, f } = useAdminI18n()
  return (failure: ApiFailure): string => {
    if (failure.code === 'network' || failure.status === 0) return t.value.common.networkError
    if (failure.status === 429)
      return f(t.value.common.rateLimited, { seconds: failure.retryAfter || 60 })
    if (failure.code === 'validation_failed') return t.value.common.validation
    return t.value.common.unknownError
  }
}

export function fieldMessage(
  code: string | undefined,
  fields: Record<string, string>,
): string | undefined {
  if (!code) return undefined
  return fields[code] ?? code
}
