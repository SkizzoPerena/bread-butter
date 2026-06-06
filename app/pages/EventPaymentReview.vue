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
import { usePayments } from '~/composables/usePayments'
import { useEvents } from '~/composables/useEvents'

definePageMeta({
  layout: 'eventsubnavbar',
  bgClass: 'bg-teal-50',
  useBlackLogo: true
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
          latestPayment: null,
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

    <UContainer class="py-8 max-w-3xl">
      <USkeleton v-if="isLoadingEvent" class="h-64 w-full" />
      <UPageCard
        v-else-if="showPaymentSection"
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
              class="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-white"
              @change="onProofOfPaymentChange"
            >
            <p v-if="proofOfPaymentFile" class="mt-1 text-xs text-muted">
              Selected: {{ proofOfPaymentFile.name }}
            </p>
          </UFormField>

          <div class="flex justify-end">
            <UButton
              type="submit"
              label="Submit payment proof"
              icon="i-lucide-upload"
              color="primary"
              :loading="isSubmittingPayment"
            />
          </div>
        </UForm>
      </UPageCard>

      <UPageCard
        v-else-if="eventRecord"
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
    </UContainer>

</template>