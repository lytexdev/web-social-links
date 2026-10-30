import { issueFormToken } from '../../../services/auth'

export default defineEventHandler(() => ({ token: issueFormToken() }))
