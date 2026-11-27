import { z } from 'zod'
import { idField, pageUpdateSchema } from '../../../../shared/schemas/content'
import { pagePreview, updatePage } from '../../../services/pages'
import { parseBody, parseParams, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  const { id } = parseParams(event, z.object({ id: idField }))
  const page = updatePage(id, await parseBody(event, pageUpdateSchema), user.id)
  return { ...page, html: pagePreview(page.markdown) }
})
