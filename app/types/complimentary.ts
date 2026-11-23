export type ComplimentaryProduct = 'EVENT' | 'JAM'

/** A free event or Jam the user can still create. */
export interface ComplimentaryGrantRecord {
  _id: string
  product: ComplimentaryProduct
  priceTier: { _id: string, name: string, code?: string, pricePhp: number } | null
  jamPackage: { _id: string, name: string, pricePhp: number, maxGuests: number } | null
  packageName: string
  source: 'ADMIN' | 'CODE'
  status: 'AVAILABLE' | 'USED' | 'REVOKED'
  currentPricePhp: number | null
  createdAt: string
}

export interface ComplimentaryGrantsResponse {
  success: boolean
  status: number
  grants: ComplimentaryGrantRecord[]
}

export interface RedeemCodeResponse {
  success: boolean
  status: number
  message: string
  grant: ComplimentaryGrantRecord
}
