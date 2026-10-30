import type { MeResponse } from '../../../../shared/schemas/auth'
import { REAUTH_WINDOW_MS, csrfTokenFor } from '../../../services/sessions'
import { remainingRecoveryCodes } from '../../../services/users'
import { useEnv } from '../../../utils/env'

export default defineEventHandler((event): MeResponse => {
  const { user, session, sessionToken } = event.context
  if (!user || !session || !sessionToken) return { authenticated: false }
  return {
    authenticated: true,
    csrfToken: csrfTokenFor(sessionToken),
    reauthUntil: session.reauthAt ? session.reauthAt + REAUTH_WINDOW_MS : null,
    uploadMaxMb: Math.round(useEnv().uploadMaxBytes / 1_048_576),
    user: {
      username: user.username,
      locale: user.locale === 'en' ? 'en' : 'de',
      totpEnabled: user.totpEnabled,
      mustChangePassword: user.mustChangePassword,
      setupComplete: user.setupCompletedAt !== null,
      recoveryCodesLeft: user.totpEnabled ? remainingRecoveryCodes(user.id) : 0,
    },
  }
})
