import { localeSchema } from '../../../../shared/schemas/auth'
import { updateUser } from '../../../services/users'
import { parseBody, requireUser } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const { user } = requireUser(event)
  const body = await parseBody(event, localeSchema)
  updateUser(user.id, { locale: body.locale })
  return { locale: body.locale }
})
