import { latestSnapshot } from '../services/publish'
import { expectedFileNames, mediaFileName, purgeOrphanedFiles } from '../services/media'
import { purgeExpiredBans } from '../services/bans'
import { purgeSecurityEvents } from '../services/security-events'
import { purgeExpiredSessions } from '../services/sessions'
import { activeRows } from '../services/blocks'
import { logger } from '../utils/logger'

const SECURITY_RETENTION_MS = 30 * 86_400_000

export async function runMaintenance(now = Date.now()): Promise<void> {
  const sessions = purgeExpiredSessions(now)
  const bans = purgeExpiredBans(now)
  const events = purgeSecurityEvents(now - SECURITY_RETENTION_MS)
  activeRows()
  const keep = expectedFileNames()
  const snapshot = latestSnapshot()
  for (const [id, item] of Object.entries(snapshot?.media ?? {})) {
    for (const width of item.widths)
      for (const format of item.formats) keep.add(mediaFileName(id, item.hash, width, format))
    if (item.og) keep.add(mediaFileName(id, item.hash, 'og', 'jpg'))
  }
  await purgeOrphanedFiles(keep)
  logger.info('maintenance', { sessions, bans, events })
}
