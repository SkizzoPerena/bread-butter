import type { EventRecord } from '~/types/event'
import { isEventFullyPaid } from '~/types/payment'
import { isPartnerAuthPublicPath, isPartnerPath, isPublicPath, isUserAuthPublicPath } from '~/utils/authGuard'
import { getPackageSlugFromTier, resolveEventTierCode } from '~/utils/eventTierFeatures'

export interface PendingPaymentQueryParams {
  ref?: string
  eventName?: string
  package?: string
  method?: string
}

export interface PendingSeatingQueryParams {
  gatheringId?: string
  ref?: string
  name?: string
  package?: string
  method?: string
}

const UI_PENDING_KEY = 'bpb-ui-pending-payment'
const UI_UNPAID_KEY = 'bpb-ui-unpaid-event'
const UI_JAM_PENDING_KEY = 'bpb-ui-pending-seating-payment'
const UI_JAM_UNPAID_KEY = 'bpb-ui-unpaid-seating'

export function isSeatingFlowPath(path: string): boolean {
  return (
    path === '/user/create-seating' ||
    path === '/seating-unavailable' ||
    path.startsWith('/user/seating-payment') ||
    path.startsWith('/seating/') ||
    path.startsWith('/seat/') ||
    path.startsWith('/attend/') ||
    path.startsWith('/jam/')
  )
}

/** Seating plans are only listed on home, so a host with plans must be able to reach it. */
export function isUserHomePath(path: string): boolean {
  return path === '/' || path === '/user/dashboard'
}

/**
 * Checks if an event has a proof of payment submitted but is not yet fully paid (approved).
 */
export function isEventPendingVerification(event?: EventRecord | null): boolean {
  if (!event) return false
  if (isEventFullyPaid(event)) return false

  const paymentStatus = event.latestPayment?.status || event.pendingPayment?.status
  if (paymentStatus === 'PENDING') return true
  if (Boolean(event.latestPayment?.transactionId) || Boolean(event.latestPayment?.proofOfPaymentURL)) {
    return true
  }

  return false
}

/**
 * Returns true if the user's account contains exactly one event,
 * and that event is pending payment verification (has proof of purchase but not fully paid).
 */
export function isSinglePendingEventAccount(events: EventRecord[]): events is [EventRecord] {
  return events.length === 1 && Boolean(events[0]) && isEventPendingVerification(events[0])
}

/**
 * Returns true if the user's account contains exactly one event,
 * and that event is not fully paid and not pending verification.
 */
export function isSingleUnpaidEventAccount(events: EventRecord[]): events is [EventRecord] {
  return events.length === 1 && Boolean(events[0]) && !isEventFullyPaid(events[0]) && !isEventPendingVerification(events[0])
}

/**
 * Determines whether the given route path is a user or event-related page that
 * should be blocked and redirected to /user/payment-pending when the single event
 * is pending verification.
 *
 * Allowed exceptions (do NOT redirect):
 * - /user/payment-pending
 * - /user/profile
 * - /user/transactions
 * - /user/report-issue
 * - Public auth routes (/user/login, /user/signup, /user/otp, /user/forgot-password)
 * - Partner routes (/partners/*)
 * - Public marketing/content routes (/about, /faqs, /terms, /contact-us, /our-suppliers, /news-and-events, /useful-tips, /sites/*, /rsvp/*)
 *
 * Blocked pages (REDIRECT):
 * - / (User Events Dashboard when authenticated)
 * - /user/dashboard
 * - /user/create-event
 * - /user/event-dashboard
 * - /user/payment
 * - Any other /user/* page
 * - Any /event/* page
 * - /event-dashboard
 * - /invitation-maker
 * - /website-maker
 */
export function shouldRedirectToPaymentPending(path: string): boolean {
  if (path !== '/' && path !== '/user/dashboard' && isPublicPath(path)) {
    return false
  }

  // Always allowed user pages
  if (
    path === '/user/payment-pending' ||
    path === '/user/profile' ||
    path === '/user/transactions' ||
    path === '/user/report-issue'
  ) {
    return false
  }

  // Public authentication routes
  if (isUserAuthPublicPath(path) || isPartnerAuthPublicPath(path)) {
    return false
  }

  // Partner portal routes
  if (isPartnerPath(path)) {
    return false
  }

  // Public guest-facing or site routes
  if (path.startsWith('/sites/') || path.startsWith('/rsvp/') || isSeatingFlowPath(path)) {
    return false
  }

  // User home dashboard
  if (path === '/' || path === '/user/dashboard') {
    return true
  }

  // User-scoped surfaces
  if (path.startsWith('/user/')) {
    return true
  }

  // Event-scoped dashboards and creator tools
  if (
    path.startsWith('/event/') ||
    path === '/event-dashboard' ||
    path === '/invitation-maker' ||
    path === '/website-maker'
  ) {
    return true
  }

  return false
}

/**
 * Determines whether a user with 0 events should be redirected to /user/create-event.
 */
export function shouldRedirectToCreateEvent(path: string): boolean {
  if (path !== '/' && path !== '/user/dashboard' && isPublicPath(path)) {
    return false
  }

  if (
    path === '/user/create-event' ||
    path === '/user/payment' ||
    path === '/user/payment-pending' ||
    path === '/user/profile' ||
    path === '/user/transactions' ||
    path === '/user/report-issue'
  ) {
    return false
  }

  if (isUserAuthPublicPath(path) || isPartnerAuthPublicPath(path) || isPartnerPath(path)) {
    return false
  }

  if (path.startsWith('/sites/') || path.startsWith('/rsvp/') || isSeatingFlowPath(path)) {
    return false
  }

  if (path === '/' || path === '/user/dashboard') {
    return true
  }

  if (
    path.startsWith('/event/') ||
    path === '/event-dashboard' ||
    path === '/invitation-maker' ||
    path === '/website-maker'
  ) {
    return true
  }

  return false
}

/**
 * Determines whether a user with a single unpaid event should be redirected to /user/payment.
 */
export function shouldRedirectToUserPayment(path: string): boolean {
  if (path !== '/' && path !== '/user/dashboard' && isPublicPath(path)) {
    return false
  }

  if (
    path === '/user/payment' ||
    path === '/user/payment-pending' ||
    path === '/user/profile' ||
    path === '/user/transactions' ||
    path === '/user/report-issue'
  ) {
    return false
  }

  if (isUserAuthPublicPath(path) || isPartnerAuthPublicPath(path) || isPartnerPath(path)) {
    return false
  }

  if (path.startsWith('/sites/') || path.startsWith('/rsvp/') || isSeatingFlowPath(path)) {
    return false
  }

  if (path === '/' || path === '/user/dashboard') {
    return true
  }

  if (path.startsWith('/user/')) {
    return true
  }

  if (
    path.startsWith('/event/') ||
    path === '/event-dashboard' ||
    path === '/invitation-maker' ||
    path === '/website-maker'
  ) {
    return true
  }

  return false
}

/**
 * Extracts standard query parameters for /user/payment-pending from an EventRecord.
 */
export function buildPendingPaymentQuery(event: EventRecord): PendingPaymentQueryParams {
  return {
    ref: event.latestPayment?.transactionId || event.latestPayment?._id || '',
    eventName: event.eventName || '',
    package: getPackageSlugFromTier(resolveEventTierCode(event)),
    method: event.latestPayment?.paymentMethod || '',
  }
}

/**
 * Extracts standard query parameters for /user/payment from an EventRecord.
 */
export function buildUserPaymentQuery(event: EventRecord): Record<string, string> {
  const query: Record<string, string> = {
    eventId: event._id || '',
    eventName: event.eventName || '',
    eventType: event.eventType || 'WEDDING',
    eventDate: event.eventDate || '',
    venue: event.venue || '',
    package: getPackageSlugFromTier(resolveEventTierCode(event)),
  }
  if (event.isCatholicWedding) {
    query.isCatholicWedding = 'true'
  }
  return query
}

/**
 * Checks if a gathering has a proof of payment submitted but is not yet approved.
 */
export function isGatheringPendingVerification(gathering?: any): boolean {
  if (!gathering) return false
  if (gathering.status === 'ACTIVE' || gathering.payment?.status === 'APPROVED') return false
  return gathering.status === 'PENDING_PAYMENT' && gathering.payment?.status === 'PENDING'
}

/**
 * Checks if a gathering is unpaid (has no payment or payment was denied).
 */
export function isGatheringUnpaid(gathering?: any): boolean {
  if (!gathering) return false
  if (gathering.status === 'ACTIVE' || gathering.payment?.status === 'APPROVED') return false
  return gathering.status === 'PENDING_PAYMENT' && (!gathering.payment || gathering.payment.status === 'DENIED')
}

/**
 * Checks if a gathering is fully active.
 */
export function isGatheringActive(gathering?: any): boolean {
  if (!gathering) return false
  return gathering.status === 'ACTIVE' || gathering.payment?.status === 'APPROVED'
}

export function buildPendingSeatingQuery(gathering: any): PendingSeatingQueryParams {
  return {
    gatheringId: gathering._id || '',
    ref: gathering.payment?.transactionId || gathering.payment?._id || '',
    name: gathering.name || '',
    package: gathering.packageName || '',
    method: gathering.payment?.paymentMethod || '',
  }
}

/**
 * Resolves post-login redirection route based on user's events and optional redirect parameter.
 */
export function resolveUserPostLoginRedirect(
  events: EventRecord[],
  redirect?: string,
  gatherings: unknown[] = [],
): string | { path: string; query: Record<string, string> } {
  if (events.length === 0) {
    if (gatherings.length > 0) {
      const latestGathering = gatherings[0] as any
      if (isGatheringPendingVerification(latestGathering)) {
        return {
          path: '/user/seating-payment/pending',
          query: buildPendingSeatingQuery(latestGathering) as Record<string, string>,
        }
      }
      if (isGatheringUnpaid(latestGathering)) {
        return {
          path: '/user/seating-payment',
          query: { gatheringId: latestGathering._id },
        }
      }
      if (redirect && redirect !== '/' && redirect !== '/user/create-event') return redirect
      if (isGatheringActive(latestGathering)) {
        return `/jam/dashboard/${latestGathering._id}`
      }
      return '/'
    }
    return redirect && redirect !== '/' ? redirect : '/user/create-event'
  }

  if (isSinglePendingEventAccount(events)) {
    return {
      path: '/user/payment-pending',
      query: buildPendingPaymentQuery(events[0]) as Record<string, string>,
    }
  }

  if (isSingleUnpaidEventAccount(events)) {
    return {
      path: '/user/payment',
      query: buildUserPaymentQuery(events[0]),
    }
  }

  if (redirect && redirect !== '/') {
    return redirect
  }

  return '/'
}

/**
 * UI-only mode storage helpers so mock testing behaves identically to real API mode.
 */
export function setUiPendingPayment(data: PendingPaymentQueryParams): void {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(UI_PENDING_KEY, JSON.stringify(data))
  } catch {
    // Ignore storage quota or unavailable errors
  }
}

export function getUiPendingPayment(): PendingPaymentQueryParams | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(UI_PENDING_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearUiPendingPayment(): void {
  if (!import.meta.client) return
  try {
    sessionStorage.removeItem(UI_PENDING_KEY)
  } catch {
    // Ignore
  }
}

export function setUiPendingSeatingPayment(data: PendingSeatingQueryParams): void {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(UI_JAM_PENDING_KEY, JSON.stringify(data))
  } catch {
    // Ignore
  }
}

export function getUiPendingSeatingPayment(): PendingSeatingQueryParams | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(UI_JAM_PENDING_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearUiPendingSeatingPayment(): void {
  if (!import.meta.client) return
  try {
    sessionStorage.removeItem(UI_JAM_PENDING_KEY)
  } catch {
    // Ignore
  }
}

export function setUiUnpaidEvent(data: Record<string, string>): void {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(UI_UNPAID_KEY, JSON.stringify(data))
  } catch {
    // Ignore
  }
}

export function getUiUnpaidEvent(): Record<string, string> | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(UI_UNPAID_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearUiUnpaidEvent(): void {
  if (!import.meta.client) return
  try {
    sessionStorage.removeItem(UI_UNPAID_KEY)
  } catch {
    // Ignore
  }
}

export function setUiUnpaidSeating(data: Record<string, string>): void {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(UI_JAM_UNPAID_KEY, JSON.stringify(data))
  } catch {
    // Ignore
  }
}

export function getUiUnpaidSeating(): Record<string, string> | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(UI_JAM_UNPAID_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearUiUnpaidSeating(): void {
  if (!import.meta.client) return
  try {
    sessionStorage.removeItem(UI_JAM_UNPAID_KEY)
  } catch {
    // Ignore
  }
}
