import { kvGet } from '../../../services/kv'
import { getAllSettings } from '../../../services/settings'

export default defineEventHandler(() => ({
  settings: getAllSettings(),
  privacyReview: kvGet('privacy_review') === '1',
}))
