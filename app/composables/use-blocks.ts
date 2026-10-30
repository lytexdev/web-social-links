import type { BlockNode, BlockType } from '#shared/schemas/content'

export interface OrderEntry {
  id: string
  children: string[]
}

export function blockLabel(node: BlockNode, fallback: string): string {
  const data = node.data
  const value = data.title ?? data.label ?? data.text ?? data.code ?? data.caption
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

const pending = new Map<
  string,
  { data: Record<string, unknown>; timer: ReturnType<typeof setTimeout> }
>()
const inflight = new Map<
  string,
  { data: Record<string, unknown>; done: Promise<void>; token: symbol }
>()

export function useBlocks() {
  const tree = useState<BlockNode[]>('blocks', () => [])
  const fieldErrors = useState<Record<string, Record<string, string>>>('block-errors', () => ({}))
  const { request } = useApi()
  const status = usePublishStatus()
  const toasts = useToasts()
  const { t, f } = useAdminI18n()

  async function load(): Promise<void> {
    const fresh = await request<BlockNode[]>('/api/admin/blocks')
    for (const node of fresh.flatMap((item) => [item, ...item.children])) {
      const sending = inflight.get(node.id)
      const queued = pending.get(node.id)
      if (sending || queued) node.data = { ...node.data, ...sending?.data, ...queued?.data }
    }
    tree.value = fresh
  }

  function find(id: string): BlockNode | undefined {
    for (const node of tree.value) {
      if (node.id === id) return node
      const child = node.children.find((item) => item.id === id)
      if (child) return child
    }
    return undefined
  }

  async function create(
    type: BlockType,
    parentId: string | null,
    index?: number,
  ): Promise<BlockNode> {
    await flushAll()
    const node = await status.track(
      request<BlockNode>('/api/admin/blocks', { body: { type, parentId, index } }),
    )
    await load()
    return node
  }

  function patchData(id: string, changes: Record<string, unknown>): void {
    const node = find(id)
    if (!node) return
    node.data = { ...node.data, ...changes }
    const entry = pending.get(id)
    const data = { ...(entry?.data ?? {}), ...changes }
    clearTimeout(entry?.timer)
    const timer = setTimeout(() => flush(id), 600)
    pending.set(id, { data, timer })
    status.markPending(`block:${id}`)
  }

  async function flush(id: string): Promise<void> {
    const entry = pending.get(id)
    if (!entry) return
    pending.delete(id)
    clearTimeout(entry.timer)
    status.clearPending(`block:${id}`)
    const previous = inflight.get(id)
    const data = { ...previous?.data, ...entry.data }
    const token = Symbol(id)
    const done = (async () => {
      await previous?.done
      try {
        await status.track(
          request(`/api/admin/blocks/${id}`, { method: 'PATCH', body: { data: entry.data } }),
        )
        const { [id]: _removed, ...rest } = fieldErrors.value
        fieldErrors.value = rest
      } catch (failure) {
        fieldErrors.value = { ...fieldErrors.value, [id]: toFailure(failure).fields }
      } finally {
        if (inflight.get(id)?.token === token) inflight.delete(id)
      }
    })()
    inflight.set(id, { data, done, token })
    await done
  }

  async function flushAll(): Promise<void> {
    await Promise.all([...pending.keys()].map((id) => flush(id)))
    await Promise.all([...inflight.values()].map((entry) => entry.done))
  }

  async function patchMeta(
    id: string,
    changes: { visible?: boolean; visibleFrom?: number | null; visibleUntil?: number | null },
  ): Promise<void> {
    const node = find(id)
    if (node) Object.assign(node, changes)
    try {
      await status.track(request(`/api/admin/blocks/${id}`, { method: 'PATCH', body: changes }))
      const { [id]: _removed, ...rest } = fieldErrors.value
      fieldErrors.value = rest
    } catch (failure) {
      fieldErrors.value = { ...fieldErrors.value, [id]: toFailure(failure).fields }
    }
  }

  async function remove(node: BlockNode): Promise<void> {
    await flush(node.id)
    await status.track(request(`/api/admin/blocks/${node.id}`, { method: 'DELETE' }))
    await load()
    const label = blockLabel(node, t.value.types[node.type]?.name ?? node.type)
    toasts.push(f(t.value.editor.deleted, { label }), {
      duration: 8000,
      action: {
        label: t.value.common.undo,
        run: async () => {
          try {
            await status.track(request(`/api/admin/blocks/${node.id}/restore`, { body: {} }))
            await load()
          } catch {
            toasts.push(t.value.errors.restore_expired ?? '', { tone: 'error' })
          }
        },
      },
    })
  }

  async function duplicate(id: string): Promise<string> {
    await flush(id)
    const result = await status.track(
      request<{ id: string }>(`/api/admin/blocks/${id}/duplicate`, { body: {} }),
    )
    await load()
    return result.id
  }

  function currentOrder(): OrderEntry[] {
    return tree.value.map((node) => ({
      id: node.id,
      children: node.children.map((child) => child.id),
    }))
  }

  async function saveOrder(order: OrderEntry[] = currentOrder()): Promise<void> {
    await flushAll()
    tree.value = await status.track(
      request<BlockNode[]>('/api/admin/blocks/order', { method: 'PUT', body: { order } }),
    )
  }

  return {
    tree,
    fieldErrors,
    load,
    find,
    create,
    patchData,
    flush,
    flushAll,
    patchMeta,
    remove,
    duplicate,
    currentOrder,
    saveOrder,
  }
}
