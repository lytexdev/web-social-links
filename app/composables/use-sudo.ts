interface Pending {
  resolve: () => void
  reject: (error: Error) => void
}

export function useSudo() {
  const open = useState('sudo-open', () => false)
  const pending = useState<Pending | null>('sudo-pending', () => null)

  function confirm(): Promise<void> {
    return new Promise((resolve, reject) => {
      pending.value = { resolve, reject }
      open.value = true
    })
  }

  function settle(success: boolean): void {
    const current = pending.value
    pending.value = null
    open.value = false
    if (!current) return
    if (success) current.resolve()
    else current.reject(new ApiFailure(403, 'reauth_cancelled', 'Re-authentication cancelled'))
  }

  return { open, confirm, settle }
}
