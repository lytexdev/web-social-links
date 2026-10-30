import { count } from 'drizzle-orm'
import { useDb } from '../db/client'
import { media } from '../db/schema'
import { logger } from '../utils/logger'
import { storeUpload } from './media'
import { seedLegalPages } from './pages'
import { getSetting, writeSetting } from './settings'
import { seedSources } from './sources'

export function seedContent(): void {
  seedLegalPages()
  seedSources()
}

export async function seedDefaultAvatar(): Promise<void> {
  const existing = useDb().select({ value: count() }).from(media).get()?.value ?? 0
  const profile = getSetting('profile')
  if (existing > 0 || profile.avatar) return
  const logo = await useStorage('assets:server').getItemRaw<Buffer>('defaults:logo.png')
  if (!logo) return
  try {
    const { row } = await storeUpload(Buffer.from(logo), 'image/png', {
      allowAnimation: false,
      userId: null,
    })
    writeSetting('profile', { ...profile, avatar: row.id })
    logger.info('default_avatar_seeded', { media: row.id })
  } catch (error) {
    logger.warn('default_avatar_failed', { error })
  }
}
