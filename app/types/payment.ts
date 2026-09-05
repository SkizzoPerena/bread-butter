export type PaymentStatus = 'PENDING' | 'APPROVED' | 'DENIED'

export type PaymentType = 'EVENT_CREATION_FEE' | 'TIER_UPGRADE' | 'EMAIL_CREDIT_PURCHASE'

export interface PaymentUpgradeRef {
  _id: string
  name: string
  code?: string
  emailCredits?: number
}

export interface PaymentUpgrade {
  targetTierId?: PaymentUpgradeRef | string | null
  emailCreditPackageId?: PaymentUpgradeRef | string | null
  emailCreditsGranted?: number | null
}

export type RefundStatus = 'PENDING' | 'COMPLETED' | 'REJECTED'

export interface RefundRecord {
  _id: string
  payment?: string
  event?: string
  user?: string
  amount: number
  status: RefundStatus
  reason?: string
  processedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface PaymentRecord {
  _id: string
  user?: string
  partner?: string
  event?: string | {
    _id: string
    eventName: string
    eventType?: string
    eventDate?: string
  }
  type: PaymentType
  purpose?: string
  upgrade?: PaymentUpgrade | null
  amount: number
  amountReceived?: number | null
  partnerCreditAppliedPhp?: number | null
  platformCreditAppliedPhp?: number | null
  transactionId: string
  proofOfPaymentURL: string
  status: PaymentStatus
  denialReason?: string
  reviewedAt?: string | null
  reviewedBy?: string | null
  refund?: RefundRecord | null
  createdAt?: string
  updatedAt?: string
}

export interface PendingPaymentSummary {
  _id: string
  type: PaymentType
  status: PaymentStatus
  amount: number
  transactionId: string
  createdAt?: string
  targetTierName?: string | null
}

export interface PaymentsListResponse {
  success: boolean
  status: number
  payments: PaymentRecord[]
  pagination?: {
    page: number
    limit: number
    total: number
  }
}

export interface EventPaymentsListResponse {
  success: boolean
  status: number
  payments: PaymentRecord[]
}

export interface PaymentMessageResponse {
  success: boolean
  status: number
  message: string
  payment?: PaymentRecord
  event?: import('~/types/event').EventRecord
}

export interface PlatformRevenueResponse {
  success: boolean
  status: number
  totalRevenue: number
  approvedCount: number
  currency: string
}

export interface SubmitEventPaymentPayload {
  transactionId: string
  proofOfPayment: File
  paymentMethod: string
}

export const EVENT_CREATION_FEE_PHP = 10000

export interface EventPaymentSummary {
  fee: number
  totalReceived: number
  balanceDue: number
  isFullyPaid: boolean
}

interface EventPaymentContext {
  latestPayment?: PaymentRecord | null
  pendingPayment?: PendingPaymentSummary | null
  paymentSummary?: EventPaymentSummary | null
}

export function getPendingPayment(
  event?: EventPaymentContext | null,
): PendingPaymentSummary | PaymentRecord | null {
  if (event?.pendingPayment?.status === 'PENDING') {
    return event.pendingPayment
  }
  if (event?.latestPayment?.status === 'PENDING') {
    return event.latestPayment
  }
  return null
}

export function isTierUpgradePending(event?: EventPaymentContext | null): boolean {
  return getPendingPayment(event)?.type === 'TIER_UPGRADE'
}

export function isEmailCreditPurchasePending(event?: EventPaymentContext | null): boolean {
  return getPendingPayment(event)?.type === 'EMAIL_CREDIT_PURCHASE'
}

export function hasPendingPaymentBlockingUpgrade(event?: EventPaymentContext | null): boolean {
  return isTierUpgradePending(event)
}

export function getPendingUpgradeTargetName(event?: EventPaymentContext | null): string | null {
  const pending = getPendingPayment(event)
  if (!pending || pending.type !== 'TIER_UPGRADE') return null
  if ('targetTierName' in pending && pending.targetTierName) {
    return pending.targetTierName
  }
  return null
}

export function getPendingUpgradeStatusLabel(event?: EventPaymentContext | null): string {
  const targetTier = getPendingUpgradeTargetName(event)
  if (targetTier) {
    return `Upgrade to ${targetTier} pending`
  }
  if (isTierUpgradePending(event)) {
    return 'Upgrade pending review'
  }
  const pending = getPendingPayment(event)
  if (pending?.status === 'PENDING') {
    return 'Payment pending review'
  }
  return ''
}

export function isEventFullyPaid(event?: EventPaymentContext | null): boolean {
  if (event?.paymentSummary) {
    return event.paymentSummary.isFullyPaid
  }
  return event?.latestPayment?.status === 'APPROVED'
}

export function getEventCreationFee(event?: EventPaymentContext | null): number {
  if (event?.paymentSummary?.fee != null) {
    return event.paymentSummary.fee
  }
  if (typeof event?.latestPayment?.amount === 'number') {
    return event.latestPayment.amount
  }
  return EVENT_CREATION_FEE_PHP
}

export function getEventBalanceDue(event?: EventPaymentContext | null): number {
  if (event?.paymentSummary) {
    return event.paymentSummary.balanceDue
  }
  if (event?.latestPayment?.status === 'APPROVED') {
    return 0
  }
  return getEventCreationFee(event)
}

export function needsPaymentSubmission(event?: EventPaymentContext | null): boolean {
  if (isEventFullyPaid(event)) {
    return false
  }
  if (event?.latestPayment?.status === 'PENDING') {
    return false
  }
  return true
}

export function isPaymentPendingReview(latestPayment?: PaymentRecord | null): boolean {
  return latestPayment?.status === 'PENDING'
}

export function isEventPaymentApproved(latestPayment?: PaymentRecord | null): boolean {
  return latestPayment?.status === 'APPROVED'
}

export function formatPaymentPurpose(payment: {
  type?: string | null
  purpose?: string | null
}): string {
  const type = payment.type

  if (type === 'TIER_UPGRADE') {
    return 'Plan upgrade'
  }

  if (type === 'EMAIL_CREDIT_PURCHASE') {
    return 'Email credits'
  }

  if (type === 'EVENT_CREATION_FEE') {
    return 'Event plan'
  }

  if (typeof type === 'string' && type.length > 0) {
    return type
      .split('_')
      .map(part => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ')
  }

  return 'Payment'
}
