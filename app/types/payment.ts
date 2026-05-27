export type PaymentStatus = 'PENDING' | 'APPROVED' | 'DENIED'

export type PaymentType = 'EVENT_CREATION_FEE'

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
  transactionId: string
  proofOfPaymentURL: string
  status: PaymentStatus
  denialReason?: string
  reviewedAt?: string | null
  reviewedBy?: string | null
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

export function needsPaymentSubmission(latestPayment?: PaymentRecord | null): boolean {
  if (!latestPayment) {
    return true
  }
  if (latestPayment.status === 'APPROVED') {
    return false
  }
  if (latestPayment.status === 'PENDING') {
    return false
  }
  return latestPayment.status === 'DENIED'
}

export function isPaymentPendingReview(latestPayment?: PaymentRecord | null): boolean {
  return latestPayment?.status === 'PENDING'
}
