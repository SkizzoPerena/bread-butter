import type { Ref } from 'vue'
import type { GiftItemEntry, QrCodeEntry, WishlistRecord } from '~/types/wishlist'
import { reportApiError } from '~/types/auth'

type QrModalMode = 'create' | 'edit'
type GiftModalMode = 'create' | 'edit'

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function useEventWishlist(options: {
  eventId: Ref<string>
  mutationsDisabled: Ref<boolean>
}) {
  const toast = useToast()
  const {
    fetchWishlistByEvent,
    addQrCode,
    updateQrCode,
    deleteQrCode,
    addGiftItem,
    updateGiftItem,
    deleteGiftItem,
  } = useWishlist()

  const wishlist = ref<WishlistRecord | null>(null)
  const isLoading = ref(false)
  const isSubmitting = ref(false)

  const isQrModalOpen = ref(false)
  const qrModalMode = ref<QrModalMode>('create')
  const editingQrId = ref<string | null>(null)
  const qrForm = reactive({
    bankType: '',
    accountName: '',
    accountNumber: '',
  })
  const qrImageFile = ref<File | null>(null)
  const qrImageInput = ref<HTMLInputElement | null>(null)
  const existingQrImageUrl = ref<string | null>(null)

  const isGiftModalOpen = ref(false)
  const giftModalMode = ref<GiftModalMode>('create')
  const editingGiftId = ref<string | null>(null)
  const giftForm = reactive({
    name: '',
    url: '',
  })

  const isDeleteQrModalOpen = ref(false)
  const qrToDelete = ref<QrCodeEntry | null>(null)
  const isDeleteGiftModalOpen = ref(false)
  const giftToDelete = ref<GiftItemEntry | null>(null)
  const deletingQrId = ref<string | null>(null)
  const deletingGiftId = ref<string | null>(null)

  const qrCodes = computed(() => wishlist.value?.qrCodes ?? [])
  const giftItems = computed(() => wishlist.value?.wishedItems ?? [])

  const qrImagePreview = computed(() => {
    if (qrImageFile.value) {
      return URL.createObjectURL(qrImageFile.value)
    }
    return existingQrImageUrl.value
  })

  function resetQrForm() {
    qrForm.bankType = ''
    qrForm.accountName = ''
    qrForm.accountNumber = ''
    qrImageFile.value = null
    existingQrImageUrl.value = null
    editingQrId.value = null
    if (qrImageInput.value) {
      qrImageInput.value.value = ''
    }
  }

  function resetGiftForm() {
    giftForm.name = ''
    giftForm.url = ''
    editingGiftId.value = null
  }

  async function loadWishlist(targetEventId?: string) {
    const id = targetEventId ?? options.eventId.value
    if (!id) {
      wishlist.value = null
      return
    }

    isLoading.value = true
    try {
      wishlist.value = await fetchWishlistByEvent(id)
    } catch (error) {
      wishlist.value = null
      reportApiError(toast, { title: 'Could not load wishlist', error })
    } finally {
      isLoading.value = false
    }
  }

  function openCreateQrModal() {
    resetQrForm()
    qrModalMode.value = 'create'
    isQrModalOpen.value = true
  }

  function openEditQrModal(entry: QrCodeEntry) {
    resetQrForm()
    qrModalMode.value = 'edit'
    editingQrId.value = entry._id
    qrForm.bankType = entry.bankType ?? ''
    qrForm.accountName = entry.accountName ?? ''
    qrForm.accountNumber = entry.accountNumber
    existingQrImageUrl.value = entry.qrCodeUrl ?? null
    isQrModalOpen.value = true
  }

  function closeQrModal() {
    if (isSubmitting.value) {
      return
    }
    isQrModalOpen.value = false
    resetQrForm()
  }

  function onQrImageChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0] ?? null
    qrImageFile.value = file
  }

  async function submitQrModal() {
    const eventId = options.eventId.value
    if (!eventId || options.mutationsDisabled.value) {
      return
    }

    const accountNumber = qrForm.accountNumber.trim()
    if (!accountNumber) {
      toast.add({ title: 'Account number is required', color: 'error' })
      return
    }

    if (qrModalMode.value === 'create' && !qrImageFile.value) {
      toast.add({ title: 'QR code image is required', color: 'error' })
      return
    }

    isSubmitting.value = true
    try {
      const bankType = qrForm.bankType.trim()
      const accountName = qrForm.accountName.trim()
      const payload = {
        accountNumber,
        ...(bankType ? { bankType } : {}),
        ...(accountName ? { accountName } : {}),
      }

      let response
      if (qrModalMode.value === 'create') {
        response = await addQrCode(eventId, payload, qrImageFile.value!)
      } else if (editingQrId.value) {
        response = await updateQrCode(
          eventId,
          editingQrId.value,
          payload,
          qrImageFile.value ?? undefined
        )
      } else {
        return
      }

      wishlist.value = response.wishlist
      toast.add({ title: response.message, color: 'success' })
      isQrModalOpen.value = false
      resetQrForm()
    } catch (error) {
      reportApiError(toast, { title: 'Could not save QR code', error })
    } finally {
      isSubmitting.value = false
    }
  }

  function openDeleteQrModal(entry: QrCodeEntry) {
    qrToDelete.value = entry
    isDeleteQrModalOpen.value = true
  }

  async function confirmDeleteQr() {
    const eventId = options.eventId.value
    const entry = qrToDelete.value
    if (!eventId || !entry || options.mutationsDisabled.value) {
      return
    }

    deletingQrId.value = entry._id
    try {
      const response = await deleteQrCode(eventId, entry._id)
      wishlist.value = response.wishlist
      toast.add({ title: response.message, color: 'success' })
      isDeleteQrModalOpen.value = false
      qrToDelete.value = null
    } catch (error) {
      reportApiError(toast, { title: 'Could not delete QR code', error })
    } finally {
      deletingQrId.value = null
    }
  }

  function openCreateGiftModal() {
    resetGiftForm()
    giftModalMode.value = 'create'
    isGiftModalOpen.value = true
  }

  function openEditGiftModal(entry: GiftItemEntry) {
    resetGiftForm()
    giftModalMode.value = 'edit'
    editingGiftId.value = entry._id
    giftForm.name = entry.name
    giftForm.url = entry.url ?? ''
    isGiftModalOpen.value = true
  }

  function closeGiftModal() {
    if (isSubmitting.value) {
      return
    }
    isGiftModalOpen.value = false
    resetGiftForm()
  }

  async function submitGiftModal() {
    const eventId = options.eventId.value
    if (!eventId || options.mutationsDisabled.value) {
      return
    }

    const name = giftForm.name.trim()
    if (!name) {
      toast.add({ title: 'Gift name is required', color: 'error' })
      return
    }

    const url = giftForm.url.trim()
    if (url && !isValidHttpUrl(url)) {
      toast.add({ title: 'URL must be a valid http:// or https:// link', color: 'error' })
      return
    }

    isSubmitting.value = true
    try {
      const payload = {
        name,
        ...(url ? { url } : {}),
      }

      let response
      if (giftModalMode.value === 'create') {
        response = await addGiftItem(eventId, payload)
      } else if (editingGiftId.value) {
        response = await updateGiftItem(eventId, editingGiftId.value, payload)
      } else {
        return
      }

      wishlist.value = response.wishlist
      toast.add({ title: response.message, color: 'success' })
      isGiftModalOpen.value = false
      resetGiftForm()
    } catch (error) {
      reportApiError(toast, { title: 'Could not save gift item', error })
    } finally {
      isSubmitting.value = false
    }
  }

  function openDeleteGiftModal(entry: GiftItemEntry) {
    giftToDelete.value = entry
    isDeleteGiftModalOpen.value = true
  }

  async function confirmDeleteGift() {
    const eventId = options.eventId.value
    const entry = giftToDelete.value
    if (!eventId || !entry || options.mutationsDisabled.value) {
      return
    }

    deletingGiftId.value = entry._id
    try {
      const response = await deleteGiftItem(eventId, entry._id)
      wishlist.value = response.wishlist
      toast.add({ title: response.message, color: 'success' })
      isDeleteGiftModalOpen.value = false
      giftToDelete.value = null
    } catch (error) {
      reportApiError(toast, { title: 'Could not delete gift item', error })
    } finally {
      deletingGiftId.value = null
    }
  }

  return {
    wishlist,
    isLoading,
    isSubmitting,
    qrCodes,
    giftItems,
    isQrModalOpen,
    qrModalMode,
    qrForm,
    qrImageFile,
    qrImageInput,
    qrImagePreview,
    isGiftModalOpen,
    giftModalMode,
    giftForm,
    isDeleteQrModalOpen,
    qrToDelete,
    isDeleteGiftModalOpen,
    giftToDelete,
    deletingQrId,
    deletingGiftId,
    loadWishlist,
    openCreateQrModal,
    openEditQrModal,
    closeQrModal,
    onQrImageChange,
    submitQrModal,
    openDeleteQrModal,
    confirmDeleteQr,
    openCreateGiftModal,
    openEditGiftModal,
    closeGiftModal,
    submitGiftModal,
    openDeleteGiftModal,
    confirmDeleteGift,
  }
}
