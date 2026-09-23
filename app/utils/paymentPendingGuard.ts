import type { EventRecord } from '~/types/event'
import { isEventFullyPaid } from '~/types/payment'
import { isPartnerAuthPublicPath, isPartnerPath, isUserAuthPublicPath } from '~/utils/authGuard'

export interface PendingPaymentQueryParams {
  ref?: string
  eventName?: string
  package?: string
  method?: string
}

const UI_PENDING_KEY = 'bpb-ui-pending-payment'

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
  if (path.startsWith('/sites/') || path.startsWith('/rsvp/')) {
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
 * Extracts standard query parameters for /user/payment-pending from an EventRecord.
 */
export function buildPendingPaymentQuery(event: EventRecord): PendingPaymentQueryParams {
  const pkgCode =
    typeof event.priceTier === 'object' && event.priceTier
      ? (event.priceTier as any).code || (event.priceTier as any).name || ''
      : typeof event.priceTier === 'string'
        ? event.priceTier
        : ''

  return {
    ref: event.latestPayment?.transactionId || event.latestPayment?._id || '',
    eventName: event.eventName || '',
    package: pkgCode,
    method: event.latestPayment?.paymentMethod || '',
  }
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
