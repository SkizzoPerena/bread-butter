import { ensureSession, getActiveAuthRole } from '~/composables/useAuth'
import {
  isPartnerEventWorkspace,
  isPartnerPath,
  isPublicPath,
  isUserExclusivePath,
  notifyNotLoggedIn,
  notifyWrongRoleAccess
} from '~/utils/authGuard'
import {
  buildPendingPaymentQuery,
  getUiPendingPayment,
  isSinglePendingEventAccount,
  shouldRedirectToPaymentPending
} from '~/utils/paymentPendingGuard'

function loginRedirectTarget(to: { fullPath: string }) {
  return to.fullPath && to.fullPath !== '/' ? to.fullPath : undefined
}

async function checkPendingPaymentRestriction(targetPath: string) {
  if (!shouldRedirectToPaymentPending(targetPath)) {
    return null
  }
  const userOk = await ensureSession('user')
  if (!userOk) {
    return null
  }
  try {
    const { fetchUserEvents } = useEvents()
    const events = await fetchUserEvents()
    if (isSinglePendingEventAccount(events)) {
      return navigateTo({
        path: '/user/payment-pending',
        query: buildPendingPaymentQuery(events[0]) as Record<string, string>,
      }, { replace: true })
    }
  } catch {
    // If fetching events fails, do not prematurely block navigation
  }
  return null
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const { isUiOnlyMode } = useApiMode()
  if (isUiOnlyMode.value) {
    if (shouldRedirectToPaymentPending(to.path)) {
      const uiPending = getUiPendingPayment()
      if (uiPending) {
        return navigateTo({
          path: '/user/payment-pending',
          query: uiPending as Record<string, string>,
        }, { replace: true })
      }
    }
    return
  }

  if (to.path === '/user/dashboard') {
    return navigateTo('/', { replace: true })
  }

  const activeRole = getActiveAuthRole()

  // If a single pending payment event exists, redirect any attempt to access user or event-related pages
  // (allowed exceptions: /user/payment-pending, /user/profile, /user/transactions, /user/report-issue)
  if (activeRole !== 'partner' && shouldRedirectToPaymentPending(to.path)) {
    const pendingRedirect = await checkPendingPaymentRestriction(to.path)
    if (pendingRedirect) return pendingRedirect
  }

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

  if (to.path === '/partners/login' || to.path === '/bakers/login' || to.path === '/baker/login') {
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
