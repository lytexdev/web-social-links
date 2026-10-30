import { recordFromEvent, startAnalytics } from '../services/analytics'
import { logger } from '../utils/logger'

export default defineNitroPlugin((nitroApp) => {
  startAnalytics()
  nitroApp.hooks.hook('afterResponse', (event) => {
    try {
      if (event.context.redirectClick && event.node.res.statusCode === 302) {
        recordFromEvent(event, 'click')
      } else if (event.context.publicModel?.kind === 'page' && !event.context.publicModel.preview) {
        recordFromEvent(event, 'view')
      }
    } catch (error) {
      logger.error('analytics_record_failed', { error })
    }
  })
})
