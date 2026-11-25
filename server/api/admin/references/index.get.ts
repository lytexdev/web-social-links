import { referenceDocsList, referenceStatus } from '../../../services/references'

export default defineEventHandler(() => ({
  status: referenceStatus(),
  documents: referenceDocsList().map((doc) => ({
    slug: doc.slug,
    path: doc.path,
    kind: doc.kind,
    title: doc.title,
    published: doc.published,
    claims: doc.claims.length,
    sources: doc.sourceGroups.reduce((sum, group) => sum + group.items.length, 0),
    warnings: doc.warnings,
  })),
}))
