<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getApiErrorMessage } from '~/types/auth'
import { clearUiPendingSeatingPayment } from '~/utils/paymentPendingGuard'

definePageMeta({ layout: 'jam-landing-navbar', hideFooter: true, middleware: 'seating-enabled' })
useHead({ title: 'Jam Payment Successful - Bread + Butter' })

const route = useRoute()
const { getCheckoutStatus, getGathering } = useSeating()
const { isUiOnlyMode } = useApiMode()
const { followLink, finishPageTransition } = usePageTransition()

const status = ref<'loading' | 'approved' | 'processing' | 'error'>('loading')
const gatheringName = ref('')
const gatheringId = ref('')
const packageName = ref('')
const amount = ref<number | null>(null)
const isUpgrade = computed(() => String(route.query.upgrade || '') === '1')

const badgeText = computed(() => {
  if (status.value === 'approved') return 'Payment successful'
  if (status.value === 'error') return 'Could not confirm'
  return 'Payment is processing'
})

const headingText = computed(() => {
  if (status.value === 'approved') {
    return isUpgrade.value ? 'Your plan is upgraded!' : 'You’re all set!'
  }
  return 'We’re confirming your payment'
})

const subtitleText = computed(() => {
  if (status.value === 'approved') {
    return 'Your payment went through and your Jam seating plan is ready.'
  }
  return 'This usually takes a few seconds. You can keep this page open or proceed to your plan.'
})

onMounted(async () => {
  gatheringId.value = String(route.query.gatheringId || '')
  const checkoutId = String(route.query.checkout_id || route.query.checkoutId || route.query.payment_id || '')
  try {
    if (gatheringId.value) {
      const gathering = await getGathering(gatheringId.value).catch(() => null)
      if (gathering) {
        if (isUiOnlyMode.value) {
          gathering.status = 'ACTIVE'
          if (gathering.payment) {
            gathering.payment.status = 'APPROVED'
            gathering.payment.amountReceived = gathering.pricePhp
          }
        }
        gatheringName.value = gathering.name
        packageName.value = gathering.packageName
        amount.value = gathering.pricePhp
        if (gathering.status === 'ACTIVE' || gathering.payment?.status === 'APPROVED') {
          status.value = 'approved'
          clearUiPendingSeatingPayment()
          return
        }
      }
    }

    if (!checkoutId) {
      status.value = gatheringId.value ? 'processing' : 'error'
      return
    }

    const result = await getCheckoutStatus(checkoutId)
    gatheringName.value = result.gatheringName || gatheringName.value
    gatheringId.value = String(result.gatheringId || gatheringId.value)
    if (result.payment) {
      amount.value = typeof result.payment.amountReceived === 'number' ? result.payment.amountReceived : result.payment.amount
    }
    const isApproved = result.payment?.status === 'APPROVED' || result.alreadyPaid
    status.value = isApproved ? 'approved' : 'processing'
    if (isApproved) {
      clearUiPendingSeatingPayment()
    }
  } catch (error) {
    status.value = 'error'
    useToast().add({ title: 'Could not confirm payment', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    finishPageTransition()
  }
})
</script>

<template>
  <div
    class="min-h-screen pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 flex flex-col items-center justify-center bg-jam-800 text-white">
    <div class="w-full max-w-sm sm:max-w-md mx-auto">
      <UCard class="w-full bread-container bg-bread-400 text-black shadow-lg rounded-xl"
        :ui="{ body: 'p-4 sm:p-5 flex flex-col items-center space-y-3.5 text-center w-full' }">
        <!-- Status Icon & Badge -->
        <div class="space-y-2 flex flex-col items-center justify-center">
          <div class="w-12 h-12 rounded-full flex items-center justify-center"
            :class="status === 'approved' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-jam-900/10 text-jam-800'">
            <UIcon
              :name="status === 'approved' ? 'i-lucide-check' : status === 'error' ? 'i-lucide-circle-alert' : 'i-lucide-clock'"
              class="w-7 h-7" :class="status === 'loading' ? 'animate-pulse' : ''" />
          </div>
          <UBadge :color="status === 'approved' ? 'success' : status === 'error' ? 'error' : 'warning'" variant="solid"
            size="sm" class="px-3 py-0.5 font-semibold rounded-full text-xs">
            {{ badgeText }}
          </UBadge>
        </div>

        <!-- Heading -->
        <div class="space-y-1 text-center">
          <h1 class="text-xl sm:text-2xl font-bold font-serif text-jam-900">
            {{ headingText }}
          </h1>
          <p class="text-xs text-jam-800 max-w-xs mx-auto">
            {{ subtitleText }}
          </p>
        </div>

        <!-- Transaction Details Box -->
        <div class="w-full bg-white/80 p-3.5 rounded-xl border border-jam-700/20 text-left space-y-2 text-xs">
          <div class="flex justify-between items-center border-b border-jam-700/10 pb-1.5">
            <span class="text-jam-700 font-medium">Purpose</span>
            <span class="font-bold text-jam-950">{{ isUpgrade ? 'Jam Tier Upgrade' : 'Jam Seating Plan' }}</span>
          </div>
          <div class="flex justify-between items-center border-b border-jam-700/10 pb-1.5">
            <span class="text-jam-700 font-medium">Gathering</span>
            <span class="font-bold text-jam-950 truncate max-w-45">{{ gatheringName || '—' }}</span>
          </div>
          <div v-if="packageName" class="flex justify-between items-center border-b border-jam-700/10 pb-1.5">
            <span class="text-jam-700 font-medium">Package Tier</span>
            <span class="font-bold text-jam-950">{{ packageName }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-jam-700 font-medium">Amount</span>
            <span class="font-bold text-jam-950">{{ amount != null ? `₱${amount.toLocaleString()}` : '—' }}</span>
          </div>
        </div>

        <!-- Primary Action -->
        <UButton v-if="status === 'approved' && gatheringId" :to="`/jam/dashboard/${gatheringId}`" block color="primary"
          size="md" class="font-bold text-white bg-jam-900 hover:bg-jam-950 shadow-md cursor-pointer"
          @click="followLink($event, `/jam/dashboard/${gatheringId}`)">
          Open seating plan
        </UButton>
        <UButton v-else-if="status === 'error'" :to="'/user/seating-payment'" block color="neutral" variant="outline"
          size="md" class="font-semibold text-jam-900">
          Back to payment
        </UButton>
        <UButton v-else to="/" block color="neutral" variant="outline" size="md" class="font-semibold text-jam-900">
          Back to home
        </UButton>
      </UCard>
    </div>
  </div>
</template>
