export type CashoutStatus = 'PENDING' | 'COMPLETED' | 'REJECTED'

export interface CashoutRecord {
  _id: string
  amountPhp: number
  paymentMethod: string
  status: CashoutStatus
  reason?: string
  denialReason?: string
  processedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CashoutRequestPayload {
  amountPhp: number
  paymentMethod?: string
}

export interface CashoutsListResponse {
  success: boolean
  status?: number
  cashouts: CashoutRecord[]
}

export interface CashoutResponse {
  success: boolean
  status?: number
  message: string
  cashout: CashoutRecord
}
