import { ensureSession, getActiveAuthRole } from '~/composables/useAuth'
import {
  isPartnerEventWorkspace,
  isPartnerPath,
  isPublicPath,
  isUserExclusivePath,
  notifyNotLoggedIn,
  notifyWrongRoleAccess
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

  const activeRole = getActiveAuthRole()

  // Home: partners land on partner dashboard; users keep the user home.
  if (to.path === '/') {
    if (activeRole === 'partner') {
      const partnerOk = await ensureSession('partner')
      if (partnerOk) {
        return navigateTo('/partners', { replace: true })
      }
    }
    await ensureSession('user')
    return
  }

  if (to.path === '/user/login') {
    if (activeRole === 'partner' && (await ensureSession('partner'))) {
      return navigateTo('/partners', { replace: true })
    }
    const authenticated = await ensureSession('user')
    if (authenticated) {
      const redirect = typeof to.query.redirect === 'string' ? to.query.redirect.trim() : ''
      return navigateTo(redirect || '/')
    }
    return
  }

  if (to.path === '/partners/login') {
    if (activeRole === 'user' && (await ensureSession('user'))) {
      return navigateTo('/', { replace: true })
    }
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
    if (activeRole === 'user' && (await ensureSession('user'))) {
      notifyWrongRoleAccess('partner')
      return navigateTo('/', { replace: true })
    }

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

  if (isPartnerEventWorkspace(to.path, to.query as Record<string, unknown>)) {
    if (activeRole === 'user' && (await ensureSession('user'))) {
      notifyWrongRoleAccess('partner')
      return navigateTo('/', { replace: true })
    }

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

  if (isUserExclusivePath(to.path, to.query as Record<string, unknown>)) {
    if (activeRole === 'partner' && (await ensureSession('partner'))) {
      notifyWrongRoleAccess('user')
      return navigateTo('/partners', { replace: true })
    }
  }

  // Remaining protected routes require a user session.
  if (activeRole === 'partner' && (await ensureSession('partner'))) {
    notifyWrongRoleAccess('user')
    return navigateTo('/partners', { replace: true })
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
