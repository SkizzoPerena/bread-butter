<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useEvents } from '~/composables/useEvents'
import { usePriceTiers, resolvePackageSlug, resolvePackageTierCode } from '~/composables/usePriceTiers'
import { useAccount } from '~/composables/useAccount'
import { useVouchers } from '~/composables/useVouchers'
import { usePayments } from '~/composables/usePayments'
import { usePaymongoActivation } from '~/composables/usePaymongoActivation'
import { usePayMongoCheckout } from '~/composables/usePayMongoCheckout'
import { getApiErrorMessage, reportApiError } from '~/types/auth'
import type { EventRecord } from '~/types/event'
import { mapApiToEventTypeLabel } from '~/types/event'
import { hasVoucherCode, normalizeVoucherCode } from '~/utils/referralCode'
import {
  REFERRAL_DISCOUNT_PERCENT,
  PROMO_DISCOUNT_PERCENT,
  percentOf,
} from '~/utils/pricing'
import { resolveEventDashboardPath } from '~/utils/eventTierFeatures'
import {
  getProofSubmitPayload,
  type PaymentProofPanelExpose,
} from '~/utils/paymentMethod'
import { setUiPendingPayment, setUiUnpaidEvent } from '~/utils/paymentPendingGuard'
import PaymentCheckoutPanel from '~/components/PaymentCheckoutPanel.vue'
import PaymentProofPanel from '~/components/PaymentProofPanel.vue'

definePageMeta({
  layout: 'signed-in-navbar',
})

useHead({
  title: 'Payment - Bread + Butter',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { createEvent, fetchEvent, updateEvent } = useEvents()
const { resolvePriceTierId, fetchAvailablePriceTiers } = usePriceTiers()
const { fetchAccount } = useAccount()
const { validateVoucherForUser } = useVouchers()
const { createEventFeeCheckoutSession, submitEventPaymentProof } = usePayments()
const { isUiOnlyMode } = useApiMode()
const { isPaymongoActivated } = usePaymongoActivation()
const { getOrCreateIdempotencyKey, rememberCheckoutIds, redirectToCheckout } = usePayMongoCheckout()
const proofPanel = ref<PaymentProofPanelExpose | null>(null)

const existingEventId = computed(() =>
  typeof route.query.eventId === 'string' && route.query.eventId.trim()
    ? route.query.eventId.trim()
    : ''
)

const loadedEvent = ref<EventRecord | null>(null)

const customEventOverrides = ref<{
  package?: string
  eventName?: string
  eventType?: string
  eventDate?: string
  venue?: string
  isCatholicWedding?: boolean
  description?: string
} | null>(null)

const selectedPkgId = computed(() => {
  if (customEventOverrides.value?.package) {
    return customEventOverrides.value.package
  }
  const raw = typeof route.query.package === 'string' && route.query.package.trim()
    ? route.query.package
    : 'bread-butter'
  return resolvePackageSlug(raw) ?? raw
})
const isBreadButterPackage = computed(() => selectedPkgId.value === 'bread-butter')

const eventName = computed(() => {
  if (customEventOverrides.value?.eventName !== undefined) {
    return customEventOverrides.value.eventName
  }
  if (typeof route.query.eventName === 'string' && route.query.eventName.trim()) {
    return route.query.eventName.trim()
  }
  return loadedEvent.value?.eventName || ''
})
const eventType = computed(() => {
  if (customEventOverrides.value?.eventType !== undefined) {
    return customEventOverrides.value.eventType
  }
  if (typeof route.query.eventType === 'string' && route.query.eventType.trim()) {
    return route.query.eventType.trim()
  }
  return loadedEvent.value?.eventType || 'WEDDING'
})
const eventTypeLabel = computed(() => mapApiToEventTypeLabel(eventType.value))

const eventDate = computed(() => {
  if (customEventOverrides.value?.eventDate !== undefined) {
    return customEventOverrides.value.eventDate
  }
  if (typeof route.query.eventDate === 'string' && route.query.eventDate.trim()) {
    return route.query.eventDate.trim()
  }
  return loadedEvent.value?.eventDate ? String(loadedEvent.value.eventDate).slice(0, 10) : ''
})

const formattedEventDate = computed(() => {
  if (!eventDate.value) return ''
  try {
    const d = new Date(`${eventDate.value}T00:00:00`)
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return eventDate.value
  }
})

const venue = computed(() => {
  if (customEventOverrides.value?.venue !== undefined) {
    return customEventOverrides.value.venue
  }
  if (typeof route.query.venue === 'string' && route.query.venue.trim()) {
    return route.query.venue.trim()
  }
  return loadedEvent.value?.venue || ''
})

const isCatholicWedding = computed(() => {
  if (customEventOverrides.value?.isCatholicWedding !== undefined) {
    return String(eventType.value || '').trim().toUpperCase() === 'WEDDING' && customEventOverrides.value.isCatholicWedding
  }
  const raw = route.query.isCatholicWedding
  if (raw !== undefined) {
    const value = Array.isArray(raw) ? raw[0] : raw
    const flagged = value === 'true' || value === '1'
    return String(eventType.value || '').trim().toUpperCase() === 'WEDDING' && flagged
  }
  return loadedEvent.value?.isCatholicWedding === true
})

const description = computed(() => {
  if (customEventOverrides.value?.description !== undefined) {
    return customEventOverrides.value.description
  }
  if (typeof route.query.description === 'string' && route.query.description.trim()) {
    return route.query.description.trim()
  }
  if (loadedEvent.value?.description) {
    return loadedEvent.value.description
  }
  const name = eventName.value.trim()
  const loc = venue.value.trim()
  if (name && loc) return `${name} at ${loc}`
  if (name) return `${name} celebration`
  return 'Event celebration'
})

const packageChoices = [
  {
    id: 'bread',
    title: 'Bread',
    description: 'Essential tools for your website and guests.',
    price: 'P10,000',
    discount: 'P5,000',
  },
  {
    id: 'butter',
    title: 'Butter',
    description: 'Advanced planning tools and supplier management.',
    price: 'P15,000',
    discount: 'P7,500',
  },
  {
    id: 'bread-butter',
    title: 'Bread + Butter',
    description: 'The ultimate package with full collaborator access.',
    price: 'P20,000',
    discount: 'P10,000',
  },
]

const eventTypeOptions = [
  { label: 'Wedding', value: 'WEDDING' },
  { label: 'Birthday', value: 'BIRTHDAY' },
  { label: 'Debut', value: 'DEBUT' },
  { label: 'Baptism', value: 'BAPTISM' },
  { label: 'Anniversary', value: 'ANNIVERSARY' },
  { label: 'Corporate Event', value: 'CORPORATE' },
  { label: 'Special Party', value: 'PARTY' },
]

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const minEventDate = computed(() => {
  return formatDateInputValue(new Date())
})

function isEventDateInPast(dateStr: string): boolean {
  if (!dateStr.trim()) return false
  const selected = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return selected < today
}

const isEditModalOpen = ref(false)

const editForm = reactive({
  package: 'bread-butter',
  eventName: '',
  eventType: 'WEDDING',
  eventDate: '',
  venue: '',
  description: '',
  isCatholicWedding: false,
})

const isEditWeddingEventType = computed(() =>
  String(editForm.eventType || '').trim().toUpperCase() === 'WEDDING',
)

watch(isEditWeddingEventType, (isWedding) => {
  if (!isWedding) {
    editForm.isCatholicWedding = false
  }
})

function openEditEventModal() {
  editForm.package = selectedPkgId.value
  editForm.eventName = eventName.value
  editForm.eventType = eventType.value
  editForm.eventDate = eventDate.value
  editForm.venue = venue.value
  editForm.description = description.value
  editForm.isCatholicWedding = isCatholicWedding.value
  isEditModalOpen.value = true
}

function saveEventDetails() {
  if (!editForm.eventName.trim()) {
    toast.add({
      title: 'Event name required',
      description: 'Please enter a name for your celebration.',
      color: 'warning',
    })
    return
  }

  if (!editForm.eventDate.trim()) {
    toast.add({
      title: 'Event date required',
      description: 'Please select your target event date.',
      color: 'warning',
    })
    return
  }

  if (isEventDateInPast(editForm.eventDate)) {
    toast.add({
      title: 'Event date in the past',
      description: 'Please select today or a future date for your event.',
      color: 'warning',
    })
    return
  }

  if (!editForm.venue.trim()) {
    toast.add({
      title: 'Venue required',
      description: 'Please enter a venue or location for your event.',
      color: 'warning',
    })
    return
  }

  const trimmedDesc = editForm.description.trim()
  let finalDescription = trimmedDesc
  if (!finalDescription) {
    const name = editForm.eventName.trim()
    const loc = editForm.venue.trim()
    if (name && loc) finalDescription = `${name} at ${loc}`
    else if (name) finalDescription = `${name} celebration`
    else finalDescription = 'Event celebration'
  }

  const finalCatholic = isEditWeddingEventType.value && editForm.isCatholicWedding

  customEventOverrides.value = {
    package: editForm.package,
    eventName: editForm.eventName.trim(),
    eventType: editForm.eventType,
    eventDate: editForm.eventDate,
    venue: editForm.venue.trim(),
    isCatholicWedding: finalCatholic,
    description: finalDescription,
  }

  const updatedQuery: Record<string, string> = {
    ...(route.query as Record<string, string>),
    package: editForm.package,
    eventName: editForm.eventName.trim(),
    eventType: editForm.eventType,
    eventDate: editForm.eventDate,
    venue: editForm.venue.trim(),
    description: finalDescription,
    isCatholicWedding: finalCatholic ? 'true' : 'false',
  }

  router.replace({ query: updatedQuery })

  if (isUiOnlyMode.value) {
    setUiUnpaidEvent(updatedQuery)
  }

  if (editForm.package !== 'bread-butter') {
    resetVoucherValidation()
    voucherCode.value = ''
  }

  syncTierBaseFee()

  isEditModalOpen.value = false
  toast.add({
    title: 'Event updated',
    description: 'Event details and order summary have been updated.',
    color: 'success',
  })
}

const packagesMap: Record<string, { title: string; price: string; discountPrice: string; description: string; baseFeePhp: number }> = {
  bread: {
    title: 'Bread',
    price: 'P10,000',
    discountPrice: 'P5,000',
    description: 'Essential tools for your website and guests.',
    baseFeePhp: 5000
  },
  butter: {
    title: 'Butter',
    price: 'P15,000',
    discountPrice: 'P7,500',
    description: 'Advanced planning tools and supplier management.',
    baseFeePhp: 7500
  },
  'bread-butter': {
    title: 'Bread + Butter',
    price: 'P20,000',
    discountPrice: 'P10,000',
    description: 'The ultimate package with full collaborator access.',
    baseFeePhp: 10000
  }
}

const defaultPackage = {
  title: 'Bread + Butter',
  price: 'P20,000',
  discountPrice: 'P10,000',
  description: 'The ultimate package with full collaborator access.',
  baseFeePhp: 10000
}

const currentPackage = computed(() => packagesMap[selectedPkgId.value] ?? defaultPackage)
const tierBaseFeePhp = ref<number | null>(null)
const cachedTiers = ref<{ code: string; pricePhp?: number; isEnabled?: boolean }[]>([])

function syncTierBaseFee() {
  const tierCode = resolvePackageTierCode(selectedPkgId.value)
  const match = cachedTiers.value.find(tier => tier.code === tierCode && tier.isEnabled !== false)
  if (typeof match?.pricePhp === 'number' && match.pricePhp > 0) {
    tierBaseFeePhp.value = match.pricePhp
  } else {
    tierBaseFeePhp.value = null
  }
}

watch(selectedPkgId, () => {
  syncTierBaseFee()
})

const baseFeePhp = computed(() => tierBaseFeePhp.value ?? currentPackage.value.baseFeePhp)

const isProcessing = ref(false)
const voucherCode = ref('')
const referralDiscountEligible = ref(false)
const voucherStatus = ref<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
const voucherDiscountPhp = ref(0)
const voucherMessage = ref('')
let voucherValidateTimer: ReturnType<typeof setTimeout> | null = null
let voucherValidateRequestId = 0

watch(voucherCode, (value) => {
  const normalized = normalizeVoucherCode(value)
  if (normalized !== value) {
    voucherCode.value = normalized
    return
  }

  if (!isBreadButterPackage.value) {
    resetVoucherValidation()
    return
  }

  if (!hasVoucherCode(normalized)) {
    resetVoucherValidation()
    return
  }

  voucherStatus.value = 'checking'
  voucherMessage.value = 'Checking promo code…'
  voucherDiscountPhp.value = 0

  if (voucherValidateTimer) {
    clearTimeout(voucherValidateTimer)
  }
  voucherValidateTimer = setTimeout(() => {
    void validateEnteredVoucher()
  }, 400)
})

const hasVoucherEntered = computed(() => hasVoucherCode(voucherCode.value))
const promoApplies = computed(
  () => voucherStatus.value === 'valid' && voucherDiscountPhp.value > 0,
)
const referralDiscountPhp = computed(() => {
  if (promoApplies.value || !referralDiscountEligible.value) return 0
  return percentOf(baseFeePhp.value, REFERRAL_DISCOUNT_PERCENT)
})
const appliedDiscountPhp = computed(() =>
  promoApplies.value ? voucherDiscountPhp.value : referralDiscountPhp.value,
)
const discountedSubtotalPhp = computed(() =>
  Math.max(0, baseFeePhp.value - appliedDiscountPhp.value),
)
const amountDuePhp = computed(() => discountedSubtotalPhp.value)

function resetVoucherValidation() {
  voucherStatus.value = 'idle'
  voucherDiscountPhp.value = 0
  voucherMessage.value = ''
}

function formatPhp(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}

async function validateEnteredVoucher() {
  const code = normalizeVoucherCode(voucherCode.value)
  if (!isBreadButterPackage.value || !hasVoucherCode(code)) {
    resetVoucherValidation()
    return
  }

  const requestId = ++voucherValidateRequestId
  voucherStatus.value = 'checking'
  voucherMessage.value = 'Checking promo code…'

  try {
    const response = await validateVoucherForUser(code, selectedPkgId.value)
    if (requestId !== voucherValidateRequestId) return
    if (normalizeVoucherCode(voucherCode.value) !== code) return

    voucherStatus.value = 'valid'
    voucherDiscountPhp.value = Number(response.discountAmountPhp) || 0
    voucherMessage.value =
      response.message ||
      `Promo code applied: ${response.discountPercent || PROMO_DISCOUNT_PERCENT}% off (${formatPhp(voucherDiscountPhp.value)}).`
  } catch (error) {
    if (requestId !== voucherValidateRequestId) return
    if (normalizeVoucherCode(voucherCode.value) !== code) return

    voucherStatus.value = 'invalid'
    voucherDiscountPhp.value = 0
    voucherMessage.value = getApiErrorMessage(error, 'This promo code is not valid.')
  }
}

onMounted(async () => {
  if (isUiOnlyMode.value) return

  if (existingEventId.value && /^[0-9a-fA-F]{24}$/.test(existingEventId.value)) {
    try {
      const detail = await fetchEvent(existingEventId.value)
      if (detail?.event) {
        loadedEvent.value = detail.event
      }
    } catch (err) {
      console.warn('Could not load existing event detail:', err)
    }
  }

  try {
    const [account, tiers] = await Promise.all([
      fetchAccount(),
      fetchAvailablePriceTiers()
    ])
    referralDiscountEligible.value = account.referralDiscountEligible === true
    cachedTiers.value = tiers
    syncTierBaseFee()
  } catch {
    referralDiscountEligible.value = false
  }

  if (route.query.cancelled === '1') {
    toast.add({
      title: 'Checkout cancelled',
      description: 'No charge was made. You can proceed to checkout when you are ready.',
      color: 'warning',
    })
  }
})

async function submitPayment() {
  if (!eventName.value.trim() || !eventDate.value.trim() || !venue.value.trim()) {
    toast.add({
      title: 'Missing event details',
      description: 'Please go back and complete your event setup first.',
      color: 'warning',
    })
    return
  }

  const proofPayload = isPaymongoActivated.value ? null : getProofSubmitPayload(proofPanel.value)
  if (!isPaymongoActivated.value && !proofPayload) {
    toast.add({
      title: 'Incomplete payment proof',
      description: 'Select a payment method, enter a reference ID, and upload your receipt.',
      color: 'warning',
    })
    return
  }

  isProcessing.value = true

  try {
    if (isUiOnlyMode.value) {
      if (isPaymongoActivated.value) {
        await navigateTo({
          path: '/user/payment/success',
          query: {
            payment_id: 'mock-payment-id',
            checkout_id: 'cs_mock',
          },
        })
        return
      }

      setUiPendingPayment({
        ref: proofPayload?.transactionId || 'MOCK-REF',
        eventName: eventName.value,
        package: selectedPkgId.value,
        method: proofPayload?.paymentMethod || 'GCASH',
      })

      await navigateTo({
        path: '/user/payment-pending',
        query: {
          ref: proofPayload?.transactionId || 'MOCK-REF',
          eventName: eventName.value,
          package: selectedPkgId.value,
          method: proofPayload?.paymentMethod || 'GCASH',
        },
      })
      return
    }

    const normalizedVoucher = normalizeVoucherCode(voucherCode.value)
    if (isBreadButterPackage.value && hasVoucherCode(normalizedVoucher)) {
      if (voucherStatus.value !== 'valid') {
        await validateEnteredVoucher()
      }
      if (voucherStatus.value !== 'valid') {
        toast.add({
          title: 'Invalid promo code',
          description: voucherMessage.value || 'Enter a valid partner promo code, or clear the field.',
          color: 'error',
        })
        return
      }
    }

    const priceTierId = await resolvePriceTierId(selectedPkgId.value)
    const targetEventId = existingEventId.value
    const paymentProvider = isPaymongoActivated.value ? 'PAYMONGO' : 'MANUAL'

    let created: any = null

    if (targetEventId && /^[0-9a-fA-F]{24}$/.test(targetEventId)) {
      // Ensure existing event details are updated on the API
      await updateEvent(targetEventId, {
        eventType: eventType.value,
        eventName: eventName.value.trim(),
        description: description.value,
        venue: venue.value.trim(),
        eventDate: eventDate.value,
        isCatholicWedding: isCatholicWedding.value,
      }).catch((err) => {
        console.warn('Could not update existing event details:', err)
      })

      if (proofPayload) {
        created = await submitEventPaymentProof(targetEventId, {
          transactionId: proofPayload.transactionId,
          paymentMethod: proofPayload.paymentMethod,
          proofOfPayment: proofPayload.proofOfPayment,
          provider: paymentProvider,
          type: 'EVENT_CREATION_FEE',
          amount: amountDuePhp.value,
          convenienceFeePhp: 0,
        })
      }
    } else {
      // Create new event sending all event details and initial payment schema fields
      created = await createEvent({
        eventType: eventType.value,
        eventName: eventName.value.trim(),
        description: description.value,
        venue: venue.value.trim(),
        eventDate: eventDate.value,
        isCatholicWedding: isCatholicWedding.value,
        priceTierId,
        payLater: isPaymongoActivated.value,
        provider: paymentProvider,
        type: 'EVENT_CREATION_FEE',
        amount: amountDuePhp.value,
        convenienceFeePhp: 0,
        ...(normalizedVoucher ? { voucherCode: normalizedVoucher } : {}),
        ...(!isPaymongoActivated.value && proofPayload
          ? {
            transactionId: proofPayload.transactionId,
            paymentMethod: proofPayload.paymentMethod,
            proofOfPayment: proofPayload.proofOfPayment,
          }
          : {}),
      })

      // If manual proof was provided, guarantee that the payment record is created in the backend.
      // If POST /user/events did not attach a pending latestPayment, submit to the dedicated payment-proof endpoint.
      if (!isPaymongoActivated.value && proofPayload && created?._id) {
        if (!created.latestPayment || created.latestPayment.status !== 'PENDING') {
          const paymentResult = await submitEventPaymentProof(created._id, {
            transactionId: proofPayload.transactionId,
            paymentMethod: proofPayload.paymentMethod,
            proofOfPayment: proofPayload.proofOfPayment,
            provider: 'MANUAL',
            type: 'EVENT_CREATION_FEE',
            amount: amountDuePhp.value,
            convenienceFeePhp: 0,
          })
          if (paymentResult) {
            created = { ...created, ...paymentResult }
          }
        }
      }
    }

    const eventId = created?._id || targetEventId
    if (amountDuePhp.value <= 0) {
      toast.add({
        title: 'Event created',
        description: 'There is no remaining balance to collect.',
        color: 'success',
      })
      if (created) {
        await navigateTo({ path: resolveEventDashboardPath(created), query: { eventId } })
      }
      return
    }

    if (!isPaymongoActivated.value) {
      const finalTransactionId = proofPayload?.transactionId || created?.latestPayment?.transactionId || ''
      const finalMethod = proofPayload?.paymentMethod || created?.latestPayment?.paymentMethod || ''
      const finalEventName = eventName.value || created?.eventName || ''

      setUiPendingPayment({
        ref: finalTransactionId,
        eventName: finalEventName,
        package: selectedPkgId.value,
        method: finalMethod,
      })

      toast.add({
        title: 'Proof of Payment Submitted',
        description: 'Your payment transaction is currently being verified.',
        color: 'success',
      })

      await navigateTo({
        path: '/user/payment-pending',
        query: {
          ref: finalTransactionId,
          eventName: finalEventName,
          package: selectedPkgId.value,
          method: finalMethod,
        },
      })
      return
    }

    const idempotencyKey = getOrCreateIdempotencyKey(`event-fee:${eventId}`)
    const checkout = await createEventFeeCheckoutSession(eventId, {
      cancelPath: `/event/payment-review?eventId=${eventId}&cancelled=1`,
      idempotencyKey,
    })

    if (checkout.alreadyPaid) {
      await navigateTo({
        path: '/user/payment/success',
        query: {
          payment_id: checkout.paymentId,
          checkout_id: checkout.checkoutId || undefined,
        },
      })
      return
    }

    if (!checkout.checkoutUrl) {
      toast.add({
        title: 'Could not start checkout',
        description: checkout.message || 'PayMongo did not return a checkout URL.',
        color: 'error',
      })
      return
    }

    rememberCheckoutIds(checkout.checkoutId, checkout.paymentId)
    redirectToCheckout(checkout.checkoutUrl)
  } catch (error) {
    reportApiError(toast, {
      title: isPaymongoActivated.value ? 'Could not start checkout' : 'Could not submit payment',
      error,
    })
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-4 pt-20 pb-10 bg-toast-700 text-white">
    <div class="max-w-3xl w-full mx-auto space-y-5">

      <!-- Page Header -->
      <div class="text-center space-y-1.5">
        <UBadge color="bread" variant="soft" size="sm"
          class="px-3 py-0.5 font-semibold rounded-full text-toast-900 bg-bread-400 text-xs">
          Checkout & Payment
        </UBadge>
        <h1 class="text-2xl sm:text-3xl font-bold font-serif text-bread-400">
          Complete Your Order
        </h1>
        <p class="text-xs text-bread-200">
          {{ isPaymongoActivated
            ? 'Review your order, then continue to PayMongo to complete payment.'
            : 'Review your order, then scan the QR and upload your proof of payment.' }}
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">

        <!-- Left Side: Order Summary Card -->
        <div class="bread-container bg-bread-400 text-toast-900 p-4 sm:p-5 md:col-span-5 space-y-4">
          <h2 class="text-lg font-bold font-serif text-toast-800 border-b border-toast-600/20 pb-2">
            Order Summary
          </h2>

          <div class="space-y-3">
            <!-- Event Details Summary -->
            <div class="bg-white/80 p-3 rounded-xl border border-toast-600/20 space-y-2 text-xs">
              <div class="space-y-1">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <span class="text-[10px] text-toast-600 font-semibold block uppercase">Event Name</span>
                    <p class="font-bold text-toast-900 text-sm truncate">{{ eventName || 'Untitled Event' }}</p>
                  </div>
                  <UButton
                    size="xs"
                    color="primary"
                    variant="soft"
                    icon="i-lucide-pencil"
                    class="shrink-0 font-semibold cursor-pointer"
                    @click="openEditEventModal"
                  >
                    Edit Event
                  </UButton>
                </div>
                <div class="grid grid-cols-2 gap-2 pt-0.5">
                  <div>
                    <span class="text-[10px] text-toast-600 font-semibold block uppercase">Date</span>
                    <p class="font-medium text-toast-900">{{ formattedEventDate || '—' }}</p>
                  </div>
                  <div>
                    <span class="text-[10px] text-toast-600 font-semibold block uppercase">Venue</span>
                    <p class="font-medium text-toast-900 truncate" :title="venue">{{ venue || '—' }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-white/80 p-3 rounded-xl border border-toast-600/20 space-y-1.5">
              <div class="flex justify-between items-center">
                <span class="font-serif font-bold text-base text-toast-900">{{ currentPackage.title }}</span>
                <UBadge color="toast" variant="solid" size="xs">Selected</UBadge>
              </div>
              <p class="text-xs text-toast-800 leading-snug">{{ currentPackage.description }}</p>
            </div>

            <div v-if="isBreadButterPackage" class="space-y-1.5">
              <label class="text-[10px] text-toast-600 font-bold uppercase tracking-wider">
                Partner promo code
              </label>
              <UInput v-model="voucherCode" placeholder="Enter voucher code" size="sm"
                class="w-full uppercase bg-white text-toast-900" />
              <p v-if="voucherMessage" class="text-[10px] leading-snug" :class="{
                'text-toast-700': voucherStatus === 'checking' || voucherStatus === 'idle',
                'text-green-800': voucherStatus === 'valid',
                'text-red-700': voucherStatus === 'invalid'
              }">
                {{ voucherMessage }}
              </p>
              <p v-else class="text-[10px] text-toast-700 leading-snug">
                Enter a partner voucher code to see your discount before you pay.
              </p>
            </div>
            <p v-else class="text-[10px] text-toast-700 italic leading-snug">
              Partner promo codes apply to Bread + Butter events only.
            </p>

            <!-- Price breakdown -->
            <div class="space-y-1.5 pt-1.5 text-xs border-t border-toast-600/20">
              <div class="flex justify-between text-toast-700">
                <span>Standard Rate</span>
                <span class="line-through">{{ currentPackage.price }}</span>
              </div>
              <div class="flex justify-between text-toast-700">
                <span>Package total</span>
                <span class="font-semibold text-toast-900">{{ formatPhp(baseFeePhp) }}</span>
              </div>
              <div v-if="promoApplies" class="flex justify-between text-green-800">
                <span>Partner promo {{ PROMO_DISCOUNT_PERCENT }}% ({{ voucherCode }})</span>
                <span class="font-semibold">-{{ formatPhp(voucherDiscountPhp) }}</span>
              </div>
              <div v-else-if="referralDiscountPhp > 0" class="flex justify-between text-toast-700">
                <span>Referral discount {{ REFERRAL_DISCOUNT_PERCENT }}%</span>
                <span class="font-semibold text-toast-900">-{{ formatPhp(referralDiscountPhp) }}</span>
              </div>
              <p v-else-if="referralDiscountEligible" class="text-[10px] text-toast-600 italic">
                Referral {{ REFERRAL_DISCOUNT_PERCENT }}% applies on this first event unless a promo is better.
              </p>
              <div class="flex justify-between font-bold text-toast-900 text-sm">
                <span>Amount due</span>
                <span class="text-toast-700 font-serif text-lg">{{ formatPhp(amountDuePhp) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="md:col-span-7">
          <PaymentCheckoutPanel v-if="isPaymongoActivated" :amount-due="amountDuePhp" :loading="isProcessing"
            @submit="submitPayment" />
          <PaymentProofPanel v-else ref="proofPanel" :amount-due="amountDuePhp" :loading="isProcessing"
            @submit="submitPayment" />
        </div>

      </div>

    </div>

    <!-- Edit Event Modal -->
    <UModal
      v-model:open="isEditModalOpen"
      :ui="{ content: 'max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl' }"
    >
      <template #content>
        <div class="p-5 sm:p-6 space-y-5 bg-white text-toast-900 max-h-[90vh] overflow-y-auto">
          <!-- Modal Header -->
          <div class="flex items-center justify-between border-b border-toast-200/60 pb-3">
            <div>
              <h3 class="text-xl font-serif font-bold text-toast-900">
                Edit Event & Package
              </h3>
              <p class="text-xs text-toast-600">
                Update your event details or choose a different package.
              </p>
            </div>
            <button
              type="button"
              class="text-toast-400 hover:text-toast-700 p-1.5 rounded-lg transition-colors cursor-pointer"
              aria-label="Close"
              @click="isEditModalOpen = false"
            >
              <UIcon name="i-lucide-x" class="size-5" />
            </button>
          </div>

          <div class="space-y-4">
            <!-- Package Selection (sans features list) -->
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-toast-700 uppercase tracking-wider block">
                Package Choice
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  v-for="pkg in packageChoices"
                  :key="pkg.id"
                  class="p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between"
                  :class="editForm.package === pkg.id
                    ? 'border-toast-600 bg-bread-400/25 ring-2 ring-toast-600/40 shadow-xs'
                    : 'border-toast-200/80 bg-white hover:border-toast-400 hover:bg-toast-50/50'"
                  @click="editForm.package = pkg.id"
                >
                  <div class="space-y-1">
                    <div class="flex items-center justify-between gap-1.5">
                      <span class="font-serif font-bold text-sm text-toast-900">{{ pkg.title }}</span>
                      <UIcon
                        v-if="editForm.package === pkg.id"
                        name="i-lucide-check-circle"
                        class="size-4 text-toast-600 shrink-0"
                      />
                    </div>
                    <p class="text-[11px] text-toast-700 leading-snug">{{ pkg.description }}</p>
                  </div>
                  <div class="pt-2 mt-2 border-t border-toast-200/60 flex items-baseline gap-1.5">
                    <span class="font-bold text-sm text-toast-900">{{ pkg.discount }}</span>
                    <span class="text-xs text-toast-400 line-through">{{ pkg.price }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Event Form Fields -->
            <UFormField label="Event Name" required>
              <UInput
                v-model="editForm.eventName"
                placeholder="e.g. Mark & Sarah's Wedding"
                size="md"
                class="w-full bg-white text-toast-900"
              />
            </UFormField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UFormField label="Event Type" required>
                <USelect
                  v-model="editForm.eventType"
                  :items="eventTypeOptions"
                  size="md"
                  class="w-full bg-white text-toast-900"
                />
              </UFormField>

              <UFormField label="Target Event Date" required>
                <UInput
                  v-model="editForm.eventDate"
                  type="date"
                  size="md"
                  :min="minEventDate"
                  class="w-full bg-white text-toast-900"
                />
              </UFormField>
            </div>

            <UCheckbox
              v-if="isEditWeddingEventType"
              v-model="editForm.isCatholicWedding"
              label="Is this a Catholic wedding?"
              class="text-toast-900"
            />

            <UFormField label="Venue / Location" required>
              <UInput
                v-model="editForm.venue"
                placeholder="e.g. Manila Cathedral / Grand Ballroom"
                size="md"
                class="w-full bg-white text-toast-900"
              />
            </UFormField>

            <UFormField label="Event Description" hint="Optional">
              <UTextarea
                v-model="editForm.description"
                placeholder="Brief description of your celebration (auto-filled if left blank)"
                :rows="2"
                size="md"
                class="w-full bg-white text-toast-900"
              />
            </UFormField>
          </div>

          <!-- Modal Footer -->
          <div class="flex justify-end gap-2.5 pt-3 border-t border-toast-200/60">
            <UButton
              variant="soft"
              color="neutral"
              size="md"
              class="cursor-pointer"
              @click="isEditModalOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              size="md"
              class="font-bold text-white bg-toast-600 hover:bg-toast-700 shadow-xs cursor-pointer"
              @click="saveEventDetails"
            >
              Save Changes
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
