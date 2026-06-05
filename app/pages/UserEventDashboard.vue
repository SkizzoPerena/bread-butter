<script lang="ts" setup>
import { DateFormatter } from '@internationalized/date'
import type { EventRecord, TasksSummary } from '~/types/event'
import {
  EVENT_CREATION_FEE_PHP,
  getEventBalanceDue,
  isEventFullyPaid,
  isPaymentPendingReview,
  needsPaymentSubmission
} from '~/types/payment'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { usePayments } from '~/composables/usePayments'
import { getTaskTrackerMetrics } from '~/utils/taskListUpdates'
import { defaultCover, resolveEventCoverImageUrl } from '~/utils/eventImage'
import demoCoverImage from '~/assets/bpb-images/wedding-1.jpg'

const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
})

definePageMeta({
  layout: 'event-navbar',
})

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { submitEventPaymentProof } = usePayments()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const tasksSummary = ref<TasksSummary | null>(null)
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

const useDemoFallbacks = computed(() => !eventId.value || isUiOnlyMode.value)

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')

const eventTitle = computed(() => {
  if (eventRecord.value?.eventName) {
    return eventRecord.value.eventName
  }
  if (eventId.value && isLoadingEvent.value) {
    return ''
  }
  if (useDemoFallbacks.value) {
    return "Jane & John's Wedding"
  }
  return ''
})

const eventVenue = computed(() => {
  if (eventRecord.value?.venue) {
    return eventRecord.value.venue
  }
  if (eventId.value && isLoadingEvent.value) {
    return ''
  }
  if (useDemoFallbacks.value) {
    return 'Manila Cathedral'
  }
  return ''
})

const eventDateLabel = computed(() => {
  const dateValue = eventRecord.value?.eventDate
  if (dateValue) {
    return df.format(new Date(dateValue))
  }
  if (eventId.value && isLoadingEvent.value) {
    return ''
  }
  if (useDemoFallbacks.value) {
    return 'May 18, 2026'
  }
  return ''
})

const eventCoverUrl = computed(() => {
  if (eventRecord.value?.coverImageURL) {
    return resolveEventCoverImageUrl(eventRecord.value.coverImageURL)
  }
  if (useDemoFallbacks.value) {
    return demoCoverImage
  }
  return null
})

const taskTracker = computed(() => {
  if (tasksSummary.value) {
    const { ongoing, completed, activeTotal } = getTaskTrackerMetrics(tasksSummary.value.byStatus)
    if (activeTotal === 0) {
      return { label: 'No Tasks Yet', percent: 0, isEmpty: true }
    }
    return {
      label: `${completed} / ${activeTotal}`,
      percent: Math.round((completed / activeTotal) * 100),
      isEmpty: false,
    }
  }
  if (useDemoFallbacks.value) {
    return { label: '2 / 4', percent: 50, isEmpty: false }
  }
  return { label: 'No Tasks Yet', percent: 0, isEmpty: true }
})

const DEMO_TASK_BUDGET_TOTAL = 20000 + 15000 + 10000 + 5000 + 30000 + 8000 + 100000 + 200000 + 0 + 12000

function formatPesoAmount(amount: number): string {
  return `${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pesos`
}

const currentBudgetLabel = computed(() => {
  if (tasksSummary.value) {
    if (tasksSummary.value.totalTasks === 0 || tasksSummary.value.totalAllocatedBudget === 0) {
      return 'No Budget Yet'
    }
    return formatPesoAmount(tasksSummary.value.totalAllocatedBudget)
  }
  if (useDemoFallbacks.value) {
    return formatPesoAmount(DEMO_TASK_BUDGET_TOTAL)
  }
  return 'No Budget Yet'
})

function onCoverImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = defaultCover
}

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    return
  }

  isLoadingEvent.value = true
  eventRecord.value = null
  tasksSummary.value = null
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
        },
        guestList: [],
        rsvpSummary: null,
        tasks: {
          totalTasks: 3,
          totalAllocatedBudget: 45000,
          byStatus: { ONGOING: 2, COMPLETED: 1 },
          preview: {
            page: 1,
            limit: 5,
            subtasksLimit: 2,
            tasks: [
              {
                _id: 'mock-task-1',
                title: 'Book a photo booth',
                details: 'Find and book a photo booth service for the reception.',
                budget: 20000,
                status: 'ONGOING',
                priority: 1,
                deadline: '2026-06-15T00:00:00.000Z',
              },
              {
                _id: 'mock-task-2',
                title: 'Finalize catering menu',
                details: 'Confirm final menu choices with the caterer.',
                budget: 15000,
                status: 'ONGOING',
                priority: 3,
                deadline: '2026-07-01T00:00:00.000Z',
              },
              {
                _id: 'mock-task-3',
                title: 'Send wedding invitations',
                details: 'Design, print, and mail invitations.',
                budget: 10000,
                status: 'COMPLETED',
                priority: 2,
                deadline: '2026-05-01T00:00:00.000Z',
              },
            ],
          },
        },
      }),
      fetch: async () => fetchEvent(eventId.value),
    })
    eventRecord.value = detail.event
    setActiveEvent(detail.event)
    tasksSummary.value = detail.tasks
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
  }
}

function onProofOfPaymentChange(changeEvent: Event) {
  const input = changeEvent.target as HTMLInputElement
  proofOfPaymentFile.value = input.files?.[0] ?? null
}

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

onMounted(() => {
  loadEventData()
})

watch(eventId, () => {
  loadEventData()
})

function openWebsiteMaker() {
  if (isEventCancelled.value) {
    return
  }
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/WebsiteMaker', query: { eventId: id } })
}

function openGuestList() {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/EventGuestsDashboard', query: { eventId: id } })
}

function openTasksDashboard() {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/EventTasksDashboard', query: { eventId: id } })
}

function openEventSettings() {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/EventSettingsDashboard', query: { eventId: id } })
}

type DashboardItem = {
  label: string
  icon: string
  action?: 'website' | 'guestList' | 'tasks' | 'settings'
}

function handleDashboardItemClick(item: DashboardItem) {
  if (item.action === 'website') {
    openWebsiteMaker()
  } else if (item.action === 'guestList') {
    openGuestList()
  } else if (item.action === 'tasks') {
    openTasksDashboard()
  } else if (item.action === 'settings') {
    openEventSettings()
  }
}

function handleDashboardItemKeydown(event: KeyboardEvent, item: DashboardItem) {
  if (event.key === 'Enter') {
    handleDashboardItemClick(item)
  }
}

const dashboardItems: DashboardItem[] = [
  { label: 'Website', icon: 'i-lucide-globe', action: 'website' },
  { label: 'RSVP', icon: 'i-lucide-mail' },
  { label: 'Invitations', icon: 'i-lucide-send' },
  { label: 'Guest List', icon: 'i-lucide-users', action: 'guestList' },
  { label: 'Schedules', icon: 'i-lucide-calendar' },
  { label: 'Photos', icon: 'i-lucide-camera' },
  { label: 'Stationery', icon: 'i-lucide-pen-tool' },
  { label: 'Settings', icon: 'i-lucide-settings', action: 'settings' },
  { label: 'Tasks', icon: 'i-lucide-list-todo', action: 'tasks' },
]

</script>

<template>
  <UMain class="">

    <UPageGrid>
      <UContainer class="col-span-2 space-y-6">

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

<div class="flex items-center justify-center h-full">
        <UPageColumns :ui="{base: 'gap-25 space-y-3'}">
          
          <div
            v-for="item in dashboardItems"
            :key="item.label"
            role="button"
            tabindex="0"
            class="group flex flex-col items-center justify-center aspect-square w-fit h-fit p-4 cursor-pointer rounded-xl focus-visible:outline-none"
            :class="{
              'opacity-50 pointer-events-none':
                item.action === 'website' && (isEventCancelled || (!eventId && !isUiOnlyMode)),
            }"
            @click="handleDashboardItemClick(item)"
            @keydown.enter="handleDashboardItemKeydown($event, item)"
          >
            <div
              class=" p-2 aspect-square flex flex-col  items-center justify-center rounded-full bg-primary transition-all duration-200 group-hover:bg-primary/80 group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-primary">
              <UIcon :name="item.icon" class="size-9 m-2 text-white" />
            </div>
            <div class="font-medium mt-3">{{ item.label }}</div>
          </div>
        </UPageColumns>
</div>
      </UContainer>

      <!-- Tasks Container -->
      <UScrollArea class="h-[calc(100vh-64px)] py-6">
        <UContainer class="space-y-4">
          <EventTaskChecklistSidebar
            :event-id="eventId || (isUiOnlyMode ? 'mock-event-id' : '')"
            :event-record="eventRecord"
            :tasks-summary="tasksSummary"
            :is-event-cancelled="isEventCancelled"
            :is-loading="isLoadingEvent"
            @refresh="loadEventData"
            @update:tasks-summary="tasksSummary = $event"
          />
        </UContainer>
      </UScrollArea>
    </UPageGrid>
  </UMain>

</template>

<style></style>
