import sharp from 'sharp'
import { renderSVG } from 'uqr'
import { SLUG_PATTERN } from '../../../../shared/constants/routing'
import { findSlug } from '../../../services/sources'
import { useEnv } from '../../../utils/env'

export default defineEventHandler(async (event) => {
  const file = getRouterParam(event, 'file') ?? ''
  const match = /^(.+)\.(svg|png)$/.exec(file)
  const slug = match?.[1] ?? ''
  if (!match || !(slug === 'root' || (SLUG_PATTERN.test(slug) && findSlug(slug)))) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  const url = slug === 'root' ? `${useEnv().publicOrigin}/` : `${useEnv().publicOrigin}/${slug}`
  const svg = renderSVG(url, {
    border: 2,
    ecc: 'M',
    pixelSize: 10,
    whiteColor: '#ffffff',
    blackColor: '#000000',
  })
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="qr-${slug}.${match[2]}"`)
  if (match[2] === 'svg') {
    setResponseHeader(event, 'Content-Type', 'image/svg+xml')
    return svg
  }
  setResponseHeader(event, 'Content-Type', 'image/png')
  return sharp(Buffer.from(svg), { density: 300 }).resize({ width: 1024 }).png().toBuffer()
})
