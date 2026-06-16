<script lang="ts" setup>
import type { EventRecord } from '~/types/event'
import {
  EVENT_CREATION_FEE_PHP,
  getEventBalanceDue,
  isEventFullyPaid,
  isPaymentPendingReview,
  needsPaymentSubmission
} from '~/types/payment'
import { reportApiError } from '~/types/auth'
import demoCoverImage from '~/assets/bpb-images/wedding-1.jpg'
import { useEvents } from '~/composables/useEvents'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Payments',
  bgClass: 'bg-emerald-50',
})

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { submitEventPaymentProof } = usePayments()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const isLoadingEvent = ref(false)
const isSubmittingPayment = ref(false)

const paymentForm = reactive({
  transactionId: '',
})
const proofOfPaymentFile = ref<File | null>(null)
const proofOfPaymentInput = ref<HTMLInputElement | null>(null)

const showPaymentProofForm = computed(() =>
  eventRecord.value ? needsPaymentSubmission(eventRecord.value) : false
)

const paymentPendingReview = computed(() =>
  eventRecord.value ? isPaymentPendingReview(eventRecord.value.latestPayment) : false
)

const isEventPaidInFull = computed(() =>
  eventRecord.value ? isEventFullyPaid(eventRecord.value) : false
)

const paymentBalanceDue = computed(() =>
  eventRecord.value ? getEventBalanceDue(eventRecord.value) : EVENT_CREATION_FEE_PHP
)

const showPaymentSection = computed(() =>
  Boolean(eventRecord.value) && !isEventPaidInFull.value
)

const paymentDenialReason = computed(() =>
  eventRecord.value?.latestPayment?.status === 'DENIED'
    ? eventRecord.value.latestPayment.denialReason
    : ''
)

const submittedPayments = computed(() => {
  if (!eventRecord.value?.latestPayment) return []
  return [eventRecord.value.latestPayment]
})

function onProofOfPaymentChange(changeEvent: Event) {
  const input = changeEvent.target as HTMLInputElement
  proofOfPaymentFile.value = input.files?.[0] ?? null
}

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    return
  }

  isLoadingEvent.value = true
  try {
    const detail = await loadPageData({
      mock: () => ({
        event: {
          _id: 'mock-event-id',
          eventType: 'WEDDING',
          eventName: "Jane & John's Wedding",
          description: 'Mock event',
          venue: 'Manila Cathedral',
          eventDate: '2026-05-18T00:00:00.000Z',
          status: 'ONGOING',
          coverImageURL: null,
          latestPayment: {
            _id: 'mock-payment-id',
            type: 'EVENT_CREATION_FEE',
            amount: 10000,
            transactionId: 'GCASH-123456',
            proofOfPaymentURL: demoCoverImage,
            status: 'PENDING',
          },
        } as EventRecord
      }),
      fetch: async () => fetchEvent(eventId.value),
    })
    eventRecord.value = detail.event
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
  }
}

onMounted(() => {
  loadEventData()
})

watch(eventId, () => {
  loadEventData()
})

async function handleSubmitPaymentProof() {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({ title: 'Missing event', description: 'Open an event from your dashboard first.', color: 'error' })
    return
  }
  if (!paymentForm.transactionId.trim()) {
    toast.add({ title: 'Transaction ID required', color: 'error' })
    return
  }
  if (!proofOfPaymentFile.value) {
    toast.add({ title: 'Proof of payment required', color: 'error' })
    return
  }

  isSubmittingPayment.value = true
  try {
    const updatedEvent = await submitEventPaymentProof(eventId.value || 'mock-event-id', {
      transactionId: paymentForm.transactionId.trim(),
      proofOfPayment: proofOfPaymentFile.value,
    })
    
    if (eventRecord.value) {
      eventRecord.value = {
        ...eventRecord.value,
        latestPayment: updatedEvent.latestPayment ?? null,
        paymentSummary: updatedEvent.paymentSummary ?? eventRecord.value.paymentSummary,
      }
    } else {
      eventRecord.value = updatedEvent
    }

    paymentForm.transactionId = ''
    proofOfPaymentFile.value = null
    toast.add({
      title: 'Payment proof submitted',
      description: 'An admin will review your payment shortly.',
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not submit payment proof', error })
  } finally {
    isSubmittingPayment.value = false
  }
}
</script>

<template>
  <UContainer class="space-y-6 py-8 pb-12">
    <div
      v-if="isLoadingEvent"
      class="flex items-center justify-center py-16 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading event...</span>
    </div>
    
    <div v-else-if="eventRecord" class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      <!-- First Column: Form / Status -->
      <div class="col-span-1 flex flex-col gap-4">
        <UPageCard
          v-if="showPaymentSection"
          class="white-bread-container"
          title="Settle event payment"
          :description="`Outstanding balance: Php ${paymentBalanceDue.toLocaleString()}`"
        >
          <div v-if="paymentPendingReview" class="space-y-2">
            <UBadge color="warning" variant="soft" label="Pending review" />
            <p class="text-sm text-muted">
              Your payment is awaiting admin review. Once it's approved you can publish
              your website. If the approved amount is less than the fee, a remaining
              balance will appear here for you to settle.
            </p>
          </div>

          <UForm
            v-else
            :state="paymentForm"
            class="space-y-4"
            @submit.prevent="handleSubmitPaymentProof"
          >
            <UAlert
              v-if="paymentDenialReason"
              color="error"
              variant="soft"
              icon="i-lucide-circle-alert"
              title="Previous payment was denied"
              :description="paymentDenialReason"
            />

            <p class="text-sm text-muted">
              Amount to pay now:
              <span class="font-semibold text-default">Php {{ paymentBalanceDue.toLocaleString() }}</span>.
              Upload your proof of payment and reference number, then an admin will
              verify it.
            </p>

            <UFormField label="Transaction / reference ID" name="transactionId" required>
              <UInput
                v-model="paymentForm.transactionId"
                class="w-full"
                placeholder="e.g. GCash or bank reference number"
              />
            </UFormField>

            <UFormField label="Proof of payment" name="proofOfPayment" required>
              <input
                ref="proofOfPaymentInput"
                type="file"
                accept="image/*"
                class="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-white"
                @change="onProofOfPaymentChange"
              >
              <p v-if="proofOfPaymentFile" class="mt-1 text-xs text-muted">
                Selected: {{ proofOfPaymentFile.name }}
              </p>
            </UFormField>

            <UButton
              type="submit"
              block
              class="mt-2"
              label="Submit payment proof"
              icon="i-lucide-upload"
              color="emerald"
              :loading="isSubmittingPayment"
            />
          </UForm>
        </UPageCard>

        <UPageCard
          v-else
          class="white-bread-container"
        >
          <UAlert
            color="success"
            variant="soft"
            icon="i-lucide-check-circle-2"
            title="Event is fully paid"
            description="Your event has no outstanding balance."
          />
        </UPageCard>
      </div>

      <!-- Next 2 Columns: Submitted Payments -->
      <div class="md:col-span-2">
        <div v-if="submittedPayments.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UPageCard
            v-for="(payment, index) in submittedPayments"
            :key="index"
            class="white-bread-container relative group"
            :ui="{ body: 'p-4 sm:p-4' }"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-medium truncate text-default">Ref: {{ payment.transactionId || 'N/A' }}</div>
                <div class="text-sm text-muted mt-1">
                  <UBadge :color="payment.status === 'APPROVED' ? 'success' : payment.status === 'DENIED' ? 'error' : 'warning'" variant="subtle">
                    {{ payment.status || 'PENDING' }}
                  </UBadge>
                </div>
                <div v-if="payment.denialReason" class="text-xs text-error mt-2">
                  Reason: {{ payment.denialReason }}
                </div>
                <PaymentProofPreview
                  :url="payment.proofOfPaymentURL"
                  :label="`Ref: ${payment.transactionId || 'N/A'}`"
                />
              </div>
              <UIcon name="i-lucide-receipt" class="size-5 bg-emerald-500 opacity-50" />
            </div>
          </UPageCard>
        </div>
        
        <div
          v-else
          class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center h-full min-h-[200px]"
        >
          <UIcon name="i-lucide-receipt" class="size-10 text-muted" />
          <p class="mt-4 text-sm font-medium">No payments submitted</p>
          <p class="mt-1 text-sm text-muted">Upload your proof of payment to see it here.</p>
        </div>
      </div>
    </div>
  </UContainer>
</template>