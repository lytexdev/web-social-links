import { buildCsv, statsQuerySchema } from '../../../services/stats-report'
import { parseQuery } from '../../../utils/http'

export default defineEventHandler((event) => {
  const query = parseQuery(event, statsQuerySchema)
  setResponseHeaders(event, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="statistics-${query.range}.csv"`,
  })
  return buildCsv(query)
})
