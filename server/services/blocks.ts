import { and, asc, eq, isNotNull, isNull, lt } from 'drizzle-orm'
import {
  GROUP_CHILD_TYPES,
  draftBlockData,
  type BlockNode,
  type BlockType,
} from '../../shared/schemas/content'
import { useDb } from '../db/client'
import { blocks } from '../db/schema'
import { apiError } from '../utils/http'
import { recordAudit } from './audit'
import { randomId } from './crypto'
import { markDraftChanged } from './kv'

export type BlockRow = typeof blocks.$inferSelect

const RESTORE_WINDOW_MS = 60_000

function parseData(type: BlockType, data: unknown): Record<string, unknown> {
  const result = draftBlockData[type].safeParse(data ?? {})
  if (!result.success) {
    const fields: Record<string, string> = {}
    for (const issue of result.error.issues) fields[issue.path.join('.') || '_'] ??= issue.message
    throw apiError(422, 'validation_failed', 'Some fields are invalid', { fields })
  }
  return result.data as Record<string, unknown>
}

export function activeRows(): BlockRow[] {
  const db = useDb()
  db.delete(blocks)
    .where(and(isNotNull(blocks.deletedAt), lt(blocks.deletedAt, Date.now() - RESTORE_WINDOW_MS)))
    .run()
  const rows = db
    .select()
    .from(blocks)
    .where(isNull(blocks.deletedAt))
    .orderBy(asc(blocks.position))
    .all()
  const active = new Set(rows.map((row) => row.id))
  return rows.filter((row) => !row.parentId || active.has(row.parentId))
}

export function buildTree(rows: readonly BlockRow[]): BlockNode[] {
  const nodes = new Map<string, BlockNode>()
  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      parentId: row.parentId,
      type: row.type as BlockType,
      position: row.position,
      data: (row.data ?? {}) as Record<string, unknown>,
      visible: row.visible,
      visibleFrom: row.visibleFrom,
      visibleUntil: row.visibleUntil,
      children: [],
    })
  }
  const roots: BlockNode[] = []
  for (const node of nodes.values()) {
    if (node.parentId) nodes.get(node.parentId)?.children.push(node)
    else roots.push(node)
  }
  const sort = (list: BlockNode[]) => list.sort((a, b) => a.position - b.position)
  for (const node of nodes.values()) sort(node.children)
  return sort(roots)
}

export function listBlocks(): BlockNode[] {
  return buildTree(activeRows())
}

function siblings(parentId: string | null): BlockRow[] {
  return useDb()
    .select()
    .from(blocks)
    .where(
      and(
        parentId ? eq(blocks.parentId, parentId) : isNull(blocks.parentId),
        isNull(blocks.deletedAt),
      ),
    )
    .orderBy(asc(blocks.position))
    .all()
}

function getRow(id: string): BlockRow {
  const row = useDb()
    .select()
    .from(blocks)
    .where(and(eq(blocks.id, id), isNull(blocks.deletedAt)))
    .get()
  if (!row) throw apiError(404, 'not_found', 'Block not found')
  return row
}

function assertParent(parentId: string | null, type: BlockType): void {
  if (!parentId) return
  const parent = getRow(parentId)
  if (parent.type !== 'group' || parent.parentId)
    throw apiError(422, 'invalid_parent', 'Only groups can hold blocks')
  if (!GROUP_CHILD_TYPES.includes(type))
    throw apiError(422, 'invalid_child', 'Groups hold links and tiles only')
}

function renumber(parentId: string | null, ordered: string[]): void {
  const db = useDb()
  ordered.forEach((id, index) => {
    db.update(blocks)
      .set({ position: index, parentId, updatedAt: Date.now() })
      .where(eq(blocks.id, id))
      .run()
  })
}

export function createBlock(
  input: {
    type: BlockType
    parentId: string | null
    index?: number
    data?: Record<string, unknown>
  },
  userId: string,
): BlockNode {
  assertParent(input.parentId, input.type)
  const data = parseData(input.type, input.data)
  const id = randomId()
  const now = Date.now()
  const db = useDb()
  db.transaction(() => {
    const list = siblings(input.parentId).map((row) => row.id)
    const index = Math.min(input.index ?? list.length, list.length)
    db.insert(blocks)
      .values({
        id,
        parentId: input.parentId,
        type: input.type,
        position: index,
        data,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    list.splice(index, 0, id)
    renumber(input.parentId, list)
  })
  markDraftChanged()
  recordAudit(userId, 'create', 'block', id, input.type)
  return listBlocks()
    .flatMap((node) => [node, ...node.children])
    .find((node) => node.id === id) as BlockNode
}

export function updateBlock(
  id: string,
  patch: {
    data?: Record<string, unknown>
    visible?: boolean
    visibleFrom?: number | null
    visibleUntil?: number | null
  },
  userId: string,
): void {
  const row = getRow(id)
  const changes: Partial<BlockRow> = { updatedAt: Date.now() }
  if (patch.data)
    changes.data = parseData(row.type as BlockType, { ...(row.data as object), ...patch.data })
  if (patch.visible !== undefined) changes.visible = patch.visible
  if (patch.visibleFrom !== undefined) changes.visibleFrom = patch.visibleFrom
  if (patch.visibleUntil !== undefined) changes.visibleUntil = patch.visibleUntil
  const from = changes.visibleFrom !== undefined ? changes.visibleFrom : row.visibleFrom
  const until = changes.visibleUntil !== undefined ? changes.visibleUntil : row.visibleUntil
  if (from !== null && until !== null && from >= until) {
    throw apiError(422, 'validation_failed', 'End must be after start', {
      fields: { visibleUntil: 'before_start' },
    })
  }
  useDb().update(blocks).set(changes).where(eq(blocks.id, id)).run()
  markDraftChanged()
  recordAudit(userId, 'update', 'block', id)
}

export function deleteBlock(id: string, userId: string): void {
  const row = getRow(id)
  useDb().update(blocks).set({ deletedAt: Date.now() }).where(eq(blocks.id, row.id)).run()
  markDraftChanged()
  recordAudit(userId, 'delete', 'block', id, row.type)
}

export function restoreBlock(id: string, userId: string): void {
  const updated = useDb()
    .update(blocks)
    .set({ deletedAt: null })
    .where(and(eq(blocks.id, id), isNotNull(blocks.deletedAt)))
    .run()
  if (updated.changes === 0)
    throw apiError(410, 'restore_expired', 'The block can no longer be restored')
  markDraftChanged()
  recordAudit(userId, 'restore', 'block', id)
}

export function duplicateBlock(id: string, userId: string): string {
  const row = getRow(id)
  const db = useDb()
  const now = Date.now()
  const copyId = randomId()
  db.transaction(() => {
    const list = siblings(row.parentId).map((item) => item.id)
    db.insert(blocks)
      .values({ ...row, id: copyId, createdAt: now, updatedAt: now, deletedAt: null })
      .run()
    list.splice(list.indexOf(row.id) + 1, 0, copyId)
    renumber(row.parentId, list)
    if (row.type === 'group') {
      for (const child of siblings(row.id)) {
        db.insert(blocks)
          .values({ ...child, id: randomId(), parentId: copyId, createdAt: now, updatedAt: now })
          .run()
      }
    }
  })
  markDraftChanged()
  recordAudit(userId, 'duplicate', 'block', copyId, row.id)
  return copyId
}

export function reorderBlocks(
  order: Array<{ id: string; children: string[] }>,
  userId: string,
): void {
  const rows = activeRows()
  const byId = new Map(rows.map((row) => [row.id, row]))
  const seen = new Set<string>()
  for (const entry of order) {
    const row = byId.get(entry.id)
    if (!row || seen.has(entry.id))
      throw apiError(422, 'invalid_order', 'Order does not match the blocks')
    seen.add(entry.id)
    if (entry.children.length > 0 && row.type !== 'group') {
      throw apiError(422, 'invalid_child', 'Only groups can hold blocks')
    }
    for (const childId of entry.children) {
      const child = byId.get(childId)
      if (!child || seen.has(childId))
        throw apiError(422, 'invalid_order', 'Order does not match the blocks')
      if (!GROUP_CHILD_TYPES.includes(child.type as BlockType)) {
        throw apiError(422, 'invalid_child', 'Groups hold links and tiles only')
      }
      seen.add(childId)
    }
  }
  if (seen.size !== rows.length)
    throw apiError(422, 'invalid_order', 'Order does not match the blocks')
  useDb().transaction(() => {
    renumber(
      null,
      order.map((entry) => entry.id),
    )
    for (const entry of order) renumber(entry.id, entry.children)
  })
  markDraftChanged()
  recordAudit(userId, 'reorder', 'block', null)
}

export function replaceAllBlocks(
  rows: ReadonlyArray<Omit<BlockRow, 'createdAt' | 'updatedAt' | 'deletedAt'>>,
): void {
  const db = useDb()
  const now = Date.now()
  db.delete(blocks).run()
  const parents = rows.filter((row) => !row.parentId)
  const children = rows.filter((row) => row.parentId)
  for (const row of [...parents, ...children]) {
    db.insert(blocks)
      .values({ ...row, createdAt: now, updatedAt: now, deletedAt: null })
      .run()
  }
}
