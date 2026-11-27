import { z } from 'zod'
import { idField } from '../../../../shared/schemas/content'
import { getPage, pagePreview } from '../../../services/pages'
import { parseParams } from '../../../utils/http'

export default defineEventHandler((event) => {
  const { id } = parseParams(event, z.object({ id: idField }))
  const page = getPage(id)
  return { ...page, html: pagePreview(page.markdown) }
})
