export interface VoucherRecord {
  _id: string
  code: string
  discountAmountPhp: number
  maxUses?: number | null
  expiresAt?: string | null
  isActive: boolean
  isDeleted?: boolean
  useCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface VoucherPayload {
  code: string
  discountAmountPhp: number
  maxUses?: number | null
  expiresAt?: string | null
}

export interface VouchersListResponse {
  success: boolean
  status?: number
  vouchers: VoucherRecord[]
}

export interface VoucherResponse {
  success: boolean
  status?: number
  message: string
  voucher: VoucherRecord
}

export interface VoucherValidateResponse {
  success: boolean
  status?: number
  message: string
  code?: string
  discountAmountPhp?: number
}

