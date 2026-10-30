import { kvSet } from '../../../services/kv'

export default defineEventHandler(() => {
  kvSet('privacy_review', '0')
  return { ok: true }
})
