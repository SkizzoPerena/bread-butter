import type { EventRecord } from '~/types/event'
import type { PaymentRecord } from '~/types/payment'

export interface UpgradePaymentSummary {
  requiredAmount: number
  totalReceived: number
  balanceDue: number
  isFullyPaid: boolean
}

export interface CurrentTierInfo {
  tierId: string | null
  name: string | null
  code: string | null
  pricePhp: number | null
  emailAllocation: number | null
}

export interface TierUpgradeOption {
  targetTierId: string
  name: string
  code: string
  pricePhp: number
  priceDifferencePhp: number
  emailCreditsDelta: number
  paymentSummary: UpgradePaymentSummary
}

export interface PlanCatalogEntry {
  tierId: string
  name: string
  code: string
  pricePhp: number
  emailAllocation: number | null
  isEnabled: boolean
  status: 'current' | 'available' | 'unavailable'
  eligible: boolean
  reason: string | null
  priceDifferencePhp: number | null
  emailCreditsDelta: number
  paymentSummary: UpgradePaymentSummary | null
}

export interface PendingUpgradeInfo {
  _id: string
  type: 'TIER_UPGRADE'
  status: 'PENDING'
  amount: number
  transactionId: string
  createdAt?: string
  targetTierName?: string | null
}

export interface TierUpgradeOptionsResponse {
  success: boolean
  status: number
  eventFullyPaid: boolean
  hasPendingUpgrade: boolean
  pendingUpgrade: PendingUpgradeInfo | null
  currentTier: CurrentTierInfo
  allPlans: PlanCatalogEntry[]
  upgrades: TierUpgradeOption[]
}

export interface SubmitTierUpgradePayload {
  targetTierId: string
  transactionId: string
  paymentMethod: string
  proofOfPayment: File
}

export interface EmailCreditPackage {
  _id: string
  name: string
  emailCredits: number
  pricePhp: number
  isEnabled?: boolean
}

export interface EmailCreditPackagesResponse {
  success: boolean
  status: number
  packages: EmailCreditPackage[]
}

export interface SubmitEmailCreditPayload {
  emailCreditPackageId: string
  transactionId: string
  paymentMethod: string
  proofOfPayment: File
}

export interface UpgradePaymentMessageResponse {
  success: boolean
  status: number
  message: string
  payment?: PaymentRecord
  event?: EventRecord
}
