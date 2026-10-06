import { ensureSession, getActiveAuthRole, getStoredAccessToken } from '~/composables/useAuth'
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
  buildUserPaymentQuery,
  getUiPendingPayment,
  getUiUnpaidEvent,
  isSinglePendingEventAccount,
  isSingleUnpaidEventAccount,
  shouldRedirectToCreateEvent,
  shouldRedirectToPaymentPending,
  shouldRedirectToUserPayment
} from '~/utils/paymentPendingGuard'

function loginRedirectTarget(to: { fullPath: string }) {
  return to.fullPath && to.fullPath !== '/' ? to.fullPath : undefined
}

async function checkPaymentRestriction(targetPath: string) {
  const needsCreateEventCheck = shouldRedirectToCreateEvent(targetPath)
  const needsPendingCheck = shouldRedirectToPaymentPending(targetPath)
  const needsUnpaidCheck = shouldRedirectToUserPayment(targetPath)
  if (!needsCreateEventCheck && !needsPendingCheck && !needsUnpaidCheck) {
    return null
  }
  const userOk = await ensureSession('user')
  if (!userOk) {
    return null
  }
  try {
    const { fetchUserEvents } = useEvents()
    const events = await fetchUserEvents()
    if (events.length === 0) {
      if (needsCreateEventCheck) {
        return navigateTo('/user/create-event', { replace: true })
      }
    } else if (isSinglePendingEventAccount(events)) {
      if (needsPendingCheck) {
        return navigateTo({
          path: '/user/payment-pending',
          query: buildPendingPaymentQuery(events[0]) as Record<string, string>,
        }, { replace: true })
      }
    } else if (isSingleUnpaidEventAccount(events)) {
      if (needsUnpaidCheck) {
        return navigateTo({
          path: '/user/payment',
          query: buildUserPaymentQuery(events[0]) as Record<string, string>,
        }, { replace: true })
      }
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
    if (shouldRedirectToUserPayment(to.path)) {
      const uiUnpaid = getUiUnpaidEvent()
      if (uiUnpaid) {
        return navigateTo({
          path: '/user/payment',
          query: uiUnpaid as Record<string, string>,
        }, { replace: true })
      }
    }
    return
  }

  const activeRole = getActiveAuthRole()
  const hasUserSession = Boolean(getStoredAccessToken('user'))
  const hasPartnerSession = Boolean(getStoredAccessToken('partner'))
  const hasAnySession = Boolean(activeRole || hasUserSession || hasPartnerSession)

  // Fast path for unauthenticated visitors: never block public routes with session or payment checks
  if (!hasAnySession) {
    if (to.path === '/user/dashboard' || to.path === '/userdashboard' || to.path === '/user-dashboard') {
      return navigateTo('/', { replace: true })
    }
    if (isPublicPath(to.path)) {
      return
    }
    if (isPartnerPath(to.path) || isPartnerEventWorkspace(to.path, to.query as Record<string, unknown>)) {
      notifyNotLoggedIn()
      return navigateTo({
        path: '/partners/login',
        query: { redirect: loginRedirectTarget(to) }
      })
    }
    notifyNotLoggedIn()
    return navigateTo({
      path: '/user/login',
      query: { redirect: loginRedirectTarget(to) }
    })
  }

  // If a single pending payment or unpaid event exists, redirect any attempt to access restricted pages
  // (allowed exceptions: /user/payment-pending for pending, /user/payment for unpaid, plus /user/profile, /user/transactions, /user/report-issue)
  if (activeRole !== 'partner') {
    const paymentRedirect = await checkPaymentRestriction(to.path)
    if (paymentRedirect) return paymentRedirect
  }

  if (to.path === '/user/dashboard' || to.path === '/userdashboard' || to.path === '/user-dashboard') {
    return navigateTo('/', { replace: true })
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

  // If viewing a page configured with landing-navbar while logged in as a user, switch to signed-in-navbar
  if (to.meta.layout === 'landing-navbar') {
    const isUserLoggedIn = Boolean(getStoredAccessToken('user'))
    if (isUserLoggedIn) {
      await ensureSession('user')
      setPageLayout('signed-in-navbar')
    }
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
