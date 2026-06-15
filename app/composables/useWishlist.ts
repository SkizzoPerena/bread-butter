import type {
  CreateGiftItemPayload,
  CreateQrCodePayload,
  GiftItemEntry,
  QrCodeEntry,
  UpdateGiftItemPayload,
  UpdateQrCodePayload,
  WishlistMutationResponse,
  WishlistRecord,
  WishlistResponse,
} from '~/types/wishlist'

function mockWishlist(eventId: string): WishlistRecord {
  return {
    _id: 'mock-wishlist-1',
    event: eventId,
    qrCodes: [
      {
        _id: 'mock-qr-1',
        qrCodeUrl: 'https://placehold.co/200x200/png',
        bankType: 'GCash',
        accountName: 'Jane Doe',
        accountNumber: '09171234567',
      },
    ],
    wishedItems: [
      {
        _id: 'mock-gift-1',
        name: 'Kitchen stand mixer',
        url: 'https://example.com/mixer',
        isFulfilled: false,
      },
    ],
  }
}

function appendQrCode(
  wishlist: WishlistRecord,
  payload: CreateQrCodePayload,
  file?: File
): WishlistRecord {
  const entry: QrCodeEntry = {
    _id: `mock-qr-${Date.now()}`,
    accountNumber: payload.accountNumber.trim(),
    ...(payload.bankType ? { bankType: payload.bankType.trim() } : {}),
    ...(payload.accountName ? { accountName: payload.accountName.trim() } : {}),
    qrCodeUrl: file ? URL.createObjectURL(file) : 'https://placehold.co/200x200/png',
  }
  return {
    ...wishlist,
    qrCodes: [...wishlist.qrCodes, entry],
  }
}

function updateQrCodeEntry(
  wishlist: WishlistRecord,
  qrCodeId: string,
  payload: UpdateQrCodePayload,
  file?: File
): WishlistRecord {
  return {
    ...wishlist,
    qrCodes: wishlist.qrCodes.map((entry) => {
      if (entry._id !== qrCodeId) {
        return entry
      }
      return {
        ...entry,
        ...(payload.accountNumber !== undefined
          ? { accountNumber: payload.accountNumber.trim() }
          : {}),
        ...(payload.bankType !== undefined ? { bankType: payload.bankType.trim() } : {}),
        ...(payload.accountName !== undefined
          ? { accountName: payload.accountName.trim() }
          : {}),
        ...(file ? { qrCodeUrl: URL.createObjectURL(file) } : {}),
      }
    }),
  }
}

function appendGiftItem(wishlist: WishlistRecord, payload: CreateGiftItemPayload): WishlistRecord {
  const entry: GiftItemEntry = {
    _id: `mock-gift-${Date.now()}`,
    name: payload.name.trim(),
    ...(payload.url ? { url: payload.url.trim() } : {}),
    isFulfilled: false,
  }
  return {
    ...wishlist,
    wishedItems: [...wishlist.wishedItems, entry],
  }
}

function updateGiftItemEntry(
  wishlist: WishlistRecord,
  giftItemId: string,
  payload: UpdateGiftItemPayload
): WishlistRecord {
  return {
    ...wishlist,
    wishedItems: wishlist.wishedItems.map((entry) => {
      if (entry._id !== giftItemId) {
        return entry
      }
      return {
        ...entry,
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.url !== undefined
          ? payload.url
            ? { url: payload.url.trim() }
            : { url: undefined }
          : {}),
        ...(payload.isFulfilled !== undefined ? { isFulfilled: payload.isFulfilled } : {}),
      }
    }),
  }
}

function buildQrFormData(payload: CreateQrCodePayload | UpdateQrCodePayload, file?: File): FormData {
  const formData = new FormData()
  if (payload.accountNumber !== undefined) {
    formData.append('accountNumber', payload.accountNumber.trim())
  }
  if (payload.bankType !== undefined && payload.bankType.trim() !== '') {
    formData.append('bankType', payload.bankType.trim())
  }
  if (payload.accountName !== undefined && payload.accountName.trim() !== '') {
    formData.append('accountName', payload.accountName.trim())
  }
  if (file) {
    formData.append('qrCode', file)
  }
  return formData
}

export function useWishlist() {
  const { apiRequest, apiUpload, isUiOnlyMode } = useApiMode()

  let mockWishlistState: WishlistRecord | null = null

  function getMockWishlist(eventId: string): WishlistRecord {
    if (!mockWishlistState || mockWishlistState.event !== eventId) {
      mockWishlistState = mockWishlist(eventId)
    }
    return mockWishlistState
  }

  async function fetchWishlistByEvent(eventId: string): Promise<WishlistRecord> {
    if (isUiOnlyMode.value) {
      return getMockWishlist(eventId)
    }

    const response = await apiRequest<WishlistResponse>(`/user/wishlists/event/${eventId}`)
    return response.wishlist
  }

  async function addQrCode(
    eventId: string,
    payload: CreateQrCodePayload,
    file: File
  ): Promise<WishlistMutationResponse> {
    if (isUiOnlyMode.value) {
      const wishlist = appendQrCode(getMockWishlist(eventId), payload, file)
      mockWishlistState = wishlist
      return {
        success: true,
        status: 201,
        message: 'QR code entry added successfully.',
        wishlist,
      }
    }

    const formData = buildQrFormData(payload, file)
    return apiUpload<WishlistMutationResponse>(
      `/user/wishlists/event/${eventId}/qr-codes`,
      formData
    )
  }

  async function updateQrCode(
    eventId: string,
    qrCodeId: string,
    payload: UpdateQrCodePayload,
    file?: File
  ): Promise<WishlistMutationResponse> {
    if (isUiOnlyMode.value) {
      const wishlist = updateQrCodeEntry(getMockWishlist(eventId), qrCodeId, payload, file)
      mockWishlistState = wishlist
      return {
        success: true,
        status: 200,
        message: 'QR code entry updated successfully.',
        wishlist,
      }
    }

    if (file) {
      const formData = buildQrFormData(payload, file)
      return apiUpload<WishlistMutationResponse>(
        `/user/wishlists/event/${eventId}/qr-codes/${qrCodeId}`,
        formData,
        { method: 'PATCH' }
      )
    }

    return apiRequest<WishlistMutationResponse>(
      `/user/wishlists/event/${eventId}/qr-codes/${qrCodeId}`,
      {
        method: 'PATCH',
        body: payload,
      }
    )
  }

  async function deleteQrCode(
    eventId: string,
    qrCodeId: string
  ): Promise<WishlistMutationResponse> {
    if (isUiOnlyMode.value) {
      const current = getMockWishlist(eventId)
      const wishlist = {
        ...current,
        qrCodes: current.qrCodes.filter((entry) => entry._id !== qrCodeId),
      }
      mockWishlistState = wishlist
      return {
        success: true,
        status: 200,
        message: 'QR code entry deleted successfully.',
        wishlist,
      }
    }

    return apiRequest<WishlistMutationResponse>(
      `/user/wishlists/event/${eventId}/qr-codes/${qrCodeId}`,
      { method: 'DELETE' }
    )
  }

  async function addGiftItem(
    eventId: string,
    payload: CreateGiftItemPayload
  ): Promise<WishlistMutationResponse> {
    if (isUiOnlyMode.value) {
      const wishlist = appendGiftItem(getMockWishlist(eventId), payload)
      mockWishlistState = wishlist
      return {
        success: true,
        status: 201,
        message: 'Gift item added successfully.',
        wishlist,
      }
    }

    return apiRequest<WishlistMutationResponse>(
      `/user/wishlists/event/${eventId}/gift-items`,
      {
        method: 'POST',
        body: payload,
      }
    )
  }

  async function updateGiftItem(
    eventId: string,
    giftItemId: string,
    payload: UpdateGiftItemPayload
  ): Promise<WishlistMutationResponse> {
    if (isUiOnlyMode.value) {
      const wishlist = updateGiftItemEntry(getMockWishlist(eventId), giftItemId, payload)
      mockWishlistState = wishlist
      return {
        success: true,
        status: 200,
        message: 'Gift item updated successfully.',
        wishlist,
      }
    }

    return apiRequest<WishlistMutationResponse>(
      `/user/wishlists/event/${eventId}/gift-items/${giftItemId}`,
      {
        method: 'PATCH',
        body: payload,
      }
    )
  }

  async function deleteGiftItem(
    eventId: string,
    giftItemId: string
  ): Promise<WishlistMutationResponse> {
    if (isUiOnlyMode.value) {
      const current = getMockWishlist(eventId)
      const wishlist = {
        ...current,
        wishedItems: current.wishedItems.filter((entry) => entry._id !== giftItemId),
      }
      mockWishlistState = wishlist
      return {
        success: true,
        status: 200,
        message: 'Gift item deleted successfully.',
        wishlist,
      }
    }

    return apiRequest<WishlistMutationResponse>(
      `/user/wishlists/event/${eventId}/gift-items/${giftItemId}`,
      { method: 'DELETE' }
    )
  }

  return {
    fetchWishlistByEvent,
    addQrCode,
    updateQrCode,
    deleteQrCode,
    addGiftItem,
    updateGiftItem,
    deleteGiftItem,
  }
}
