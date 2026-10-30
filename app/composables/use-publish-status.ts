export interface PublishIssue {
  scope: string
  id: string
  field: string
  code: string
  detail?: string
}

interface PublishState {
  draftChanges: number
  revision: number
  publishedAt: number | null
  issues: PublishIssue[]
}

export function usePublishStatus() {
  const state = useState<PublishState | null>('publish-state', () => null)
  const saving = useState('publish-saving', () => 0)
  const failed = useState('publish-failed', () => false)
  const previewStamp = useState('preview-stamp', () => 0)
  const pending = useState<string[]>('publish-pending', () => [])

  function markPending(key: string): void {
    if (!pending.value.includes(key)) pending.value = [...pending.value, key]
  }

  function clearPending(key: string): void {
    pending.value = pending.value.filter((item) => item !== key)
  }
  const { request } = useApi()

  async function refresh(): Promise<void> {
    state.value = await request<PublishState>('/api/admin/publish/status')
  }

  let refreshTimer: ReturnType<typeof setTimeout> | undefined
  function scheduleRefresh(): void {
    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      refresh().catch(() => undefined)
      previewStamp.value = Date.now()
    }, 400)
  }

  async function track<T>(task: Promise<T>): Promise<T> {
    saving.value++
    try {
      const result = await task
      failed.value = false
      return result
    } catch (error) {
      failed.value = true
      throw error
    } finally {
      saving.value--
      scheduleRefresh()
    }
  }

  return {
    state,
    saving,
    failed,
    previewStamp,
    pending,
    markPending,
    clearPending,
    refresh,
    track,
    scheduleRefresh,
  }
}
