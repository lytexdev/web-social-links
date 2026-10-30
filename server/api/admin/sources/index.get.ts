import { listSlugs, listSources } from '../../../services/sources'

export default defineEventHandler(() => ({ sources: listSources(), slugs: listSlugs() }))
