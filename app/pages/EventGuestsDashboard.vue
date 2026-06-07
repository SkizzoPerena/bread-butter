<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'
import type { EventRecord, GuestRecord, RsvpSummary } from '~/types/event'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { useGuests } from '~/composables/useGuests'
import { useEventGuestsManager, addGuestSchema } from '~/composables/useEventGuestsManager'
import type { GuestTableRow } from '~/composables/useEventGuestsManager'
import { useEventGuestGroupsManager } from '~/composables/useEventGuestGroupsManager'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Guest List',
  bgClass: 'bg-orange-50'
})

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { fetchGuestsByEvent } = useGuests()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const rsvpSummary = ref<RsvpSummary | null>(null)
const guestList = ref<GuestRecord[]>([])
const isLoadingEvent = ref(false)
const isLoadingGuests = ref(false)

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')

const UBadge = resolveComponent('UBadge')
const UCheckbox = resolveComponent('UCheckbox')

const reloadGuestGroupsRef = ref<((targetEventId?: string) => Promise<void>) | null>(null)

const {
  isAddGuestModalOpen,
  isSubmittingGuest,
  sendingGuestId,
  isInvitingAll,
  deletingGuestId,
  isRemoveGuestModalOpen,
  guestToRemove,
  isNoQuestionsWarningOpen,
  addGuestState,
  mutationsDisabled,
  tableRows,
  isGuestListEmpty,
  guestListSize,
  invitationsSentCount,
  canInviteAll,
  rsvpStats,
  handleAddGuest,
  openRemoveGuestModal,
  closeRemoveGuestModal,
  handleRemoveGuest,
  handleInviteAll,
  handleSendGuestInvite,
  confirmInviteWithoutQuestions,
} = useEventGuestsManager({
  eventId,
  eventRecord,
  isEventCancelled,
  rsvpSummary,
  guestList,
  isLoadingGuests,
  autoLoadGuests: false,
  onGuestListMutated: () => reloadGuestGroupsRef.value?.(),
})

const {
  isLoadingGroups,
  isGroupActionLoading,
  searchQuery,
  isGroupAssignmentModalOpen,
  isAddToExistingModalOpen,
  isRenameGroupModalOpen,
  groupAssignmentMode,
  createGroupName,
  renameGroupName,
  targetGroupId,
  assignableGroupOptions,
  displayRows,
  isSearchEmpty,
  showActionBar,
  selectedCount,
  selectedGuestIds,
  selectionContext,
  canGroupGuests,
  showCreateGroupHint,
  canRenameGroup,
  canUngroupAll,
  canAddToExistingGroup,
  canAssignToExistingInModal,
  canUngroupSingle,
  allVisibleSelected,
  someVisibleSelected,
  loadGuestGroups,
  clearSelection,
  toggleSelection,
  toggleSelectAllVisible,
  openGroupAssignmentModal,
  openAddToExistingModal,
  openRenameGroupModal,
  handleGroupAssignment,
  handleAddToExistingGroup,
  handleRenameGroup,
  handleUngroupSingle,
  handleUngroupAll,
} = useEventGuestGroupsManager({
  eventId,
  tableRows,
  mutationsDisabled,
  isUiOnlyMode,
})

reloadGuestGroupsRef.value = loadGuestGroups

const guestModalUi = {
  header: 'bg-orange-500 border-none',
  title: 'text-white font-serif text-xl',
  content: 'border-none ring-transparent w-full max-w-md',
  overlay: 'bg-orange-900/30',
}

const bulkAddLink = computed(() => ({
  path: '/AddGuestsBulk',
  query: eventId.value ? { eventId: eventId.value } : {},
}))

const rsvpMakerLink = computed(() => ({
  path: '/RSVPMaker',
  query: eventId.value ? { eventId: eventId.value } : {},
}))

const columns: TableColumn<GuestTableRow>[] = [
  {
    id: 'select',
    header: () =>
      h(UCheckbox, {
        modelValue: allVisibleSelected.value,
        indeterminate: someVisibleSelected.value,
        disabled: mutationsDisabled.value || displayRows.value.length === 0,
        'aria-label': 'Select all visible guests',
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => {
          toggleSelectAllVisible(value === true)
        },
      }),
    cell: ({ row }) => {
      const person = row.original
      return h(UCheckbox, {
        modelValue: selectedGuestIds.value.has(person.guestId),
        disabled: mutationsDisabled.value,
        'aria-label': `Select ${person.name}`,
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => {
          toggleSelection(person.guestId, value === true)
        },
      })
    },
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const person = row.original
      return h('div', { class: 'space-y-1' }, [
        h('span', { class: 'font-medium' }, person.name),
        person.groupName
          ? h(
              UBadge,
              { variant: 'subtle', color: 'orange', size: 'xs' },
              () => person.groupName
            )
          : null,
      ])
    },
  },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'guests', header: 'Attendants' },
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
    accessorKey: 'invitationSent',
    header: 'Invitation Sent',
    cell: ({ row }) => (row.getValue('invitationSent') ? 'Yes' : 'No'),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const person = row.original
      const canSendInvite =
        !person.invitationSent && !mutationsDisabled.value
      const canRemove = !mutationsDisabled.value

      return h('div', { class: 'flex items-center justify-end gap-1' }, [
        canSendInvite
          ? h(resolveComponent('UButton'), {
              size: 'xs',
              variant: 'ghost',
              color: 'orange',
              icon: 'i-lucide-send',
              loading: sendingGuestId.value === person.guestId,
              disabled: isInvitingAll.value,
              'aria-label': 'Send invitation',
              onClick: () => handleSendGuestInvite(person.guestId),
            })
          : null,
        canRemove
          ? h(resolveComponent('UButton'), {
              size: 'xs',
              variant: 'ghost',
              color: 'error',
              icon: 'i-lucide-trash-2',
              loading: deletingGuestId.value === person.guestId,
              'aria-label': 'Remove guest',
              onClick: () => openRemoveGuestModal(person),
            })
          : null,
      ])
    },
  },
]

async function loadGuestList(targetEventId: string) {
  isLoadingGuests.value = true
  try {
    guestList.value = await fetchGuestsByEvent(targetEventId)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load guests', error })
    guestList.value = []
  } finally {
    isLoadingGuests.value = false
  }
}

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    eventRecord.value = null
    rsvpSummary.value = null
    guestList.value = []
    return
  }

  const targetEventId = eventId.value || 'mock-event-id'
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
        rsvpSummary: {
          totalSent: 100,
          going: 60,
          notGoing: 15,
          pending: 25,
        },
        tasks: null,
      }),
    })
    eventRecord.value = detail.event
    rsvpSummary.value = detail.rsvpSummary
    setActiveEvent(detail.event)

    await Promise.all([loadGuestList(targetEventId), loadGuestGroups(targetEventId)])
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
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
  loadEventData()
})

watch(eventId, () => {
  loadEventData()
})
</script>

<template>
  <UContainer class="space-y-6 py-8 pb-12">

    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            :to="rsvpMakerLink"
            icon="i-lucide-calendar"
          >
            RSVP Maker
          </UButton>
          <UButton
            :to="bulkAddLink"
            icon="i-lucide-users"
            :disabled="mutationsDisabled || (!eventId && !isUiOnlyMode)"
          >
            Bulk Add
          </UButton>
          <UButton
            icon="i-lucide-mail"
            :disabled="!canInviteAll"
            :loading="isInvitingAll"
            @click="handleInviteAll"
          >
            Invite All
          </UButton>
          <UButton
            icon="i-lucide-user-plus"
            color="orange"
            :disabled="mutationsDisabled || (!eventId && !isUiOnlyMode)"
            @click="isAddGuestModalOpen = true"
          >
            Add Guest
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <div
      v-if="isLoadingEvent"
      class="flex items-center justify-center py-16 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading event...</span>
    </div>

    <UPageCard v-else class="white-bread-container space-y-4">

      <UAlert
        v-if="mutationsDisabled"
        color="warning"
        variant="subtle"
        title="Event cancelled"
        description="The guest list cannot be modified for a cancelled event."
      />

      <UPageGrid>
        <UPageCard
          class="bg-orange-50 dark:bg-orange-900/20 ring ring-inset ring-orange-500/25"
          description="Total Invitations Sent"
          :ui="{ title: 'text-orange-600 dark:text-orange-400', description: 'text-orange-600/70 dark:text-orange-400/70' }"
        >
          <template #title>
            <div class="text-2xl font-bold">{{ invitationsSentCount }}/{{ guestListSize }}</div>
          </template>
        </UPageCard>
        <UPageCard
          class="bg-orange-50 dark:bg-orange-900/20 ring ring-inset ring-orange-500/25"
          description="Total Responses"
          :ui="{ title: 'text-orange-600 dark:text-orange-400', description: 'text-orange-600/70 dark:text-orange-400/70' }"
        >
          <template #title>
            <div class="text-2xl font-bold">{{ rsvpStats.responses }}</div>
          </template>
        </UPageCard>
        <UPageCard
          class="bg-orange-50 dark:bg-orange-900/20 ring ring-inset ring-orange-500/25"
          description="Total Attendees"
          :ui="{ title: 'text-orange-600 dark:text-orange-400', description: 'text-orange-600/70 dark:text-orange-400/70' }"
        >
          <template #title>
            <div class="text-2xl font-bold">{{ rsvpStats.attendees }}</div>
          </template>
        </UPageCard>
      </UPageGrid>

      <div
        v-if="isLoadingGuests || isLoadingGroups"
        class="flex items-center justify-center py-12 text-muted"
      >
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
        <span class="ml-2 text-sm">Loading guests...</span>
      </div>

      <div
        v-else-if="isGuestListEmpty"
        class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center"
      >
        <UIcon name="i-lucide-users" class="size-10 text-muted" />
        <p class="mt-4 text-base font-medium">No guests yet</p>
        <p class="mt-1 max-w-sm text-sm text-muted">
          Add guests one at a time or use Bulk Add to import your list and start sending invitations.
        </p>
        <div
          v-if="!mutationsDisabled"
          class="mt-6 flex flex-wrap items-center justify-center gap-2"
        >
          <UButton
            icon="i-lucide-user-plus"
            color="orange"
            @click="isAddGuestModalOpen = true"
          >
            Add Guest
          </UButton>
          <UButton
            :to="bulkAddLink"
            icon="i-lucide-users"
          >
            Bulk Add
          </UButton>
        </div>
      </div>

      <template v-else>
        <UInput
          v-model="searchQuery"
          type="search"
          placeholder="Search by name, email, or group..."
          icon="i-lucide-search"
          class="w-full sm:w-72"
        />

        <div
          v-if="isSearchEmpty"
          class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center"
        >
          <UIcon name="i-lucide-search-x" class="size-10 text-muted" />
          <p class="mt-4 text-base font-medium">No guests match your search</p>
          <p class="mt-1 max-w-sm text-sm text-muted">
            Try a different name, email, or group name. Matching a grouped guest shows their whole group.
          </p>
        </div>

        <div
          v-else
          class="relative"
          :class="showActionBar ? 'pb-24' : ''"
        >
          <UTable
            :data="displayRows"
            :columns="columns"
          />
        </div>

        <div
          v-if="showActionBar"
          class="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-200 bg-white px-4 py-3 shadow-lg dark:border-orange-800 dark:bg-neutral-900"
        >
          <div class="space-y-1">
            <span class="text-sm font-medium text-highlighted">
              {{ selectedCount }} selected
            </span>
            <p
              v-if="showCreateGroupHint"
              class="text-xs text-muted"
            >
              Select at least 2 guests to create a new group
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              v-if="canGroupGuests"
              color="orange"
              icon="i-lucide-users-round"
              :loading="isGroupActionLoading"
              @click="openGroupAssignmentModal"
            >
              Group guests…
            </UButton>
            <UButton
              v-if="canRenameGroup"
              color="orange"
              variant="outline"
              icon="i-lucide-pencil"
              :loading="isGroupActionLoading"
              @click="openRenameGroupModal"
            >
              Rename group
            </UButton>
            <UButton
              v-if="canAddToExistingGroup"
              color="orange"
              variant="outline"
              icon="i-lucide-user-plus"
              :loading="isGroupActionLoading"
              @click="openAddToExistingModal"
            >
              Add to existing group
            </UButton>
            <UButton
              v-if="canUngroupSingle"
              color="neutral"
              variant="outline"
              icon="i-lucide-user-minus"
              :loading="isGroupActionLoading"
              @click="handleUngroupSingle"
            >
              Ungroup
            </UButton>
            <UButton
              v-if="canUngroupAll && (selectionContext === 'same_group' || selectionContext === 'mixed')"
              color="neutral"
              variant="outline"
              icon="i-lucide-user-minus"
              :loading="isGroupActionLoading"
              @click="handleUngroupAll"
            >
              Ungroup all
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="isGroupActionLoading"
              @click="clearSelection"
            >
              Clear
            </UButton>
          </div>
        </div>
      </template>

      <UModal
        v-model:open="isAddGuestModalOpen"
        title="Add Guest"
        :ui="guestModalUi"
        :close="{ variant: 'link', class: 'rounded-full text-white' }"
        :dismissible="!isSubmittingGuest"
      >
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
                :disabled="mutationsDisabled"
              />
            </UFormField>
            <UFormField label="Email" name="email" required>
              <UInput
                v-model="addGuestState.email"
                type="email"
                class="w-full"
                placeholder="jdelacruz@example.com"
                :disabled="mutationsDisabled"
              />
            </UFormField>
            <UButton
              type="submit"
              block
              color="orange"
              class="mt-4"
              :loading="isSubmittingGuest"
              :disabled="mutationsDisabled"
            >
              Add Guest
            </UButton>
          </UForm>
        </template>
      </UModal>

      <UModal
        v-model:open="isGroupAssignmentModalOpen"
        title="Group guests"
        :ui="{ content: 'border-none ring-transparent max-w-md' }"
        :dismissible="!isGroupActionLoading"
      >
        <template #body>
          <p class="mb-4 text-sm text-muted">
            Group {{ selectedCount }} guests together. A group requires at least 2 members.
          </p>
          <div
            v-if="canAssignToExistingInModal"
            class="mb-4 flex gap-2"
          >
            <UButton
              label="Create new group"
              :color="groupAssignmentMode === 'new' ? 'orange' : 'neutral'"
              :variant="groupAssignmentMode === 'new' ? 'solid' : 'outline'"
              class="flex-1"
              :disabled="isGroupActionLoading"
              @click="groupAssignmentMode = 'new'"
            />
            <UButton
              label="Add to existing"
              :color="groupAssignmentMode === 'existing' ? 'orange' : 'neutral'"
              :variant="groupAssignmentMode === 'existing' ? 'solid' : 'outline'"
              class="flex-1"
              :disabled="isGroupActionLoading"
              @click="groupAssignmentMode = 'existing'"
            />
          </div>
          <UFormField
            v-if="groupAssignmentMode === 'new'"
            label="Group name (optional)"
            name="groupName"
          >
            <UInput
              v-model="createGroupName"
              class="w-full"
              placeholder="Smith Family"
              :disabled="isGroupActionLoading"
            />
          </UFormField>
          <UFormField
            v-else
            label="Group"
            name="targetGroup"
            required
          >
            <USelect
              v-model="targetGroupId"
              :items="assignableGroupOptions"
              value-key="value"
              label-key="label"
              class="w-full"
              :disabled="isGroupActionLoading"
            />
          </UFormField>
          <div class="mt-4 flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isGroupActionLoading"
              @click="isGroupAssignmentModalOpen = false"
            />
            <UButton
              :label="groupAssignmentMode === 'new' ? 'Create group' : 'Add to group'"
              color="orange"
              :loading="isGroupActionLoading"
              :disabled="groupAssignmentMode === 'existing' && !targetGroupId"
              @click="handleGroupAssignment"
            />
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="isAddToExistingModalOpen"
        title="Add to existing group"
        :ui="{ content: 'border-none ring-transparent max-w-md' }"
        :dismissible="!isGroupActionLoading"
      >
        <template #body>
          <p class="mb-4 text-sm text-muted">
            Add the selected guest to an existing group.
          </p>
          <UFormField label="Group" name="targetGroup" required>
            <USelect
              v-model="targetGroupId"
              :items="assignableGroupOptions"
              value-key="value"
              label-key="label"
              class="w-full"
              :disabled="isGroupActionLoading"
            />
          </UFormField>
          <div class="mt-4 flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isGroupActionLoading"
              @click="isAddToExistingModalOpen = false"
            />
            <UButton
              label="Add to group"
              color="orange"
              :loading="isGroupActionLoading"
              :disabled="!targetGroupId"
              @click="handleAddToExistingGroup"
            />
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="isRenameGroupModalOpen"
        title="Rename group"
        :ui="{ content: 'border-none ring-transparent max-w-md' }"
        :dismissible="!isGroupActionLoading"
      >
        <template #body>
          <p class="mb-4 text-sm text-muted">
            Rename the group shared by all selected guests.
          </p>
          <UFormField label="Group name" name="renameGroupName">
            <UInput
              v-model="renameGroupName"
              class="w-full"
              placeholder="Smith Family"
              :disabled="isGroupActionLoading"
            />
          </UFormField>
          <div class="mt-4 flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isGroupActionLoading"
              @click="isRenameGroupModalOpen = false"
            />
            <UButton
              label="Save"
              color="orange"
              :loading="isGroupActionLoading"
              @click="handleRenameGroup"
            />
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="isRemoveGuestModalOpen"
        title="Remove guest"
        :ui="{ content: 'border-none ring-transparent max-w-md' }"
        :dismissible="!deletingGuestId"
      >
        <template #body>
          <p class="mb-4 text-sm text-muted">
            Remove
            <span class="font-medium text-highlighted">{{ guestToRemove?.name }}</span>
            from the guest list?
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              label="Back"
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

      <UModal
        v-model:open="isNoQuestionsWarningOpen"
        title="No RSVP questions"
        :ui="{ content: 'border-none ring-transparent max-w-md' }"
      >
        <template #body>
          <p class="mb-4 text-sm text-muted">
            This event has no RSVP questions configured. Invitations may not collect
            meaningful responses until you set up RSVP questions in RSVP Maker.
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              @click="isNoQuestionsWarningOpen = false"
            />
            <UButton
              label="Send anyway"
              color="orange"
              @click="confirmInviteWithoutQuestions"
            />
          </div>
        </template>
      </UModal>
    </UPageCard>
  </UContainer>
</template>
