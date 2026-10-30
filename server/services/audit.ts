import { desc } from 'drizzle-orm'
import { useDb } from '../db/client'
import { auditLog } from '../db/schema'

export function recordAudit(
  userId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  summary = '',
): void {
  useDb()
    .insert(auditLog)
    .values({
      userId,
      action,
      entity,
      entityId,
      summary: summary.slice(0, 300),
      createdAt: Date.now(),
    })
    .run()
}

export function listAudit(limit = 100) {
  return useDb().select().from(auditLog).orderBy(desc(auditLog.id)).limit(limit).all()
}
