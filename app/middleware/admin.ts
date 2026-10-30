export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const session = useAdminSession()
  const me =
    session.me.value ?? (await session.load().catch(() => ({ authenticated: false as const })))
  const onLogin = to.path === '/admin/login'
  const onSetup = to.path === '/admin/setup'
  if (!me.authenticated) return onLogin ? undefined : navigateTo('/admin/login')
  if (!me.user.setupComplete) return onSetup ? undefined : navigateTo('/admin/setup')
  if (onLogin || onSetup) return navigateTo('/admin')
})
