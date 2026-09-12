<script setup lang="ts">
import { formatPaymentPurpose } from '~/types/payment'
import { reportApiError } from '~/types/auth'
import { formatPhp } from '~/utils/tierUpgradeFeatures'

definePageMeta({
  layout: 'signed-in-navbar',
})

useHead({
  title: 'Payment Success - Bread + Butter',
})

const route = useRoute()
const toast = useToast()
const { getCheckoutStatus } = usePayments()
const { isUiOnlyMode } = useApiMode()
const { readRememberedCheckoutIds, clearIdempotencyKey } = usePayMongoCheckout()

const status = ref<'loading' | 'approved' | 'processing' | 'error'>('loading')
const eventName = ref('')
const amount = ref<number | null>(null)
const purpose = ref('Payment')
const paymentId = ref('')
const eventId = ref('')
const paymentType = ref('')

const checkoutLookupId = computed(() => {
  const fromQuery = typeof route.query.checkout_id === 'string' ? route.query.checkout_id.trim() : ''
  const paymentFromQuery = typeof route.query.payment_id === 'string' ? route.query.payment_id.trim() : ''
  const remembered = readRememberedCheckoutIds()
  return fromQuery || paymentFromQuery || remembered.checkoutId || remembered.paymentId
})

const dashboardQuery = computed(() => (eventId.value ? { eventId: eventId.value } : undefined))

function dashboardPathForType() {
  if (paymentType.value === 'EMAIL_CREDIT_PURCHASE') {
    return '/event/guests'
  }
  if (paymentType.value === 'TIER_UPGRADE') {
    return '/event/upgrade'
  }
  return '/user/event-dashboard'
}

async function pollCheckout() {
  const id = checkoutLookupId.value
  if (!id) {
    status.value = 'error'
    return
  }

  const maxAttempts = isUiOnlyMode.value ? 1 : 8
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await getCheckoutStatus(id)
      const payment = response.payment
      if (payment) {
        paymentId.value = payment._id
        amount.value = typeof payment.amountReceived === 'number' ? payment.amountReceived : payment.amount
        purpose.value = formatPaymentPurpose(payment)
        paymentType.value = payment.type
        const eventRef = payment.event
        if (eventRef && typeof eventRef === 'object' && '_id' in eventRef) {
          eventId.value = eventRef._id
          eventName.value = eventRef.eventName || response.eventName || ''
        } else if (typeof eventRef === 'string') {
          eventId.value = eventRef
        }
      }
      if (response.eventId) {
        eventId.value = String(response.eventId)
      }
      if (response.eventName && !eventName.value) {
        eventName.value = response.eventName
      }

      if (payment?.status === 'APPROVED') {
        status.value = 'approved'
        clearIdempotencyKey(`event-fee:${eventId.value}`)
        return
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        reportApiError(toast, { title: 'Could not confirm payment', error })
        status.value = 'error'
        return
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  status.value = 'processing'
}

onMounted(() => {
  void pollCheckout()
})
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-4 pt-24 sm:pt-28 pb-10 bg-toast-700 text-white">
    <UCard
      class="w-full max-w-sm sm:max-w-md mx-auto bread-container bg-bread-400 text-black shadow-lg rounded-xl"
      :ui="{ body: 'p-4 sm:p-5 flex flex-col items-center space-y-3.5 text-center w-full' }"
    >
      <div class="space-y-2 flex flex-col items-center justify-center">
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center"
          :class="status === 'approved' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-toast-500/10 text-toast-600'"
        >
          <UIcon
            :name="status === 'approved' ? 'i-lucide-check' : status === 'error' ? 'i-lucide-circle-alert' : 'i-lucide-clock'"
            class="w-7 h-7"
            :class="status === 'loading' ? 'animate-pulse' : ''"
          />
        </div>
        <UBadge
          :color="status === 'approved' ? 'success' : status === 'error' ? 'error' : 'warning'"
          variant="solid"
          size="sm"
          class="px-3 py-0.5 font-semibold rounded-full text-xs"
        >
          {{ status === 'approved' ? 'Payment successful' : status === 'error' ? 'Could not confirm' : 'Payment is processing' }}
        </UBadge>
      </div>

      <div class="space-y-1 text-center">
        <h1 class="text-xl sm:text-2xl font-bold font-serif text-toast-900">
          {{ status === 'approved' ? 'You’re all set!' : 'We’re confirming your payment' }}
        </h1>
        <p class="text-xs text-toast-800 max-w-xs mx-auto">
          {{
            status === 'approved'
              ? 'Your PayMongo payment went through and your event features will activate automatically.'
              : 'This usually takes a few seconds. You can keep this page open or head to your dashboard.'
          }}
        </p>
      </div>

      <div class="w-full bg-white/80 p-3.5 rounded-xl border border-toast-600/20 text-left space-y-2 text-xs">
        <div class="flex justify-between items-center border-b border-toast-600/10 pb-1.5">
          <span class="text-toast-700 font-medium">Purpose</span>
          <span class="font-bold text-toast-900">{{ purpose }}</span>
        </div>
        <div class="flex justify-between items-center border-b border-toast-600/10 pb-1.5">
          <span class="text-toast-700 font-medium">Event</span>
          <span class="font-bold text-toast-900">{{ eventName || '—' }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-toast-700 font-medium">Amount</span>
          <span class="font-bold text-toast-900">{{ amount != null ? formatPhp(amount) : '—' }}</span>
        </div>
      </div>

      <UButton
        :to="{ path: dashboardPathForType(), query: dashboardQuery }"
        block
        color="primary"
        size="md"
        class="font-bold text-white bg-toast-600 hover:bg-toast-700 shadow-md"
      >
        {{ status === 'approved' ? 'Continue' : 'Go to dashboard' }}
      </UButton>
    </UCard>
  </div>
</template>
