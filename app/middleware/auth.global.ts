import { ensureSession, getActiveAuthRole, getStoredAccessToken } from '~/composables/useAuth'
import {
  isPartnerEventWorkspace,
  isPartnerPath,
  isPublicPath,
  isUserExclusivePath,
  normalizeAuthPath,
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
  isUserHomePath,
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
      if (needsCreateEventCheck && !(await hasSeatingPlans())) {
        return navigateTo('/user/create-event', { replace: true })
      }
    } else if (
      (isSinglePendingEventAccount(events) || isSingleUnpaidEventAccount(events))
      && isUserHomePath(targetPath)
      && (await hasSeatingPlans())
    ) {
      return null
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

  const normalizedPath = normalizeAuthPath(to.path)

  const { isUiOnlyMode } = useApiMode()
  if (isUiOnlyMode.value) {
    if (to.path === '/' && to.query.view === 'landing') {
      return
    }
    if (isPublicPath(normalizedPath)) {
      if (to.meta.layout === 'landing-navbar' && Boolean(getStoredAccessToken('user'))) {
        setPageLayout('signed-in-navbar')
      }
      return
    }
    if (shouldRedirectToPaymentPending(normalizedPath)) {
      const uiPending = getUiPendingPayment()
      if (uiPending) {
        return navigateTo({
          path: '/user/payment-pending',
          query: uiPending as Record<string, string>,
        }, { replace: true })
      }
    }
    if (shouldRedirectToUserPayment(normalizedPath)) {
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

  // Fast path for unauthenticated visitors
  if (!hasAnySession) {
    if (normalizedPath === '/user/dashboard' || normalizedPath === '/userdashboard' || normalizedPath === '/user-dashboard') {
      return navigateTo('/', { replace: true })
    }
    if (isPublicPath(normalizedPath)) {
      return
    }
    if (isPartnerPath(normalizedPath) || isPartnerEventWorkspace(normalizedPath, to.query as Record<string, unknown>)) {
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

  // Dashboard aliases redirect to /
  if (normalizedPath === '/user/dashboard' || normalizedPath === '/userdashboard' || normalizedPath === '/user-dashboard') {
    return navigateTo('/', { replace: true })
  }

  // Handle all public routes for users who have a session:
  if (isPublicPath(normalizedPath)) {
    // 1. Landing / home special handling
    if (normalizedPath === '/') {
      if (to.query.view === 'landing') {
        return
      }
      if (activeRole === 'partner') {
        const partnerOk = await ensureSession('partner')
        if (partnerOk) {
          return navigateTo('/partners', { replace: true })
        }
      }
      await ensureSession('user')
      return
    }

    // 2. Auth routes: user login / signup redirect if already authenticated
    if (normalizedPath === '/user/login' || normalizedPath === '/user/signup') {
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

    // 3. Auth routes: partner / dough makers / bakers login & signup redirect if already authenticated
    if (
      normalizedPath === '/partners/login' ||
      normalizedPath === '/partners/signup' ||
      normalizedPath === '/dough-makers/login' ||
      normalizedPath === '/dough-makers/signup' ||
      normalizedPath === '/doughmakers/login' ||
      normalizedPath === '/doughmakers/signup' ||
      normalizedPath === '/bakers/login' ||
      normalizedPath === '/bakers/signup' ||
      normalizedPath === '/baker/login' ||
      normalizedPath === '/baker/signup'
    ) {
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

    // 4. For all other public routes (including /our-suppliers, /about, /faqs, /terms, etc.):
    // Switch to signed-in-navbar layout if user has an active user session
    if (to.meta.layout === 'landing-navbar' && hasUserSession) {
      setPageLayout('signed-in-navbar')
    }
    // Guaranteed exit: NEVER run payment restriction or login redirects on public pages
    return
  }

  // If a single pending payment or unpaid event exists, redirect any attempt to access restricted pages
  // (allowed exceptions: /user/payment-pending for pending, /user/payment for unpaid, plus /user/profile, /user/transactions, /user/report-issue)
  if (activeRole !== 'partner') {
    const paymentRedirect = await checkPaymentRestriction(to.path)
    if (paymentRedirect) return paymentRedirect
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
