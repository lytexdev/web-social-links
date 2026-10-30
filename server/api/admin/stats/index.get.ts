import { buildReport, statsQuerySchema } from '../../../services/stats-report'
import { parseQuery } from '../../../utils/http'

export default defineEventHandler((event) => buildReport(parseQuery(event, statsQuerySchema)))
