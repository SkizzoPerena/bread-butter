import { ensureSession } from '~/composables/useAuth'
import {
  isPartnerPath,
  isPublicPath,
  notifyNotLoggedIn
} from '~/utils/authGuard'

function loginRedirectTarget(to: { fullPath: string }) {
  return to.fullPath && to.fullPath !== '/' ? to.fullPath : undefined
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const { isUiOnlyMode } = useApiMode()
  if (isUiOnlyMode.value) return

  if (to.path === '/user/dashboard') {
    return navigateTo('/', { replace: true })
  }

  if (to.path === '/') {
    await ensureSession('user')
    return
  }

  if (to.path === '/user/login') {
    const authenticated = await ensureSession('user')
    if (authenticated) {
      const redirect = typeof to.query.redirect === 'string' ? to.query.redirect.trim() : ''
      return navigateTo(redirect || '/')
    }
    return
  }

  if (to.path === '/partners/login') {
    const authenticated = await ensureSession('partner')
    if (authenticated) {
      const redirect = typeof to.query.redirect === 'string' ? to.query.redirect.trim() : ''
      return navigateTo(redirect || '/partners')
    }
    return
  }

  if (isPublicPath(to.path)) {
    return
  }

  if (isPartnerPath(to.path)) {
    const authenticated = await ensureSession('partner')
    if (!authenticated) {
      notifyNotLoggedIn()
      return navigateTo({
        path: '/partners/login',
        query: { redirect: loginRedirectTarget(to) }
      })
    }
    return
  }

  const authenticated = await ensureSession('user')
  if (!authenticated) {
    notifyNotLoggedIn()
    return navigateTo({
      path: '/user/login',
      query: { redirect: loginRedirectTarget(to) }
    })
  }
})
