import { z } from 'zod'
import { idField } from '../../../../shared/schemas/content'
import { renderDocumentMarkdown } from '../../../services/markdown'
import { getPage } from '../../../services/pages'
import { parseParams } from '../../../utils/http'

export default defineEventHandler((event) => {
  const { id } = parseParams(event, z.object({ id: idField }))
  const page = getPage(id)
  return { ...page, html: renderDocumentMarkdown(page.markdown) }
})
