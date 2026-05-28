<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date'
import type { EventRecord, GuestRecord, RsvpSummary, TaskPreview, TasksSummary } from '~/types/event'
import {
  isPaymentPendingReview,
  needsPaymentSubmission
} from '~/types/payment'
import { getApiErrorMessage, reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { useGuests } from '~/composables/useGuests'
import { usePayments } from '~/composables/usePayments'
import {
  appendGuestToList,
  applySendAllInvitesToGuestList,
  applySendInviteToGuestList,
  formatGuestValidationErrors,
  removeGuestFromList
} from '~/utils/guestListUpdates'
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
const { fetchEvent, updateEvent } = useEvents()
const { createGuest, fetchGuestsByEvent, sendGuestInvite, sendAllGuestInvites, deleteGuest } = useGuests()
const { submitEventPaymentProof } = usePayments()
const { isUiOnlyMode, loadPageData } = useApiMode()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const guestList = ref<GuestRecord[]>([])
const rsvpSummary = ref<RsvpSummary | null>(null)
const tasksSummary = ref<TasksSummary | null>(null)
const isLoadingEvent = ref(false)
const isSubmittingPayment = ref(false)
const isEditModalOpen = ref(false)
const isSubmittingEventUpdate = ref(false)
const isAddGuestModalOpen = ref(false)
const isSubmittingGuest = ref(false)
const sendingGuestId = ref<string | null>(null)
const isInvitingAll = ref(false)
const deletingGuestId = ref<string | null>(null)
const isRemoveGuestModalOpen = ref(false)
const guestToRemove = ref<Person | null>(null)

const editForm = reactive({
  eventName: '',
  description: '',
  venue: '',
})
const editCoverImageFile = ref<File | null>(null)
const editCoverImageInput = ref<HTMLInputElement | null>(null)

const paymentForm = reactive({
  transactionId: '',
})
const proofOfPaymentFile = ref<File | null>(null)
const proofOfPaymentInput = ref<HTMLInputElement | null>(null)

const showPaymentProofForm = computed(() =>
  eventRecord.value ? needsPaymentSubmission(eventRecord.value.latestPayment) : false
)

const paymentPendingReview = computed(() =>
  eventRecord.value ? isPaymentPendingReview(eventRecord.value.latestPayment) : false
)

const paymentDenialReason = computed(() =>
  eventRecord.value?.latestPayment?.status === 'DENIED'
    ? eventRecord.value.latestPayment.denialReason
    : ''
)

const useDemoFallbacks = computed(() => !eventId.value || isUiOnlyMode.value)

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')

const addGuestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
})

type AddGuestSchema = z.output<typeof addGuestSchema>

const addGuestState = reactive<AddGuestSchema>({
  name: '',
  email: '',
})

const rsvpOptions = ['Attending', 'Pending', 'Not Attending'] as const

type Person = {
  guestId: string
  name: string
  email: string
  guests: number
  rsvpStatus: typeof rsvpOptions[number]
  invitationSent: boolean
}

const people = ref<Person[]>([
  {
    guestId: 'demo-guest-1',
    name: 'John Smith',
    email: 'john.smith@example.com',
    guests: 2,
    rsvpStatus: 'Attending',
    invitationSent: true,
  },
  {
    guestId: 'demo-guest-2',
    name: 'Emily White',
    email: 'emily.white@example.com',
    guests: 1,
    rsvpStatus: 'Pending',
    invitationSent: true,
  },
  {
    guestId: 'demo-guest-3',
    name: 'Michael Brown',
    email: 'michael.brown@example.com',
    guests: 4,
    rsvpStatus: 'Not Attending',
    invitationSent: false,
  },
])

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
    const completed = tasksSummary.value.byStatus.COMPLETED ?? 0
    const total = tasksSummary.value.totalTasks
    if (total === 0) {
      return { label: 'No Tasks Yet', percent: 0, isEmpty: true }
    }
    return {
      label: `${completed} / ${total}`,
      percent: Math.round((completed / total) * 100),
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

const guestListSize = computed(() => {
  if (eventId.value && !isUiOnlyMode.value) {
    return guestList.value.length
  }
  return people.value.length
})

const invitationsSentCount = computed(() => {
  if (eventId.value && !isUiOnlyMode.value) {
    if (rsvpSummary.value) {
      return rsvpSummary.value.totalSent
    }
    return guestList.value.filter(guest => Boolean(guest.rsvp?.invitedAt)).length
  }
  return people.value.filter(person => person.invitationSent).length
})

const invitationsSentFraction = computed(
  () => `${invitationsSentCount.value} / ${guestListSize.value}`
)

const uninvitedGuestsCount = computed(() => {
  if (eventId.value && !isUiOnlyMode.value) {
    return guestList.value.filter(guest => !guest.rsvp?.invitedAt).length
  }
  return people.value.filter(person => !person.invitationSent).length
})

const canInviteAll = computed(() =>
  uninvitedGuestsCount.value > 0
  && !isEventCancelled.value
  && Boolean(eventId.value || isUiOnlyMode.value)
  && guestListSize.value > 0
)

const rsvpStats = computed(() => {
  if (rsvpSummary.value) {
    return {
      responses: rsvpSummary.value.going + rsvpSummary.value.notGoing,
      attendees: rsvpSummary.value.going,
    }
  }
  if (useDemoFallbacks.value) {
    return { responses: 75, attendees: 60 }
  }
  return { responses: 0, attendees: 0 }
})

function mapRsvpStatusToLabel(status?: string | null): 'Attending' | 'Pending' | 'Not Attending' {
  if (status === 'GOING') {
    return 'Attending'
  }
  if (status === 'NOT_GOING') {
    return 'Not Attending'
  }
  return 'Pending'
}

function mapGuestToPerson(guest: GuestRecord): Person {
  return {
    guestId: guest._id,
    name: guest.name,
    email: guest.email,
    guests: guest.rsvp?.status === 'GOING' ? 1 : 0,
    rsvpStatus: mapRsvpStatusToLabel(guest.rsvp?.status),
    invitationSent: Boolean(guest.rsvp?.invitedAt),
  }
}

function mapTaskPriority(priority: number) {
  if (priority <= 2) {
    return { label: 'Urgent', color: 'error' as const }
  }
  if (priority === 3) {
    return { label: 'Medium', color: 'secondary' as const }
  }
  return { label: 'Low', color: 'success' as const }
}

function formatTaskDate(iso?: string | null): string | null {
  if (!iso) {
    return null
  }
  return df.format(new Date(iso))
}

function formatTaskBudget(budget: number): string {
  return `Php ${budget.toLocaleString()}`
}

function getApiTasksByStatus(status: string): TaskPreview[] {
  return tasksSummary.value?.preview.tasks.filter((task) => task.status === status) ?? []
}

function onCoverImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = defaultCover
}

function resetEditForm() {
  if (!eventRecord.value) {
    return
  }
  editForm.eventName = eventRecord.value.eventName
  editForm.description = eventRecord.value.description
  editForm.venue = eventRecord.value.venue
  editCoverImageFile.value = null
  if (editCoverImageInput.value) {
    editCoverImageInput.value.value = ''
  }
}

function openEditModal() {
  resetEditForm()
  isEditModalOpen.value = true
}

function onEditCoverImageChange(changeEvent: Event) {
  const input = changeEvent.target as HTMLInputElement
  editCoverImageFile.value = input.files?.[0] ?? null
}

async function handleUpdateEvent() {
  if (!eventRecord.value) {
    return
  }

  if (!editForm.eventName.trim()) {
    toast.add({ title: 'Missing event name', color: 'error' })
    return
  }
  if (!editForm.venue.trim()) {
    toast.add({ title: 'Missing venue', color: 'error' })
    return
  }
  if (!editForm.description.trim()) {
    toast.add({ title: 'Missing description', color: 'error' })
    return
  }

  const existingCoverUrl = eventRecord.value.coverImageURL?.trim()
  if (!editCoverImageFile.value && !existingCoverUrl) {
    toast.add({
      title: 'Cover image required',
      description: 'Please upload a cover image for your event.',
      color: 'error',
    })
    return
  }

  isSubmittingEventUpdate.value = true
  try {
    const targetEventId = eventId.value || 'mock-event-id'

    if (!isUiOnlyMode.value) {
      await updateEvent(targetEventId, {
        eventType: eventRecord.value.eventType,
        eventName: editForm.eventName.trim(),
        description: editForm.description.trim(),
        venue: editForm.venue.trim(),
        coverImage: editCoverImageFile.value ?? undefined,
        coverImageURL: editCoverImageFile.value ? undefined : existingCoverUrl,
      })

      if (editCoverImageFile.value && eventId.value) {
        const detail = await fetchEvent(eventId.value)
        eventRecord.value = detail.event
      } else {
        eventRecord.value = {
          ...eventRecord.value,
          eventName: editForm.eventName.trim(),
          description: editForm.description.trim(),
          venue: editForm.venue.trim(),
        }
      }
    } else {
      eventRecord.value = {
        ...eventRecord.value,
        eventName: editForm.eventName.trim(),
        description: editForm.description.trim(),
        venue: editForm.venue.trim(),
      }
    }

    toast.add({
      title: 'Event updated',
      description: 'Your event details have been saved.',
    })
    isEditModalOpen.value = false
  } catch (error) {
    reportApiError(toast, { title: 'Could not update event', error })
  } finally {
    isSubmittingEventUpdate.value = false
  }
}

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    return
  }

  isLoadingEvent.value = true
  eventRecord.value = null
  guestList.value = []
  rsvpSummary.value = null
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
        tasks: null,
      }),
      fetch: async () => fetchEvent(eventId.value),
    })
    eventRecord.value = detail.event
    guestList.value = detail.guestList
    rsvpSummary.value = detail.rsvpSummary
    tasksSummary.value = detail.tasks
    await refreshGuestList()
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
  }
}

async function refreshGuestList() {
  if (!eventId.value || isUiOnlyMode.value) {
    return
  }

  try {
    guestList.value = await fetchGuestsByEvent(eventId.value)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load guests', error })
  }
}

function resetAddGuestForm() {
  addGuestState.name = ''
  addGuestState.email = ''
}

async function handleAddGuest(payload: FormSubmitEvent<AddGuestSchema>) {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }

  if (isEventCancelled.value) {
    toast.add({
      title: 'Event cancelled',
      description: 'Cannot modify the guest list for a cancelled event.',
      color: 'error',
    })
    return
  }

  isSubmittingGuest.value = true
  try {
    const targetEventId = eventId.value || 'mock-event-id'
    const response = await createGuest(targetEventId, {
      name: payload.data.name,
      email: payload.data.email,
    })

    if (eventId.value && !isUiOnlyMode.value) {
      guestList.value = appendGuestToList(guestList.value, response.guest)
    } else if (isUiOnlyMode.value) {
      people.value.push({
        guestId: response.guest._id,
        name: response.guest.name,
        email: response.guest.email,
        guests: 0,
        rsvpStatus: 'Pending',
        invitationSent: false,
      })
    }

    toast.add({
      title: 'Guest added',
      description: response.message,
    })
    isAddGuestModalOpen.value = false
    resetAddGuestForm()
  } catch (error) {
    const validationMessage = formatGuestValidationErrors(error)
    if (validationMessage) {
      toast.add({
        title: 'Validation failed',
        description: validationMessage,
        color: 'error',
      })
      return
    }
    reportApiError(toast, {
      title: 'Could not add guest',
      error,
      fallback: getApiErrorMessage(error),
    })
  } finally {
    isSubmittingGuest.value = false
  }
}

function openRemoveGuestModal(person: Person) {
  guestToRemove.value = person
  isRemoveGuestModalOpen.value = true
}

function closeRemoveGuestModal() {
  isRemoveGuestModalOpen.value = false
  guestToRemove.value = null
}

async function handleRemoveGuest() {
  const person = guestToRemove.value
  if (!person?.guestId || deletingGuestId.value) {
    return
  }

  if (isEventCancelled.value) {
    toast.add({
      title: 'Event cancelled',
      description: 'Cannot modify the guest list for a cancelled event.',
      color: 'error',
    })
    return
  }

  deletingGuestId.value = person.guestId
  try {
    const response = await deleteGuest(person.guestId)

    if (eventId.value && !isUiOnlyMode.value) {
      const updated = removeGuestFromList(
        guestList.value,
        rsvpSummary.value,
        person.guestId
      )
      guestList.value = updated.guestList
      rsvpSummary.value = updated.rsvpSummary
    } else {
      people.value = people.value.filter(entry => entry.guestId !== person.guestId)
    }

    toast.add({
      title: 'Guest removed',
      description: response.message,
    })
    closeRemoveGuestModal()
  } catch (error) {
    reportApiError(toast, { title: 'Could not remove guest', error })
  } finally {
    deletingGuestId.value = null
  }
}

async function handleInviteAll() {
  if (isInvitingAll.value || !canInviteAll.value) {
    return
  }

  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }

  if (isEventCancelled.value) {
    toast.add({
      title: 'Event cancelled',
      description: 'Cannot send invitations for a cancelled event.',
      color: 'error',
    })
    return
  }

  isInvitingAll.value = true
  try {
    const targetEventId = eventId.value || 'mock-event-id'
    const response = await sendAllGuestInvites(targetEventId)

    if (eventId.value && !isUiOnlyMode.value) {
      const updated = applySendAllInvitesToGuestList(
        guestList.value,
        rsvpSummary.value,
        response
      )
      guestList.value = updated.guestList
      rsvpSummary.value = updated.rsvpSummary
    } else {
      for (const person of people.value) {
        if (!person.invitationSent) {
          person.invitationSent = true
        }
      }
    }

    const skipped = response.skippedAlreadyInvited ?? 0
    let description = response.message
    if (response.created > 0 || skipped > 0) {
      description = `${response.created} invitation(s) sent`
      if (skipped > 0) {
        description += `, ${skipped} already invited`
      }
      description += '.'
    }

    toast.add({
      title: 'Invitations sent',
      description,
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not send invitations', error })
  } finally {
    isInvitingAll.value = false
  }
}

async function handleSendGuestInvite(guestId: string) {
  if (!guestId || sendingGuestId.value || isInvitingAll.value) {
    return
  }

  if (isEventCancelled.value) {
    toast.add({
      title: 'Event cancelled',
      description: 'Cannot send invitations for a cancelled event.',
      color: 'error',
    })
    return
  }

  sendingGuestId.value = guestId
  try {
    const response = await sendGuestInvite(guestId)

    if (eventId.value && !isUiOnlyMode.value) {
      const updated = applySendInviteToGuestList(
        guestList.value,
        rsvpSummary.value,
        guestId,
        response
      )
      guestList.value = updated.guestList
      rsvpSummary.value = updated.rsvpSummary
    } else {
      const person = people.value.find((entry) => entry.guestId === guestId)
      if (person) {
        person.invitationSent = true
      }
    }

    toast.add({
      title: 'Invitation sent',
      description: response.message,
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not send invitation', error })
  } finally {
    sendingGuestId.value = null
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

const UBadge = resolveComponent('UBadge')

const columns: TableColumn<Person>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'guests', header: 'Attendants' },
  {
    accessorKey: 'rsvpStatus',
    header: 'RSVP Status',
    cell: ({ row }) => {
      const color = {
        Attending: 'success' as const,
        'Not Attending': 'error' as const,
        Pending: 'secondary' as const
      }[row.getValue('rsvpStatus') as string]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
        row.getValue('rsvpStatus')
      )
    }
  },
  { accessorKey: 'invitationSent', header: 'Invitation Sent' },
  { accessorKey: 'actions', header: '' }
]

const tableData = computed(() => {
  if (eventId.value && !isUiOnlyMode.value) {
    return guestList.value.map(mapGuestToPerson)
  }
  return people.value
})

const taskPriorities = ['Urgent', 'Medium', 'Low']

const modelValue = shallowRef(new CalendarDate(2015, 7, 23))

const tabItems = [
  {
    label: 'To Do',
    slot: 'todo'
  },
  {
    label: 'Ongoing',
    slot: 'ongoing'
  },
  {
    label: 'Completed',
    slot: 'completed'
  }
]

</script>

<template>
  <UContainer class="space-y-8 pb-8">
    <div
      class="relative w-full overflow-hidden rounded-lg h-48 sm:h-56 md:h-64 max-h-72"
    >
      <USkeleton
        v-if="isLoadingEvent && eventId"
        class="absolute inset-0 h-full w-full"
      />
      <img
        v-else-if="eventCoverUrl"
        :src="eventCoverUrl"
        :alt="eventTitle || 'Event cover'"
        class="absolute inset-0 h-full w-full object-cover object-center"
        @error="onCoverImageError"
      >
      <div
        v-else
        class="absolute inset-0 bg-gradient-to-br from-toast-400 to-toast-600"
      />

      <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />

      <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-6">
        <div class="min-w-0 flex-1 text-white">
          <USkeleton
            v-if="isLoadingEvent && eventId"
            class="mb-2 h-8 w-3/4 max-w-sm bg-white/20"
          />
          <h1
            v-else
            class="truncate text-2xl font-bold sm:text-3xl md:text-4xl font-serif"
          >
            {{ eventTitle }}
          </h1>
          <div
            v-if="isLoadingEvent && eventId"
            class="mt-3 flex flex-wrap gap-2"
          >
            <USkeleton class="h-6 w-32 bg-white/20" />
            <USkeleton class="h-6 w-40 bg-white/20" />
          </div>
          <div
            v-else
            class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90 sm:text-base"
          >
            <span
              v-if="eventDateLabel"
              class="inline-flex items-center gap-1.5 min-w-0"
            >
              <UIcon name="i-lucide-calendar" class="shrink-0 size-4" />
              <span>{{ eventDateLabel }}</span>
            </span>
            <span
              v-if="eventVenue"
              class="inline-flex items-center gap-1.5 min-w-0 max-w-full"
            >
              <UIcon name="i-lucide-map-pin" class="shrink-0 size-4" />
              <span class="truncate">{{ eventVenue }}</span>
            </span>
          </div>
        </div>

        <UModal
          v-model="isEditModalOpen"
          title="Edit Event"
          :ui="{
            header: 'bg-toast-400 border-none', title: 'text-white font-serif text-xl',
            content: 'border-none ring-transparent w-1/4',
            overlay: 'bg-toast-900/30'
          }"
          :close="{
            variant: 'link',
            class: 'rounded-full text-white'
          }"
          :dismissible="false"
        >
          <UButton
            icon="i-lucide-pen"
            variant="solid"
            color="neutral"
            class="shrink-0 bg-white/90 text-highlighted hover:bg-white"
            @click="openEditModal"
          />
          <template #body>
            <UForm
              class="space-y-4"
              @submit.prevent="handleUpdateEvent"
            >
              <UFormField label="Event Name" name="name" required>
                <UInput
                  v-model="editForm.eventName"
                  class="w-full"
                  placeholder="Jane & John's Wedding"
                />
              </UFormField>

              <UFormField label="Event Date" name="date">
                <UInput
                  :model-value="eventDateLabel"
                  class="w-full"
                  disabled
                />
              </UFormField>

              <UFormField label="Venue" name="venue" required>
                <UInput
                  v-model="editForm.venue"
                  class="w-full"
                  placeholder="Manila Cathedral"
                />
              </UFormField>

              <UFormField label="Description" name="description" required>
                <UTextarea
                  v-model="editForm.description"
                  class="w-full"
                  placeholder="Tell us more about your special day"
                />
              </UFormField>

              <UFormField label="Cover Image" name="coverImage" required>
                <div class="flex items-center gap-3">
                  <UButton variant="solid" @click="editCoverImageInput?.click()">
                    Choose file
                  </UButton>
                  <span class="text-sm text-muted truncate">
                    {{ editCoverImageFile?.name || 'No file chosen' }}
                  </span>
                  <input
                    ref="editCoverImageInput"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    class="hidden"
                    @change="onEditCoverImageChange"
                  >
                </div>
              </UFormField>

              <UButton
                type="submit"
                block
                class="mt-4"
                :loading="isSubmittingEventUpdate"
              >
                Save Changes
              </UButton>
            </UForm>
          </template>
        </UModal>
      </div>
    </div>

    <UPageCard
      v-if="showPaymentProofForm"
      class="white-bread-container border border-warning/30"
      title="Payment proof required"
      description="Submit your event creation fee payment to unlock all event features."
    >
      <UAlert
        v-if="paymentDenialReason"
        color="error"
        variant="subtle"
        title="Previous payment was denied"
        :description="paymentDenialReason"
        class="mb-4"
      />
      <UForm
        class="space-y-4 max-w-lg"
        @submit.prevent="handleSubmitPaymentProof"
      >
        <UFormField
          label="Payment Transaction ID"
          name="transactionId"
          required
        >
          <UInput
            v-model="paymentForm.transactionId"
            class="w-full"
            placeholder="GCash / bank reference number"
          />
        </UFormField>
        <UFormField
          label="Proof of Payment"
          name="proofOfPayment"
          required
        >
          <div class="flex items-center gap-3">
            <UButton variant="solid" @click="proofOfPaymentInput?.click()">
              Choose file
            </UButton>
            <span class="text-sm text-muted truncate">
              {{ proofOfPaymentFile?.name || 'No file chosen' }}
            </span>
            <input
              ref="proofOfPaymentInput"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              class="hidden"
              @change="onProofOfPaymentChange"
            >
          </div>
        </UFormField>
        <UButton
          type="submit"
          :loading="isSubmittingPayment"
        >
          Submit payment proof
        </UButton>
      </UForm>
    </UPageCard>

    <UPageCard
      v-else-if="paymentPendingReview"
      class="white-bread-container border border-info/30"
      title="Payment pending review"
      description="Your payment proof has been submitted and is awaiting admin approval."
    />

    <UPageGrid>
      <UPageCard class="white-bread-container items-start">
        <UAvatar icon="i-lucide-clipboard-check" size="xl" class="ring ring-inset ring-primary/25 bg-toast-50" />
        <div class="text-md font-semibold -mb-2 uppercase text-muted">Task Tracker</div>
        <div class="flex items-center gap-2">
          <div
            class="font-bold"
            :class="taskTracker.isEmpty ? 'text-lg' : 'text-2xl'"
          >
            {{ taskTracker.label }}
          </div>
          <UBadge
            v-if="!taskTracker.isEmpty"
            variant="subtle"
          >
            {{ taskTracker.percent }}%
          </UBadge>
        </div>
      </UPageCard>

      <UPageCard class="white-bread-container items-start">
        <UAvatar icon="i-lucide-wallet" size="xl" class="ring ring-inset ring-primary/25 bg-toast-50" />
        <div class="text-md font-semibold -mb-2 uppercase text-muted">Current Budget</div>
        <div
          class="font-bold"
          :class="currentBudgetLabel === 'No Budget Yet' ? 'text-lg' : 'text-2xl'"
        >
          {{ currentBudgetLabel }}
        </div>
      </UPageCard>

      <UPageCard class="white-bread-container items-start">
        <UAvatar icon="i-lucide-globe" size="xl" class="ring ring-inset ring-primary/25 bg-toast-50" />
        <div class="text-md font-semibold -mb-2 uppercase text-muted">Website Manager</div>
        <div class="flex items-center gap-2">
          <div class="font-bold text-2xl">LIVE</div>
        </div>
      </UPageCard>
    </UPageGrid>

    <UPageCard class="white-bread-container space-y-4">
      <div class="flex justify-between">
        <div class="text-xl text-pretty font-semibold text-muted uppercase">Guest List</div>

        <div class="flex flex-wrap gap-2 justify-end">
          <UButton to="/RSVPMakerCopy" icon="i-lucide-calendar">
            RSVP Maker
          </UButton>

          <UButton
            icon="i-lucide-mail"
            variant="soft"
            :loading="isInvitingAll"
            :disabled="!canInviteAll || Boolean(sendingGuestId)"
            @click="handleInviteAll"
          >
            Invite all
          </UButton>

          <UButton
            variant="outline"
            icon="i-lucide-users"
            :disabled="!eventId && !isUiOnlyMode"
            :to="eventId || isUiOnlyMode
              ? { path: '/AddGuestsBulk', query: { eventId: eventId || 'mock-event-id' } }
              : undefined"
          >
            Add multiple guests
          </UButton>

          <UModal
            v-model:open="isAddGuestModalOpen"
            title="Add Guest"
            :ui="{
              header: 'bg-toast-400 border-none', title: 'text-white font-serif text-xl',
              content: 'border-none ring-transparent w-1/4',
              overlay: 'bg-toast-900/30'
            }"
            :close="{
              variant: 'link',
              class: 'rounded-full text-white'
            }"
            :dismissible="false"
          >
            <UButton
              icon="i-lucide-user-plus"
              :disabled="isEventCancelled || (!eventId && !isUiOnlyMode)"
            >
              Add Guest
            </UButton>
            <template #body>
              <UForm
                :schema="addGuestSchema"
                :state="addGuestState"
                class="space-y-4"
                @submit="handleAddGuest"
              >
                <UFormField label="Name" name="name" required>
                  <UInput
                    v-model="addGuestState.name"
                    class="w-full"
                    placeholder="Juan Dela Cruz"
                  />
                </UFormField>
                <UFormField label="Email" name="email" required>
                  <UInput
                    v-model="addGuestState.email"
                    type="email"
                    class="w-full"
                    placeholder="jdelacruz@example.com"
                  />
                </UFormField>

                <UButton
                  type="submit"
                  block
                  class="mt-4"
                  :loading="isSubmittingGuest"
                  :disabled="isEventCancelled"
                >
                  Add Guest
                </UButton>
              </UForm>
            </template>
          </UModal>
        </div>
      </div>
      <UPageGrid>
        <UPageCard
          class="bg-toast-50 ring ring-inset ring-primary/25"
          description="Invitations sent / guest list"
          :ui="{ title: 'text-primary', description: 'text-toast-400' }"
        >
          <template #title>
            <div class="text-2xl font-bold">
              {{ invitationsSentFraction }}
            </div>
          </template>
        </UPageCard>
        <UPageCard class="bg-toast-50 ring ring-inset ring-primary/25" title="75" description="Total Responses"
          :ui="{ title: 'text-primary', description: 'text-toast-400' }">
          <template #title>
            <div class="text-2xl font-bold">{{ rsvpStats.responses }}</div>
          </template>
        </UPageCard>
        <UPageCard class="bg-toast-50 ring ring-inset ring-primary/25" title="60" description="Total Attendees"
          :ui="{ title: 'text-primary', description: 'text-toast-400' }">
          <template #title>
            <div class="text-2xl font-bold">{{ rsvpStats.attendees }}</div>
          </template>
        </UPageCard>
      </UPageGrid>
      <UTable :data="tableData" :columns="columns">
        <template #invitationSent-cell="{ row }">
          <UBadge
            :color="row.original.invitationSent ? 'success' : 'neutral'"
            variant="subtle"
          >
            {{ row.original.invitationSent ? 'Sent' : 'Not sent' }}
          </UBadge>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex flex-wrap items-center justify-end gap-1">
            <UButton
              v-if="!row.original.invitationSent"
              size="xs"
              variant="soft"
              :loading="sendingGuestId === row.original.guestId"
              :disabled="isEventCancelled || !row.original.guestId || isInvitingAll"
              @click="handleSendGuestInvite(row.original.guestId)"
            >
              Send Invitation
            </UButton>
            <span
              v-else
              class="text-xs text-muted px-1"
            >
              Sent
            </span>
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              :disabled="isEventCancelled || !row.original.guestId"
              @click="openRemoveGuestModal(row.original)"
            />
          </div>
        </template>
      </UTable>

      <UModal
        v-model:open="isRemoveGuestModalOpen"
        title="Remove guest"
        :dismissible="!deletingGuestId"
        :ui="{ content: 'border-none ring-transparent max-w-md' }"
      >
        <template #body>
          <p class="text-sm text-muted mb-4">
            Remove
            <span class="font-medium text-highlighted">{{ guestToRemove?.name }}</span>
            ({{ guestToRemove?.email }}) from the guest list?
            <template v-if="guestToRemove?.invitationSent">
              Their RSVP invitation will also be removed.
            </template>
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="Boolean(deletingGuestId)"
              @click="closeRemoveGuestModal"
            />
            <UButton
              label="Remove guest"
              color="error"
              :loading="Boolean(deletingGuestId)"
              @click="handleRemoveGuest"
            />
          </div>
        </template>
      </UModal>
    </UPageCard>

    <!-- Tasks Container -->
    <UPageCard class="white-bread-container space-y-4">
      <div class="flex justify-between">
        <div class="text-xl text-pretty font-semibold text-muted uppercase">Tasks Checklist</div>

        <!-- Add Task Modal Start -->

        <UModal title="Add New Task" :ui="{
          header: 'bg-toast-400 border-none', title: 'text-white font-serif text-xl',
          content: 'border-none ring-transparent w-1/3',
          overlay: 'bg-toast-900/30'
        }" :close="{
          variant: 'link',
          class: 'rounded-full text-white'
        }" :dismissible="false">
          <UButton icon="i-lucide-list-plus">Add New Task</UButton>
          <template #body>
            <UForm class="space-y-4">
              <UFormField label="Task name" name="task-name" required>
                <UInput class="w-full" placeholder="Set an appointment" />
              </UFormField>
              <UFormField label="Description" name="description" required>
                <UTextarea class="w-full" placeholder="Drop your notes here" />
              </UFormField>
              <UFieldGroup class="w-full gap-2">
                <UFormField label="Priority" name="priority" required class="w-1/3">
                  <USelect :items="taskPriorities" placeholder="Select priority" class="w-full" />
                </UFormField>
                <UFormField label="Budget" name="budget" required class="w-1/3">
                  <UInputNumber :increment="false" :decrement="false" class="w-full" placeholder="in Php" />
                </UFormField>
                <UFormField label="Event Date" name="date" required class="w-1/3">
                  <UPopover>
                    <UButton color="neutral" variant="outline" class="w-full">
                      {{ modelValue ? df.format(modelValue.toDate(getLocalTimeZone())) : 'Select a date' }}
                    </UButton>

                    <template #content="{ close }">
                      <UCalendar v-model="modelValue" class="p-2" @update:model-value="close" />
                    </template>
                  </UPopover>
                </UFormField>
              </UFieldGroup>

              <UFormField class="w-full" label="Supplementary File / Photo">
                <UFileUpload size="xl" variant="area" label="Drop your image here"
                  description="SVG, PNG, JPG or GIF (max. 2MB)" />
              </UFormField>
              <UButton type="submit" block class="mt-4">
                Add Task
              </UButton>
            </UForm>
          </template>
        </UModal>

        <!-- Add Task Modal End -->


      </div>
      <UTabs :items="tabItems" variant="link">
        <template #todo="{ item }">
          <div class="mt-4">
            <UPageColumns>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Book a photo booth</div>
                  <UBadge color="error" variant="subtle">Urgent</UBadge>
                </div>

                <p class="text-sm text-muted mt-1">
                  Find and book a photo booth service for the reception. Get quotes from at least 3 vendors.
                </p>

                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Due: Jun 15, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 20,000</span>
                  </div>
                </div>

                <UButton block>Mark as Ongoing</UButton>

              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Finalize catering menu</div>
                  <UBadge color="secondary" variant="subtle">Medium</UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  Confirm final menu choices with the caterer and provide a final guest count.
                </p>

                <UButton block>Mark as Ongoing</UButton>

              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Send out wedding invitations</div>
                  <UBadge color="error" variant="subtle">Urgent</UBadge>
                </div>

                <p class="text-sm text-muted mt-1">
                  Design, print, and mail the wedding invitations to all guests on the list.
                </p>

                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Due: Jul 1, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 15,000</span>
                  </div>
                </div>

                <UButton block>Mark as Ongoing</UButton>

              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Choose wedding cake flavor</div>
                  <UBadge color="secondary" variant="subtle">Medium</UBadge>
                </div>

                <p class="text-sm text-muted mt-1">
                  Schedule a tasting with the bakery and decide on the final cake flavor and design.
                </p>

                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Due: Aug 10, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 10,000</span>
                  </div>
                </div>

                <UButton block>Mark as Ongoing</UButton>

              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Arrange guest transportation</div>
                  <UBadge color="success" variant="subtle">Low</UBadge>
                </div>

                <p class="text-sm text-muted mt-1">
                  Look into shuttle services or carpooling options for out-of-town guests.
                </p>

                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Due: Sep 1, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 5,000</span>
                  </div>
                </div>

                <UButton block>Mark as Ongoing</UButton>

              </UPageCard>
            </UPageColumns>
          </div>
        </template>
        <template #ongoing="{ item }">
          <div class="mt-4">
            <UPageColumns>
              <UPageCard
                v-for="task in getApiTasksByStatus('ONGOING')"
                :key="task._id"
                class="white-bread-container ring-1 ring-inset ring-primary/20"
              >
                <div class="flex justify-between items-start">
                  <div class="font-semibold">{{ task.title }}</div>
                  <UBadge
                    :color="mapTaskPriority(task.priority).color"
                    variant="subtle"
                  >
                    {{ mapTaskPriority(task.priority).label }}
                  </UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  {{ task.details }}
                </p>
                <div
                  v-if="formatTaskDate(task.deadline) || task.budget"
                  class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4"
                >
                  <div
                    v-if="formatTaskDate(task.deadline)"
                    class="flex items-center gap-1.5"
                  >
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Due: {{ formatTaskDate(task.deadline) }}</span>
                  </div>
                  <div
                    v-if="task.budget"
                    class="flex items-center gap-1.5"
                  >
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: {{ formatTaskBudget(task.budget) }}</span>
                  </div>
                </div>
                <UButton block class="mt-4">Mark as Complete</UButton>
              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Coordinate with florist</div>
                  <UBadge color="secondary" variant="subtle">Medium</UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  Confirm flower arrangements, delivery schedule, and final payment with the florist.
                </p>
                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Due: Oct 1, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 30,000</span>
                  </div>
                </div>
                <UButton block class="mt-4">Mark as Complete</UButton>
              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Trial hair and makeup</div>
                  <UBadge color="error" variant="subtle">Urgent</UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  Schedule and attend hair and makeup trials for the bride and bridesmaids.
                </p>
                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Due: Sep 20, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 8,000</span>
                  </div>
                </div>
                <UButton block class="mt-4">Mark as Complete</UButton>
              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Purchase wedding rings</div>
                  <UBadge color="error" variant="subtle">Urgent</UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  Select and purchase wedding bands for the couple.
                </p>
                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Due: Aug 1, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 100,000</span>
                  </div>
                </div>
                <UButton block class="mt-4">Mark as Complete</UButton>
              </UPageCard>
            </UPageColumns>
          </div>
        </template>
        <template #completed="{ item }">
          <div class="mt-4">
            <UPageColumns>
              <UPageCard
                v-for="task in getApiTasksByStatus('COMPLETED')"
                :key="task._id"
                class="white-bread-container ring-1 ring-inset ring-primary/20"
              >
                <div class="flex justify-between items-start">
                  <div class="font-semibold">{{ task.title }}</div>
                  <UBadge
                    :color="mapTaskPriority(task.priority).color"
                    variant="subtle"
                  >
                    {{ mapTaskPriority(task.priority).label }}
                  </UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  {{ task.details }}
                </p>
                <div
                  v-if="formatTaskDate(task.deadline) || task.budget"
                  class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4"
                >
                  <div
                    v-if="formatTaskDate(task.deadline)"
                    class="flex items-center gap-1.5"
                  >
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Completed: {{ formatTaskDate(task.deadline) }}</span>
                  </div>
                  <div
                    v-if="task.budget"
                    class="flex items-center gap-1.5"
                  >
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: {{ formatTaskBudget(task.budget) }}</span>
                  </div>
                </div>
              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Book wedding venue</div>
                  <UBadge color="success" variant="subtle">Low</UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  Secured the main wedding venue and paid the deposit.
                </p>
                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Completed: Jan 10, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 200,000</span>
                  </div>
                </div>
              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Create guest list draft</div>
                  <UBadge color="success" variant="subtle">Low</UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  Initial draft of the guest list has been compiled.
                </p>
                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Completed: Feb 1, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 0</span>
                  </div>
                </div>
              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Engagement photoshoot</div>
                  <UBadge color="success" variant="subtle">Low</UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  Successfully completed the engagement photoshoot.
                </p>
                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Completed: Mar 5, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 12,000</span>
                  </div>
                </div>
              </UPageCard>
            </UPageColumns>
          </div>
        </template>
      </UTabs>

    </UPageCard>

  </UContainer>

</template>

<style></style>