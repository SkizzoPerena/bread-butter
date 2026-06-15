export interface QrCodeEntry {
  _id: string
  qrCodeUrl?: string
  bankType?: string
  accountName?: string
  accountNumber: string
}

export interface GiftItemEntry {
  _id: string
  name: string
  url?: string
  isFulfilled?: boolean
}

export interface WishlistRecord {
  _id: string
  event: string
  qrCodes: QrCodeEntry[]
  wishedItems: GiftItemEntry[]
  createdAt?: string
  updatedAt?: string
}

export interface WishlistResponse {
  success: boolean
  status: number
  wishlist: WishlistRecord
}

export interface WishlistMutationResponse {
  success: boolean
  status: number
  message: string
  wishlist: WishlistRecord
}

export interface CreateQrCodePayload {
  accountNumber: string
  bankType?: string
  accountName?: string
}

export interface UpdateQrCodePayload {
  accountNumber?: string
  bankType?: string
  accountName?: string
}

export interface CreateGiftItemPayload {
  name: string
  url?: string
}

export interface UpdateGiftItemPayload {
  name?: string
  url?: string
  isFulfilled?: boolean
}
