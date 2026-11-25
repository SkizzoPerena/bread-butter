import type { RouteLocationRaw } from 'vue-router'

export function isJamPath(path?: string | null): boolean {
  if (!path) return false
  const cleanPath = path.split('?')[0]?.split('#')[0] || ''
  return (
    cleanPath.startsWith('/jam/dashboard') ||
    cleanPath.startsWith('/jam-dashboard') ||
    cleanPath.startsWith('/jam/tables') ||
    cleanPath.startsWith('/jam/guests') ||
    cleanPath.startsWith('/jam/invitation') ||
    cleanPath.startsWith('/jam/invite') ||
    cleanPath.startsWith('/jam/rsvps') ||
    cleanPath.startsWith('/jam/rsvp-manager') ||
    cleanPath.startsWith('/jam/settings') ||
    cleanPath.startsWith('/jam/checkin') ||
    cleanPath.startsWith('/seating/') ||
    cleanPath.startsWith('/user/jam-upgrade') ||
    cleanPath.startsWith('/user/seating-upgrade')
  )
}

export function isTransitionBetweenLandingPages(fromPath?: string | null, toPath?: string | null): boolean {
  if (!fromPath || !toPath) return false
  const cleanFrom = (fromPath.split('?')[0]?.split('#')[0] || '').replace(/\/+$/, '') || '/'
  const cleanTo = (toPath.split('?')[0]?.split('#')[0] || '').replace(/\/+$/, '') || '/'
  const isFromLanding = cleanFrom === '/' || cleanFrom === '/jam' || cleanFrom === '/jam/landing' || cleanFrom === '/jam-landing'
  const isToLanding = cleanTo === '/' || cleanTo === '/jam' || cleanTo === '/jam/landing' || cleanTo === '/jam-landing'
  return isFromLanding && isToLanding
}

export function isRouteExcludedFromTransition(path?: string | null): boolean {
  if (!path) return true
  const clean = (path.split('?')[0]?.split('#')[0] || '').replace(/\/+$/, '') || '/'

  // 1. Landing pages (the slide transition between / and /jam is handled by JamSlideOverlay)
  if (clean === '/' || clean === '/jam' || clean === '/jam/landing' || clean === '/jam-landing') {
    return true
  }

  // 2. Landing-page linked info/marketing pages
  const landingLinked = [
    '/about',
    '/jam/about',
    '/contact-us',
    '/contact',
    '/faqs',
    '/terms',
    '/useful-tips',
    '/our-suppliers',
    '/our-bakery',
    '/bakery',
    '/suppliers',
    '/news-and-events',
  ]
  if (landingLinked.some(p => clean === p || clean.startsWith(`${p}/`))) {
    return true
  }

  // 3. Public guest views accessed outside the dashboard flow
  const guestPrefixes = [
    '/sites',
    '/seat',
    '/attend',
    '/jam/rsvp',
    '/jam/open',
  ]
  if (guestPrefixes.some(p => clean === p || clean.startsWith(`${p}/`))) {
    return true
  }

  // Check /jam/:token (single token guest invite)
  // Dashboard routes are /jam/dashboard, /jam/tables, /jam/guests, /jam/invitation, /jam/invite, /jam/rsvps, /jam/rsvp-manager, /jam/settings, /jam/checkin
  if (/^\/jam\/[^/]+$/.test(clean)) {
    const knownJamDashboards = [
      '/jam/dashboard',
      '/jam/tables',
      '/jam/guests',
      '/jam/invitation',
      '/jam/invite',
      '/jam/rsvps',
      '/jam/rsvp-manager',
      '/jam/settings',
      '/jam/checkin',
    ]
    if (!knownJamDashboards.includes(clean)) {
      return true
    }
  }

  // 4. Sign-up & auth process
  const authRoutes = [
    '/user/login',
    '/user/signup',
    '/baker-login',
    '/baker-signup',
    '/bakers/login',
    '/bakers/signup',
    '/partners/login',
    '/partners/signup',
    '/dough-makers',
    '/doughmakers',
    '/user/forgot-password',
    '/user/otp',
    '/partners/forgot-password',
    '/partners/otp',
  ]
  if (authRoutes.some(p => clean === p || clean.startsWith(`${p}/`))) {
    return true
  }

  // 5. Event registration & payments
  const registrationAndPayment = [
    '/user/create-event',
    '/user/create-seating',
    '/user/payment',
    '/user/payment-pending',
    '/user/payment/success',
    '/user/seating-payment',
    '/seating-unavailable',
  ]
  if (registrationAndPayment.some(p => clean === p || clean.startsWith(`${p}/`))) {
    return true
  }

  return false
}

export function usePageTransition() {
  const isTransitionActive = useState<boolean>('app_page_transition_active', () => false)
  const isTransitionVisible = useState<boolean>('app_page_transition_visible', () => false)
  const isJamTransition = useState<boolean>('app_page_transition_is_jam', () => false)
  const transitionStartTime = useState<number>('app_page_transition_start_time', () => 0)

  async function startPageTransition(to?: RouteLocationRaw, options?: { minDuration?: number; maxDuration?: number }) {
    const targetStr = typeof to === 'string'
      ? to
      : (to && typeof to === 'object' && 'path' in to ? String((to as any).path) : '')

    // If destination is excluded from transitions, navigate directly without showing overlay
    if (targetStr && isRouteExcludedFromTransition(targetStr)) {
      if (to) {
        await navigateTo(to)
      }
      return
    }

    transitionStartTime.value = Date.now()
    isJamTransition.value = isJamPath(targetStr)
    isTransitionActive.value = true
    isTransitionVisible.value = true

    // Safety timeout: automatically fade out if a destination page never calls finishPageTransition (e.g. 10s)
    const maxDuration = options?.maxDuration ?? 10000
    if (import.meta.client) {
      setTimeout(() => {
        finishPageTransition()
      }, maxDuration)
    }

    // Allow browser to render the pure white overlay screen before navigating
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 80))

    if (to) {
      await navigateTo(to)
    }
  }

  /**
   * For a link's click handler. A plain click shows the transition before navigating; a click
   * that opens a new tab or window is left to the browser.
   */
  function followLink(event: MouseEvent, to: RouteLocationRaw) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    event.preventDefault()
    startPageTransition(to)
  }

  function finishPageTransition(options?: { minDuration?: number }) {
    if (!isTransitionActive.value) return

    // Ensure a smooth, premium feel with a minimum duration (default 500ms)
    // so the loading screen doesn't abruptly vanish in a 5ms flash if data was cached
    const minDuration = options?.minDuration ?? 500
    const elapsed = Date.now() - transitionStartTime.value
    const remaining = Math.max(0, minDuration - elapsed)

    setTimeout(() => {
      isTransitionVisible.value = false
      setTimeout(() => {
        isTransitionActive.value = false
      }, 350)
    }, remaining)
  }

  return {
    isTransitionActive,
    isTransitionVisible,
    isJamTransition,
    transitionStartTime,
    startPageTransition,
    followLink,
    finishPageTransition,
  }
}
