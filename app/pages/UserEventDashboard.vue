<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
import { DateFormatter } from '@internationalized/date'
import type { EventRecord, GuestRecord, RsvpSummary, TasksSummary } from '~/types/event'
import {
  EVENT_CREATION_FEE_PHP,
  getEventBalanceDue,
  isEventFullyPaid,
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
const { fetchEvent, updateEvent } = useEvents()
const { createGuest, fetchGuestsByEvent, sendGuestInvite, sendAllGuestInvites, deleteGuest } = useGuests()
const { submitEventPaymentProof } = usePayments()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()

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
const isQuestionsModalOpen = ref(false)
const isNoQuestionsWarningOpen = ref(false)
const pendingInviteAction = ref<'all' | string | null>(null)

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

const hasNoRsvpQuestions = computed(() => !(eventRecord.value?.questions?.length))

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

async function _doInviteAll() {
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

    toast.add({ title: 'Invitations sent', description })
  } catch (error) {
    reportApiError(toast, { title: 'Could not send invitations', error })
  } finally {
    isInvitingAll.value = false
  }
}

async function _doSendGuestInvite(guestId: string) {
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

    toast.add({ title: 'Invitation sent', description: response.message })
  } catch (error) {
    reportApiError(toast, { title: 'Could not send invitation', error })
  } finally {
    sendingGuestId.value = null
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

  if (hasNoRsvpQuestions.value) {
    pendingInviteAction.value = 'all'
    isNoQuestionsWarningOpen.value = true
    return
  }

  await _doInviteAll()
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

  if (hasNoRsvpQuestions.value) {
    pendingInviteAction.value = guestId
    isNoQuestionsWarningOpen.value = true
    return
  }

  await _doSendGuestInvite(guestId)
}

async function confirmInviteWithoutQuestions() {
  isNoQuestionsWarningOpen.value = false
  const action = pendingInviteAction.value
  pendingInviteAction.value = null
  if (!action) return
  if (action === 'all') {
    await _doInviteAll()
  } else {
    await _doSendGuestInvite(action)
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

const dashboardItems = [
  { label: 'Website', icon: 'i-lucide-globe', action: 'website' as const },
  { label: 'RSVP', icon: 'i-lucide-mail' },
  { label: 'Invitations', icon: 'i-lucide-send' },
  { label: 'Guest List', icon: 'i-lucide-users' },
  { label: 'Schedules', icon: 'i-lucide-calendar' },
  { label: 'Photos', icon: 'i-lucide-camera' },
  { label: 'Stationery', icon: 'i-lucide-pen-tool' },
  { label: 'Settings', icon: 'i-lucide-settings' },
  { label: 'Tasks', icon: 'i-lucide-list-todo' }
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
            @click="item.action === 'website' ? openWebsiteMaker() : undefined"
            @keydown.enter="item.action === 'website' ? openWebsiteMaker() : undefined"
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
