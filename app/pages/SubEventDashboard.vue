<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'
import {
  type CalendarDate,
  DateFormatter,
  getLocalTimeZone,
  today,
} from '@internationalized/date'
import type { EventRecord, RsvpSummary } from '~/types/event'
import { rsvpSummaryToChartData } from '~/types/event'
import type { SubEventRecord } from '~/types/subEvent'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import {
  type SubEventGuestTableRow,
  useSubEventGuestsManager,
} from '~/composables/useSubEventGuestsManager'
import { rsvpsToSummary } from '~/composables/useSubEventRsvps'
import { formatGuestDisplayName } from '~/utils/guestName'
import {
  isoToCalendarDate,
  isSubEventDateBeforeParent,
  parentEventMaxSubEventDate,
} from '~/utils/subEventDate'
import { calendarDateToUtcIso } from '~/utils/taskFormat'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Mini-Event',
  bgClass: 'bg-cyan-50',
})

const RSVP_CHART_COLORS = ['#06b6d4', '#f43f5e', '#f59e0b']

const miniDashboardButtons = [
  {
    label: 'Invitation',
    icon: 'i-lucide-send',
    bgClass: 'bg-violet-500',
    hoverClass: 'group-hover:bg-violet-600',
  },
  {
    label: 'RSVP',
    icon: 'i-lucide-mail',
    bgClass: 'bg-teal-500',
    hoverClass: 'group-hover:bg-teal-600',
  },
  {
    label: 'Guestlist',
    icon: 'i-lucide-users',
    bgClass: 'bg-orange-500',
    hoverClass: 'group-hover:bg-orange-600',
  },
  {
    label: 'Mini-event settings',
    icon: 'i-lucide-settings',
    bgClass: 'bg-slate-500',
    hoverClass: 'group-hover:bg-slate-600',
  },
] as const
const EMOJI_RE = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { findSubEventById, updateSubEvent, deleteSubEvent } = useSubEvents()
const { fetchAllSubEventRsvps } = useSubEventRsvps()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { finishPageTransition } = usePageTransition()

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const subEventId = computed(() => {
  const value = route.query.subEventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const subEventRecord = ref<SubEventRecord | null>(null)
const rsvpSummary = ref<RsvpSummary | null>(null)
const isLoadingEvent = ref(false)
const isLoadingSubEvent = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const isDeleteModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isInviteGuestModalOpen = ref(false)
const isUninviteModalOpen = ref(false)
const guestToUninvite = ref<SubEventGuestTableRow | null>(null)

const editForm = reactive({
  name: '',
  venue: '',
  description: '',
})

const selectedDate = shallowRef<CalendarDate | null>(null)
const minSubEventDate = today(getLocalTimeZone())

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')
const mutationsDisabled = computed(
  () =>
    isEventCancelled.value
    || (!eventId.value && !isUiOnlyMode.value)
    || (!subEventId.value && !isUiOnlyMode.value)
)

const parentEventDateLabel = computed(() => {
  const iso = eventRecord.value?.eventDate
  if (!iso) {
    return isUiOnlyMode.value ? 'May 18, 2026' : ''
  }
  return df.format(new Date(iso))
})

const maxSubEventDate = computed(() => {
  const iso = eventRecord.value?.eventDate
  if (!iso) {
    return isUiOnlyMode.value
      ? parentEventMaxSubEventDate('2026-05-18T00:00:00.000Z')
      : null
  }
  return parentEventMaxSubEventDate(iso)
})

const selectedDateLabel = computed(() => {
  if (!selectedDate.value) {
    return 'Select a date'
  }
  return df.format(selectedDate.value.toDate(getLocalTimeZone()))
})

const chartData = computed(() =>
  rsvpSummary.value ? rsvpSummaryToChartData(rsvpSummary.value) : []
)

const schedulesLink = computed(() => ({
  path: '/event/schedules',
  query: eventId.value ? { eventId: eventId.value } : {},
}))

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

async function refreshRsvpSummary() {
  const targetSubEventId = subEventId.value || 'mock-sub-event-1'
  try {
    const rsvps = await fetchAllSubEventRsvps(targetSubEventId)
    rsvpSummary.value = rsvpsToSummary(rsvps)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load RSVP summary', error })
  }
}

const {
  isLoadingGuests,
  uninvitingGuestId,
  isSendingInvites,
  canBulkInvite,
  hasEmailCredits,
  tableRows,
  isGuestListEmpty,
  canInviteGuests,
  filteredUninvitedGuests,
  selectedInviteGuestIds,
  inviteSearchQuery,
  allUninvitedSelected,
  someUninvitedSelected,
  toggleInviteSelection,
  toggleSelectAllUninvited,
  clearInviteSelection,
  handleBulkInvite,
  handleExternalInvite,
  handleUninvite,
} = useSubEventGuestsManager({
  eventId,
  subEventId,
  eventRecord,
  isEventCancelled,
  rsvpSummary,
  onInvitesSent: refreshRsvpSummary,
})

const selectedInviteCount = computed(() => selectedInviteGuestIds.value.size)

const inviteModalTab = ref<'guestlist' | 'external'>('guestlist')
const externalPersonForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
})
const externalPersonError = ref('')

const uninviteHasResponse = computed(
  () =>
    guestToUninvite.value?.rsvpStatus === 'Attending'
    || guestToUninvite.value?.rsvpStatus === 'Not Attending'
)

function resetExternalPersonForm() {
  externalPersonForm.firstName = ''
  externalPersonForm.lastName = ''
  externalPersonForm.email = ''
  externalPersonError.value = ''
}

function openInviteGuestModal() {
  clearInviteSelection()
  resetExternalPersonForm()
  inviteModalTab.value = 'guestlist'
  isInviteGuestModalOpen.value = true
}

function closeInviteGuestModal() {
  if (isSendingInvites.value) {
    return
  }
  isInviteGuestModalOpen.value = false
  clearInviteSelection()
  resetExternalPersonForm()
}

async function confirmBulkInvite() {
  const guestIds = [...selectedInviteGuestIds.value]
  if (guestIds.length === 0) {
    return
  }
  await handleBulkInvite(guestIds)
  isInviteGuestModalOpen.value = false
  clearInviteSelection()
}

async function confirmExternalInvite() {
  const firstName = externalPersonForm.firstName.trim()
  const lastName = externalPersonForm.lastName.trim()
  const email = externalPersonForm.email.trim()

  if (!firstName) {
    externalPersonError.value = 'First name is required.'
    return
  }
  if (!lastName) {
    externalPersonError.value = 'Last name is required.'
    return
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    externalPersonError.value = 'Please enter a valid email address.'
    return
  }

  externalPersonError.value = ''
  const sent = await handleExternalInvite([{ firstName, lastName, email }])
  if (sent) {
    isInviteGuestModalOpen.value = false
    resetExternalPersonForm()
  }
}

function openUninviteModal(person: SubEventGuestTableRow) {
  guestToUninvite.value = person
  isUninviteModalOpen.value = true
}

function closeUninviteModal() {
  if (uninvitingGuestId.value) {
    return
  }
  isUninviteModalOpen.value = false
  guestToUninvite.value = null
}

async function confirmUninvite() {
  const person = guestToUninvite.value
  if (!person) {
    return
  }
  await handleUninvite(person.guestId, person.rsvpId)
  isUninviteModalOpen.value = false
  guestToUninvite.value = null
}

const columns: TableColumn<SubEventGuestTableRow>[] = [
  {
    accessorKey: 'displayName',
    header: 'Name',
    cell: ({ row }) => {
      const name = row.getValue('displayName') as string
      if (row.original.isNonGuestlist) {
        return h('div', { class: 'flex items-center gap-2' }, [
          h('span', { class: 'font-medium' }, name),
          h(UBadge, { size: 'xs', variant: 'subtle', color: 'neutral' }, () => 'Non-guestlist'),
        ])
      }
      return h('span', { class: 'font-medium' }, name)
    },
  },
  { accessorKey: 'email', header: 'Email' },
  {
    accessorKey: 'rsvpStatus',
    header: 'RSVP Status',
    cell: ({ row }) => {
      const color = {
        Attending: 'success' as const,
        'Not Attending': 'error' as const,
        Pending: 'secondary' as const,
      }[row.getValue('rsvpStatus') as string]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
        row.getValue('rsvpStatus')
      )
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const person = row.original
      if (mutationsDisabled.value) {
        return null
      }

      return h(UButton, {
        size: 'xs',
        variant: 'ghost',
        color: 'error',
        icon: 'i-lucide-user-minus',
        loading: uninvitingGuestId.value === person.guestId,
        disabled: isSendingInvites.value,
        'aria-label': 'Uninvite guest',
        onClick: () => openUninviteModal(person),
      })
    },
  },
]

function populateEditForm(subEvent: SubEventRecord) {
  editForm.name = subEvent.name
  editForm.venue = subEvent.venue ?? ''
  editForm.description = subEvent.description ?? ''
  selectedDate.value = subEvent.eventDate
    ? isoToCalendarDate(subEvent.eventDate)
    : null
}

function openEditModal() {
  if (subEventRecord.value) {
    populateEditForm(subEventRecord.value)
  }
  isEditModalOpen.value = true
}

function closeEditModal() {
  if (isSaving.value) {
    return
  }
  isEditModalOpen.value = false
}

function validateEditForm(): string | null {
  const name = editForm.name.trim()
  if (!name) {
    return 'Mini-event name is required.'
  }
  if (EMOJI_RE.test(name)) {
    return 'Mini-event name must not contain emojis.'
  }
  if (editForm.venue.trim() && EMOJI_RE.test(editForm.venue)) {
    return 'Venue must not contain emojis.'
  }
  if (editForm.description.trim() && EMOJI_RE.test(editForm.description)) {
    return 'Description must not contain emojis.'
  }
  if (!selectedDate.value) {
    return 'Mini-event date is required.'
  }
  const parentIso = eventRecord.value?.eventDate
  if (!parentIso) {
    return 'Main event date is unavailable.'
  }
  const subEventIso = calendarDateToUtcIso(selectedDate.value)
  if (!isSubEventDateBeforeParent(subEventIso, parentIso)) {
    return 'Mini-event date must be before the main event date.'
  }
  return null
}

async function loadSubEvent(targetEventId: string, targetSubEventId: string) {
  isLoadingSubEvent.value = true
  try {
    const subEvent = await findSubEventById(targetEventId, targetSubEventId)
    if (!subEvent) {
      toast.add({
        title: 'Mini-event not found',
        description: 'This schedule item may have been removed.',
        color: 'error',
      })
      await navigateTo(schedulesLink.value)
      return
    }
    subEventRecord.value = subEvent
    populateEditForm(subEvent)
    await refreshRsvpSummary()
  } catch (error) {
    reportApiError(toast, { title: 'Could not load mini-event', error })
    subEventRecord.value = null
  } finally {
    isLoadingSubEvent.value = false
  }
}

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    eventRecord.value = null
    subEventRecord.value = null
    rsvpSummary.value = null
    return
  }
  if (!subEventId.value && !isUiOnlyMode.value) {
    eventRecord.value = null
    subEventRecord.value = null
    rsvpSummary.value = null
    return
  }

  const targetEventId = eventId.value || 'mock-event-id'
  const targetSubEventId = subEventId.value || 'mock-sub-event-1'
  isLoadingEvent.value = true

  try {
    const detail = await loadPageData({
      fetch: async () => fetchEvent(targetEventId),
      mock: () => ({
        event: {
          _id: targetEventId,
          eventType: 'WEDDING',
          eventName: "Jane & John's Wedding",
          description: 'Mock event',
          venue: 'Manila Cathedral',
          eventDate: '2026-05-18T00:00:00.000Z',
          status: 'ONGOING',
        } satisfies EventRecord,
        guestList: [],
        rsvpSummary: null,
        tasks: null,
      }),
    })
    eventRecord.value = detail.event
    setActiveEvent(detail.event)
    await loadSubEvent(targetEventId, targetSubEventId)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
    finishPageTransition()
  }
}

async function handleSaveChanges() {
  const validationError = validateEditForm()
  if (validationError) {
    toast.add({ title: 'Validation error', description: validationError, color: 'error' })
    return
  }
  if (!selectedDate.value || mutationsDisabled.value) {
    return
  }

  const targetSubEventId = subEventId.value || 'mock-sub-event-1'
  isSaving.value = true
  try {
    const updated = await updateSubEvent(targetSubEventId, {
      name: editForm.name.trim(),
      venue: editForm.venue.trim() || null,
      description: editForm.description.trim() || null,
      eventDate: calendarDateToUtcIso(selectedDate.value),
    })
    subEventRecord.value = updated
    populateEditForm(updated)
    isEditModalOpen.value = false
    toast.add({
      title: 'Mini-event updated',
      description: 'Your changes have been saved.',
      color: 'success',
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not update mini-event', error })
  } finally {
    isSaving.value = false
  }
}

async function handleDeleteSubEvent() {
  if (mutationsDisabled.value) {
    return
  }

  const targetSubEventId = subEventId.value || 'mock-sub-event-1'
  isDeleting.value = true
  try {
    await deleteSubEvent(targetSubEventId)
    toast.add({
      title: 'Mini-event deleted',
      description: 'The schedule item has been removed.',
      color: 'success',
    })
    isDeleteModalOpen.value = false
    await navigateTo(schedulesLink.value)
  } catch (error) {
    reportApiError(toast, { title: 'Could not delete mini-event', error })
  } finally {
    isDeleting.value = false
  }
}

onMounted(() => {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    navigateTo('/')
    return
  }
  if (!subEventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing mini-event',
      description: 'Select a schedule item from the schedules list.',
      color: 'error',
    })
    navigateTo(schedulesLink.value)
    return
  }
  loadEventData()
})

watch([eventId, subEventId], () => {
  loadEventData()
})
</script>

<template>
  <UContainer class="space-y-6 py-8 pb-12">
    <div
      v-if="isLoadingEvent || isLoadingSubEvent"
      class="flex items-center justify-center py-16 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading mini-event...</span>
    </div>

    <template v-else-if="subEventRecord">
      <UPageCard class="white-bread-container space-y-6">
        <UAlert
          v-if="isEventCancelled"
          color="warning"
          variant="subtle"
          title="Event cancelled"
          description="Mini-event details and invitations cannot be modified for a cancelled event."
        />

        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1 min-w-0 flex-1">
            <p class="text-2xl font-bold text-highlighted">
              {{ subEventRecord.name }}
            </p>
            <div class="flex flex-wrap items-center gap-3 text-sm text-muted">
              <span v-if="subEventRecord.eventDate">
                <UIcon name="i-lucide-calendar" class="inline size-4 -mt-0.5" />
                {{ subEventRecord.eventDate ? df.format(new Date(subEventRecord.eventDate)) : 'Date TBD' }}
              </span>
              <span v-if="subEventRecord.venue">
                <UIcon name="i-lucide-map-pin" class="inline size-4 -mt-0.5" />
                {{ subEventRecord.venue }}
              </span>
            </div>
            <p v-if="subEventRecord.description" class="text-sm text-muted">
              {{ subEventRecord.description }}
            </p>
          </div>
          <UButton
            color="cyan"
            variant="outline"
            icon="i-lucide-pencil"
            :disabled="mutationsDisabled"
            @click="openEditModal"
          >
            Edit Event
          </UButton>
        </div>

        <UPageCard class="bg-cyan-50 dark:bg-cyan-900/20 ring ring-inset ring-cyan-500/25">
          <div class="grid gap-6 sm:grid-cols-2 sm:items-center">
            <div class="space-y-1">
              <p class="text-sm font-medium text-cyan-600/70 dark:text-cyan-400/70">
                RSVPs Sent
              </p>
              <p class="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                {{ rsvpSummary?.totalSent?.toLocaleString() ?? 0 }}
              </p>
            </div>
            <PieChart
              title="Response Status"
              :data="chartData"
              :colors="RSVP_CHART_COLORS"
            />
          </div>
        </UPageCard>
      </UPageCard>

      <UPageCard class="white-bread-container space-y-4">
        <div>
          <p class="text-lg font-semibold text-highlighted">Mini Dashboard</p>
          <p class="text-sm text-muted">
            Quick tools for managing this mini-event.
          </p>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-5 py-2 max-w-2xl mx-auto w-full items-start justify-items-center">
          <button
            v-for="item in miniDashboardButtons"
            :key="item.label"
            type="button"
            class="group flex flex-col items-center justify-center w-full p-1.5 rounded-xl focus-visible:outline-none text-center cursor-pointer select-none"
          >
            <div
              class="size-12 sm:size-13 flex items-center justify-center rounded-full transition-all duration-200 aspect-square shrink-0 shadow-sm group-hover:scale-105 group-active:scale-95"
              :class="[item.bgClass, item.hoverClass]"
            >
              <UIcon :name="item.icon" class="size-5 sm:size-6 text-white shrink-0" />
            </div>
            <span class="font-medium mt-1.5 text-center text-xs sm:text-sm leading-tight text-highlighted">
              {{ item.label }}
            </span>
          </button>
        </div>
      </UPageCard>

      <UPageCard class="white-bread-container space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-lg font-semibold text-highlighted">Invitations</p>
            <p class="text-sm text-muted">
              Send mini-event RSVPs to guests on your main guest list. Responses track attendance status only.
            </p>
          </div>
          <UButton
            color="cyan"
            icon="i-lucide-user-plus"
            :disabled="!canInviteGuests || isSendingInvites"
            @click="openInviteGuestModal"
          >
            Invite Guest
          </UButton>
        </div>

        <div
          v-if="isLoadingGuests"
          class="flex items-center justify-center py-12 text-muted"
        >
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
          <span class="ml-2 text-sm">Loading guests...</span>
        </div>

        <div
          v-else-if="isGuestListEmpty"
          class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center"
        >
          <UIcon name="i-lucide-mail" class="size-10 text-muted" />
          <p class="mt-4 text-base font-medium">No invitations sent yet</p>
          <p class="mt-1 max-w-sm text-sm text-muted">
            Use Invite Guest to pick guests from your main guest list or invite someone outside your guest list.
          </p>
          <UButton
            v-if="canInviteGuests"
            class="mt-4"
            color="cyan"
            icon="i-lucide-user-plus"
            @click="openInviteGuestModal"
          >
            Invite Guest
          </UButton>
        </div>

        <UTable v-else :columns="columns" :data="tableRows" />
      </UPageCard>

      <UPageCard class="white-bread-container ring ring-inset ring-error/30">
        <div class="space-y-4">
          <div>
            <p class="text-lg font-semibold text-error">Danger Zone</p>
            <p class="text-sm text-muted">
              Permanently delete this mini-event and its RSVP records. This cannot be undone.
            </p>
          </div>
          <UButton
            color="error"
            variant="outline"
            icon="i-lucide-trash-2"
            :disabled="mutationsDisabled"
            @click="isDeleteModalOpen = true"
          >
            Delete Mini-Event
          </UButton>
        </div>
      </UPageCard>
    </template>

    <UModal
      v-model:open="isEditModalOpen"
      title="Edit Event"
      :dismissible="!isSaving"
      :ui="{ content: 'border-none ring-transparent max-w-md' }"
    >
      <template #body>
        <p class="text-sm text-muted">
          Update details for this schedule item. Date must be before {{ parentEventDateLabel }}.
        </p>

        <form class="mt-4 space-y-4" @submit.prevent="handleSaveChanges">
          <UFormField label="Name" name="name" required>
            <UInput
              v-model="editForm.name"
              class="w-full"
              :disabled="isSaving || mutationsDisabled"
            />
          </UFormField>

          <UFormField label="Date" name="eventDate" required>
            <UPopover>
              <UButton
                color="neutral"
                variant="outline"
                class="w-full"
                :disabled="isSaving || mutationsDisabled || !maxSubEventDate"
              >
                {{ selectedDateLabel }}
              </UButton>
              <template #content="{ close }">
                <UCalendar
                  v-if="maxSubEventDate"
                  v-model="selectedDate"
                  class="p-2"
                  :min-value="minSubEventDate"
                  :max-value="maxSubEventDate"
                  @update:model-value="close"
                />
              </template>
            </UPopover>
          </UFormField>

          <UFormField label="Venue" name="venue">
            <UInput
              v-model="editForm.venue"
              class="w-full"
              placeholder="Optional"
              :disabled="isSaving || mutationsDisabled"
            />
          </UFormField>

          <UFormField label="Description" name="description">
            <UTextarea
              v-model="editForm.description"
              class="w-full"
              placeholder="Optional"
              :disabled="isSaving || mutationsDisabled"
            />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton
              variant="outline"
              color="neutral"
              :disabled="isSaving"
              @click="closeEditModal"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              color="cyan"
              :loading="isSaving"
              :disabled="isSaving || mutationsDisabled"
            >
              Save Changes
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <UModal
      v-model:open="isInviteGuestModalOpen"
      title="Invite Guest"
      :dismissible="!isSendingInvites"
      :ui="{ content: 'border-none ring-transparent max-w-lg' }"
    >
      <template #body>
        <div class="grid grid-cols-2 gap-1 rounded-lg bg-muted/40 p-1">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            :class="inviteModalTab === 'guestlist'
              ? 'bg-white text-highlighted shadow-xs'
              : 'text-muted hover:text-highlighted'"
            :disabled="isSendingInvites"
            @click="inviteModalTab = 'guestlist'"
          >
            Main Guest List
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            :class="inviteModalTab === 'external'
              ? 'bg-white text-highlighted shadow-xs'
              : 'text-muted hover:text-highlighted'"
            :disabled="isSendingInvites"
            @click="inviteModalTab = 'external'"
          >
            Non-Guestlist Person
          </button>
        </div>

        <template v-if="inviteModalTab === 'guestlist'">
          <p class="mt-4 text-sm text-muted">
            Select guests from your main guest list to invite to this schedule.
          </p>

          <UInput
            v-model="inviteSearchQuery"
            class="mt-3 w-full"
            icon="i-lucide-search"
            placeholder="Search by name or email"
            :disabled="isSendingInvites"
          />

          <div
            v-if="filteredUninvitedGuests.length === 0"
            class="mt-6 rounded-lg border border-dashed border-default bg-muted/20 px-4 py-10 text-center text-sm text-muted"
          >
            No uninvited guests from your main guest list. Switch to Non-Guestlist Person to invite someone by email.
          </div>

          <div v-else class="mt-4 max-h-80 overflow-y-auto rounded-lg border border-default">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-muted/50 text-left">
                <tr>
                  <th class="w-10 px-3 py-2">
                    <UCheckbox
                      :model-value="allUninvitedSelected"
                      :indeterminate="someUninvitedSelected"
                      :disabled="isSendingInvites"
                      aria-label="Select all guests"
                      @update:model-value="(value) => toggleSelectAllUninvited(value === true)"
                    />
                  </th>
                  <th class="px-3 py-2 font-medium">Name</th>
                  <th class="px-3 py-2 font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="guest in filteredUninvitedGuests"
                  :key="guest._id"
                  class="border-t border-default"
                >
                  <td class="px-3 py-2">
                    <UCheckbox
                      :model-value="selectedInviteGuestIds.has(guest._id)"
                      :disabled="isSendingInvites"
                      :aria-label="`Select ${formatGuestDisplayName(guest.firstName, guest.lastName)}`"
                      @update:model-value="(value) => toggleInviteSelection(guest._id, value === true)"
                    />
                  </td>
                  <td class="px-3 py-2 font-medium">{{ formatGuestDisplayName(guest.firstName, guest.lastName) }}</td>
                  <td class="px-3 py-2 text-muted">{{ guest.email }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-6 flex justify-end gap-2">
            <UButton
              variant="outline"
              color="neutral"
              :disabled="isSendingInvites"
              @click="closeInviteGuestModal"
            >
              Cancel
            </UButton>
            <UButton
              color="cyan"
              icon="i-lucide-send"
              :loading="isSendingInvites"
              :disabled="selectedInviteCount === 0 || isSendingInvites || !canBulkInvite"
              @click="confirmBulkInvite"
            >
              Send Invitations{{ selectedInviteCount > 0 ? ` (${selectedInviteCount})` : '' }}
            </UButton>
          </div>
        </template>

        <form v-else class="mt-4 space-y-4" @submit.prevent="confirmExternalInvite">
          <p class="text-sm text-muted">
            Invite someone who is not on your main event guest list to this mini-event. They will receive an email invitation and RSVP link without being added to your main guest list.
          </p>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UFormField label="First Name" required>
              <UInput
                v-model="externalPersonForm.firstName"
                class="w-full"
                placeholder="e.g., Maria"
                :disabled="isSendingInvites"
              />
            </UFormField>
            <UFormField label="Last Name" required>
              <UInput
                v-model="externalPersonForm.lastName"
                class="w-full"
                placeholder="e.g., Santos"
                :disabled="isSendingInvites"
              />
            </UFormField>
          </div>

          <UFormField label="Email Address" required>
            <UInput
              v-model="externalPersonForm.email"
              type="email"
              class="w-full"
              placeholder="e.g., maria@example.com"
              :disabled="isSendingInvites"
            />
          </UFormField>

          <p v-if="externalPersonError" class="text-sm text-error">
            {{ externalPersonError }}
          </p>

          <div class="mt-6 flex justify-end gap-2">
            <UButton
              variant="outline"
              color="neutral"
              :disabled="isSendingInvites"
              @click="closeInviteGuestModal"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              color="cyan"
              icon="i-lucide-send"
              :loading="isSendingInvites"
              :disabled="isSendingInvites || !hasEmailCredits"
            >
              Send Invitation
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <UModal
      v-model:open="isUninviteModalOpen"
      title="Uninvite guest"
      :dismissible="!uninvitingGuestId"
      :ui="{ content: 'border-none ring-transparent max-w-md' }"
    >
      <template #body>
        <p class="text-sm text-muted">
          Remove
          <span class="font-medium text-highlighted">{{ guestToUninvite?.displayName }}</span>
          from this schedule?
        </p>
        <p
          v-if="uninviteHasResponse"
          class="mt-3 text-sm text-warning"
        >
          This guest has already responded. Uninviting will remove their RSVP response.
        </p>
        <div class="mt-6 flex justify-end gap-2">
          <UButton
            variant="outline"
            color="neutral"
            :disabled="Boolean(uninvitingGuestId)"
            @click="closeUninviteModal"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            :loading="Boolean(uninvitingGuestId)"
            :disabled="Boolean(uninvitingGuestId)"
            @click="confirmUninvite"
          >
            Uninvite
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isDeleteModalOpen"
      title="Delete Mini-Event"
      :dismissible="!isDeleting"
      :ui="{ content: 'border-none ring-transparent max-w-md' }"
    >
      <template #body>
        <p class="text-sm text-muted">
          Are you sure you want to delete
          <span class="font-medium text-highlighted">{{ subEventRecord?.name }}</span>?
          All mini-event RSVP invitations and responses will be removed.
        </p>
        <div class="mt-6 flex justify-end gap-2">
          <UButton
            variant="outline"
            color="neutral"
            :disabled="isDeleting"
            @click="isDeleteModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            :loading="isDeleting"
            :disabled="isDeleting"
            @click="handleDeleteSubEvent"
          >
            Delete Mini-Event
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
