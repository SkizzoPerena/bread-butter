export type PaymentStatus = 'PENDING' | 'APPROVED' | 'DENIED'

export type PaymentType = 'EVENT_CREATION_FEE'

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
  event?: string | {
    _id: string
    eventName: string
    eventType?: string
    eventDate?: string
  }
  type: PaymentType
  amount: number
  amountReceived?: number | null
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
  paymentSummary?: EventPaymentSummary | null
}

export function isEventFullyPaid(event?: EventPaymentContext | null): boolean {
  if (event?.paymentSummary) {
    return event.paymentSummary.isFullyPaid
  }
  return event?.latestPayment?.status === 'APPROVED'
}

export function getEventBalanceDue(event?: EventPaymentContext | null): number {
  if (event?.paymentSummary) {
    return event.paymentSummary.balanceDue
  }
  return event?.latestPayment?.status === 'APPROVED' ? 0 : EVENT_CREATION_FEE_PHP
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
