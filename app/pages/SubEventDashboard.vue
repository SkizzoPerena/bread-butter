<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'
import {
  CalendarDate,
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
  title: 'Sub-Event',
  bgClass: 'bg-pink-50',
})

const RSVP_CHART_COLORS = ['#ec4899', '#f43f5e', '#f59e0b']
const EMOJI_RE = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { findSubEventById, updateSubEvent, deleteSubEvent } = useSubEvents()
const { fetchAllSubEventRsvps } = useSubEventRsvps()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()

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
  path: '/EventSchedulesDashboard',
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

const uninviteHasResponse = computed(
  () =>
    guestToUninvite.value?.rsvpStatus === 'Attending'
    || guestToUninvite.value?.rsvpStatus === 'Not Attending'
)

function openInviteGuestModal() {
  clearInviteSelection()
  isInviteGuestModalOpen.value = true
}

function closeInviteGuestModal() {
  if (isSendingInvites.value) {
    return
  }
  isInviteGuestModalOpen.value = false
  clearInviteSelection()
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
    cell: ({ row }) =>
      h('span', { class: 'font-medium' }, row.getValue('displayName') as string),
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
    return 'Sub-event name is required.'
  }
  if (EMOJI_RE.test(name)) {
    return 'Sub-event name must not contain emojis.'
  }
  if (editForm.venue.trim() && EMOJI_RE.test(editForm.venue)) {
    return 'Venue must not contain emojis.'
  }
  if (editForm.description.trim() && EMOJI_RE.test(editForm.description)) {
    return 'Description must not contain emojis.'
  }
  if (!selectedDate.value) {
    return 'Sub-event date is required.'
  }
  const parentIso = eventRecord.value?.eventDate
  if (!parentIso) {
    return 'Main event date is unavailable.'
  }
  const subEventIso = calendarDateToUtcIso(selectedDate.value)
  if (!isSubEventDateBeforeParent(subEventIso, parentIso)) {
    return 'Sub-event date must be before the main event date.'
  }
  return null
}

async function loadSubEvent(targetEventId: string, targetSubEventId: string) {
  isLoadingSubEvent.value = true
  try {
    const subEvent = await findSubEventById(targetEventId, targetSubEventId)
    if (!subEvent) {
      toast.add({
        title: 'Sub-event not found',
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
    reportApiError(toast, { title: 'Could not load sub-event', error })
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
      title: 'Sub-event updated',
      description: 'Your changes have been saved.',
      color: 'success',
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not update sub-event', error })
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
      title: 'Sub-event deleted',
      description: 'The schedule item has been removed.',
      color: 'success',
    })
    isDeleteModalOpen.value = false
    await navigateTo(schedulesLink.value)
  } catch (error) {
    reportApiError(toast, { title: 'Could not delete sub-event', error })
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
    navigateTo('/UserDashboard')
    return
  }
  if (!subEventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing sub-event',
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
      <span class="ml-2 text-sm">Loading sub-event...</span>
    </div>

    <template v-else-if="subEventRecord">
      <UPageCard class="white-bread-container space-y-6">
        <UAlert
          v-if="isEventCancelled"
          color="warning"
          variant="subtle"
          title="Event cancelled"
          description="Sub-event details and invitations cannot be modified for a cancelled event."
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
            color="pink"
            variant="outline"
            icon="i-lucide-pencil"
            :disabled="mutationsDisabled"
            @click="openEditModal"
          >
            Edit Event
          </UButton>
        </div>

        <UPageCard class="bg-pink-50 dark:bg-pink-900/20 ring ring-inset ring-pink-500/25">
          <div class="grid gap-6 sm:grid-cols-2 sm:items-center">
            <div class="space-y-1">
              <p class="text-sm font-medium text-pink-600/70 dark:text-pink-400/70">
                RSVPs Sent
              </p>
              <p class="text-3xl font-bold text-pink-600 dark:text-pink-400">
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
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-lg font-semibold text-highlighted">Invitations</p>
            <p class="text-sm text-muted">
              Send sub-event RSVPs to guests on your main guest list. Responses track attendance status only.
            </p>
          </div>
          <UButton
            color="pink"
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
            Use Invite Guest to pick guests from your main guest list.
          </p>
          <UButton
            v-if="canInviteGuests"
            class="mt-4"
            color="pink"
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
              Permanently delete this sub-event and its RSVP records. This cannot be undone.
            </p>
          </div>
          <UButton
            color="error"
            variant="outline"
            icon="i-lucide-trash-2"
            :disabled="mutationsDisabled"
            @click="isDeleteModalOpen = true"
          >
            Delete Sub-Event
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
              color="pink"
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
        <p class="text-sm text-muted">
          Select guests from your main guest list to invite to this schedule.
        </p>

        <UInput
          v-model="inviteSearchQuery"
          class="mt-4 w-full"
          icon="i-lucide-search"
          placeholder="Search by name or email"
          :disabled="isSendingInvites"
        />

        <div
          v-if="filteredUninvitedGuests.length === 0"
          class="mt-6 rounded-lg border border-dashed border-default bg-muted/20 px-4 py-10 text-center text-sm text-muted"
        >
          No guests available to invite. Add guests on the Guest List page first.
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
                    :aria-label="`Select ${guest.displayName}`"
                    @update:model-value="(value) => toggleInviteSelection(guest._id, value === true)"
                  />
                </td>
                <td class="px-3 py-2 font-medium">{{ guest.displayName }}</td>
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
            color="pink"
            icon="i-lucide-send"
            :loading="isSendingInvites"
            :disabled="selectedInviteCount === 0 || isSendingInvites"
            @click="confirmBulkInvite"
          >
            Send Invitations{{ selectedInviteCount > 0 ? ` (${selectedInviteCount})` : '' }}
          </UButton>
        </div>
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
      title="Delete Sub-Event"
      :dismissible="!isDeleting"
      :ui="{ content: 'border-none ring-transparent max-w-md' }"
    >
      <template #body>
        <p class="text-sm text-muted">
          Are you sure you want to delete
          <span class="font-medium text-highlighted">{{ subEventRecord?.name }}</span>?
          All sub-event RSVP invitations and responses will be removed.
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
            Delete Sub-Event
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
