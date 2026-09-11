<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useEvents } from '~/composables/useEvents'
import { usePriceTiers, PACKAGE_SLUG_TO_TIER_CODE } from '~/composables/usePriceTiers'
import { useAccount } from '~/composables/useAccount'
import { useVouchers } from '~/composables/useVouchers'
import { getApiErrorMessage, reportApiError } from '~/types/auth'
import { hasVoucherCode, normalizeVoucherCode } from '~/utils/referralCode'
import {
  REFERRAL_DISCOUNT_PERCENT,
  PROMO_DISCOUNT_PERCENT,
  percentOf,
} from '~/utils/pricing'
import PaymentCheckoutPanel from '~/components/PaymentCheckoutPanel.vue'

definePageMeta({
  layout: 'signed-in-navbar',
})

useHead({
  title: 'Payment - Bread + Butter',
})

const route = useRoute()
const toast = useToast()
const { createEvent } = useEvents()
const { resolvePriceTierId, fetchAvailablePriceTiers } = usePriceTiers()
const { fetchAccount } = useAccount()
const { validateVoucherForUser } = useVouchers()
const { createEventFeeCheckoutSession } = usePayments()
const { isUiOnlyMode } = useApiMode()
const { getOrCreateIdempotencyKey, rememberCheckoutIds, redirectToCheckout } = usePayMongoCheckout()

const selectedPkgId = computed(() => (typeof route.query.package === 'string' ? route.query.package : 'bread-butter'))
const isBreadButterPackage = computed(() => selectedPkgId.value === 'bread-butter')

const eventName = computed(() => (typeof route.query.eventName === 'string' ? route.query.eventName : ''))
const eventType = computed(() => (typeof route.query.eventType === 'string' ? route.query.eventType : 'WEDDING'))
const eventDate = computed(() => (typeof route.query.eventDate === 'string' ? route.query.eventDate : ''))
const venue = computed(() => (typeof route.query.venue === 'string' ? route.query.venue : ''))
const isCatholicWedding = computed(() => {
  const raw = route.query.isCatholicWedding
  const value = Array.isArray(raw) ? raw[0] : raw
  const flagged = value === 'true' || value === '1'
  return String(eventType.value || '').trim().toUpperCase() === 'WEDDING' && flagged
})
const description = computed(() => {
  if (typeof route.query.description === 'string' && route.query.description.trim()) {
    return route.query.description.trim()
  }
  const name = eventName.value.trim()
  const loc = venue.value.trim()
  if (name && loc) return `${name} at ${loc}`
  if (name) return `${name} celebration`
  return 'Event celebration'
})

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
  try {
    const [account, tiers] = await Promise.all([
      fetchAccount(),
      fetchAvailablePriceTiers()
    ])
    referralDiscountEligible.value = account.referralDiscountEligible === true

    const tierCode = PACKAGE_SLUG_TO_TIER_CODE[selectedPkgId.value]
    const match = tiers.find(tier => tier.code === tierCode && tier.isEnabled !== false)
    if (typeof match?.pricePhp === 'number' && match.pricePhp > 0) {
      tierBaseFeePhp.value = match.pricePhp
    }
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

  isProcessing.value = true

  try {
    if (isUiOnlyMode.value) {
      await navigateTo({
        path: '/user/payment/success',
        query: {
          payment_id: 'mock-payment-id',
          checkout_id: 'cs_mock',
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
    const created = await createEvent({
      eventType: eventType.value,
      eventName: eventName.value.trim(),
      description: description.value,
      venue: venue.value.trim(),
      eventDate: eventDate.value,
      isCatholicWedding: isCatholicWedding.value,
      priceTierId,
      payLater: true,
      ...(normalizedVoucher ? { voucherCode: normalizedVoucher } : {}),
    })

    const eventId = created._id
    if (amountDuePhp.value <= 0) {
      toast.add({
        title: 'Event created',
        description: 'There is no remaining balance to collect.',
        color: 'success',
      })
      await navigateTo({ path: '/user/event-dashboard', query: { eventId } })
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
      title: 'Could not start checkout',
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
          Review your order, then continue to PayMongo to complete payment.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">

        <!-- Left Side: Order Summary Card -->
        <div class="bread-container bg-bread-400 text-toast-900 p-4 sm:p-5 md:col-span-5 space-y-4">
          <h2 class="text-lg font-bold font-serif text-toast-800 border-b border-toast-600/20 pb-2">
            Order Summary
          </h2>

          <div class="space-y-3">
            <div>
              <span class="text-[10px] text-toast-600 font-bold uppercase tracking-wider">Event Name</span>
              <p class="font-bold text-toast-900 text-sm truncate">{{ eventName }}</p>
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
              <UInput
                v-model="voucherCode"
                placeholder="Enter voucher code"
                size="sm"
                class="w-full uppercase bg-white text-toast-900"
              />
              <p
                v-if="voucherMessage"
                class="text-[10px] leading-snug"
                :class="{
                  'text-toast-700': voucherStatus === 'checking' || voucherStatus === 'idle',
                  'text-green-800': voucherStatus === 'valid',
                  'text-red-700': voucherStatus === 'invalid'
                }"
              >
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
              <div
                v-if="promoApplies"
                class="flex justify-between text-green-800"
              >
                <span>Partner promo {{ PROMO_DISCOUNT_PERCENT }}% ({{ voucherCode }})</span>
                <span class="font-semibold">-{{ formatPhp(voucherDiscountPhp) }}</span>
              </div>
              <div v-else-if="referralDiscountPhp > 0" class="flex justify-between text-toast-700">
                <span>Referral discount {{ REFERRAL_DISCOUNT_PERCENT }}%</span>
                <span class="font-semibold text-toast-900">-{{ formatPhp(referralDiscountPhp) }}</span>
              </div>
              <p
                v-else-if="referralDiscountEligible"
                class="text-[10px] text-toast-600 italic"
              >
                Referral {{ REFERRAL_DISCOUNT_PERCENT }}% applies on this first event unless a promo is better.
              </p>
              <div class="flex justify-between font-bold text-toast-900 text-sm">
                <span>Amount due</span>
                <span class="text-toast-700 font-serif text-lg">{{ formatPhp(amountDuePhp) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side: PayMongo checkout -->
        <div class="md:col-span-7">
          <PaymentCheckoutPanel
            :amount-due="amountDuePhp"
            :loading="isProcessing"
            @submit="submitPayment"
          />
        </div>

      </div>

    </div>
  </div>
</template>

