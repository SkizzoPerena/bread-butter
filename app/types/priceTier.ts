export type PriceTierCode = string

export interface PriceTierRecord {
  _id: string
  code: PriceTierCode
  name: string
  pricePhp: number
  emailAllocation?: number
  isEnabled: boolean
}

export interface PriceTiersListResponse {
  success: boolean
  status: number
  tiers: PriceTierRecord[]
}
