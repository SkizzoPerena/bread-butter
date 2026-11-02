<script lang="ts" setup>
import { DateFormatter } from '@internationalized/date'
import type { TableColumn } from '@nuxt/ui'
import type { EventRecord, GuestRecord, RsvpSummary } from '~/types/event'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { useGuests } from '~/composables/useGuests'
import { useEventGuestsManager, addGuestSchema, editGuestSchema } from '~/composables/useEventGuestsManager'
import type { GuestTableRow } from '~/composables/useEventGuestsManager'
import { useEventGuestGroupsManager } from '~/composables/useEventGuestGroupsManager'
import { useEventGuestRolesAndTablesManager } from '~/composables/useEventGuestRolesAndTablesManager'
import type { GuestRoleRecord } from '~/types/guest_role'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Guest List',
  bgClass: 'bg-orange-50'
})

useWeddingFonts()

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { fetchGuestsByEvent } = useGuests()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { isExporting, exportEventPdf } = useEventPdfExport()
const { finishPageTransition } = usePageTransition()

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
const eventTitle = computed(() => eventRecord.value?.eventName ?? '')
const eventDateLabel = computed(() => {
  const dateValue = eventRecord.value?.eventDate
  return dateValue ? df.format(new Date(dateValue)) : ''
})

const UBadge = resolveComponent('UBadge')
const UCheckbox = resolveComponent('UCheckbox')

const reloadGuestDataRef = ref<((targetEventId?: string) => Promise<void>) | null>(null)
const guestRoles = ref<GuestRoleRecord[]>([])
const selectedTab = ref('guest-list')

const {
  isAddGuestModalOpen,
  isEditGuestModalOpen,
  isSubmittingGuest,
  isUpdatingGuest,
  sendingGuestId,
  isInvitingAll,
  deletingGuestId,
  isRemoveGuestModalOpen,
  guestToRemove,
  isNoQuestionsWarningOpen,
  addGuestState,
  editGuestState,
  mutationsDisabled,
  tableRows,
  isGuestListEmpty,
  guestListSize,
  invitationsSentCount,
  canInviteAll,
  canSendGuestInvite,
  remainingEmails,
  hasEmailCredits,
  rsvpStats,
  handleAddGuest,
  openEditGuestModal,
  closeEditGuestModal,
  handleEditGuest,
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
  onGuestListMutated: () => reloadGuestDataRef.value?.(),
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
  groupOptions,
  assignableGroupOptions,
  displayRows,
  groupsBySection,
  isGroupsTabEmpty,
  showActionBar,
  selectedCount,
  selectedGuestIds,
  selectionContext,
  canGroupGuests,
  showCreateGroupHint,
  canRenameGroup,
  canUngroupAll,
  canAddToExistingGroup,
  assignModalGuestCount,
  allUngroupedVisibleSelected,
  someUngroupedVisibleSelected,
  canUngroupSingle,
  guestGroups,
  loadGuestGroups,
  clearSelection,
  toggleSelection,
  openGroupAssignmentModal,
  openAddToExistingModal,
  openAssignGuestsToGroupModal,
  closeAddToExistingModal,
  toggleSelectAllUngrouped,
  openRenameGroupModal,
  handleGroupAssignment,
  handleAddToExistingGroup,
  handleRenameGroup,
  handleRemoveGuestFromGroup,
  openRenameGroupModalForGroup,
  handleUngroupSingle,
  handleUngroupAll,
} = useEventGuestGroupsManager({
  eventId,
  tableRows,
  mutationsDisabled,
  isUiOnlyMode,
  guestRoles,
})

const {
  isLoadingRoles,
  isRoleTableActionLoading,
  isRoleAssignmentModalOpen,
  isRoleUnassignmentModalOpen,
  isTableAssignmentModalOpen,
  roleAssignmentMode,
  targetRoleId,
  targetUnassignRoleId,
  createRoleName,
  targetTableValue,
  roleOptions,
  unassignRoleOptions,
  tableOptions,
  tableAssignmentModalTitle,
  tableAssignmentGuestCount,
  tableAssignmentSubmitLabel,
  canAssignRole,
  canUnassignRole,
  canAssignTable,
  rolesBySection,
  tablesBySection,
  loadGuestRoles,
  loadEventTables,
  reloadAll,
  openRoleAssignmentModal,
  openRoleUnassignmentModal,
  openTableAssignmentModal,
  openGuestTableTransferModal,
  closeTableAssignmentModal,
  handleRoleAssignment,
  handleRoleUnassignment,
  handleRemoveGuestFromRole,
  handleUnassignGuestFromTable,
  handleTableAssignment,
} = useEventGuestRolesAndTablesManager({
  eventId,
  guestList,
  guestRoles,
  tableRows,
  selectedGuestIds,
  mutationsDisabled,
  isUiOnlyMode,
  searchQuery,
  onGuestListMutated: () => reloadGuestDataRef.value?.(),
  clearSelection,
})

// RSVP Filter state & options
type RsvpFilter = 'ALL' | 'ATTENDING' | 'PENDING' | 'NOT_ATTENDING'
const rsvpFilter = ref<RsvpFilter>('ALL')

const rsvpFilterOptions: { key: RsvpFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ATTENDING', label: 'Attending' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'NOT_ATTENDING', label: 'Declined' },
]

// Metric counts
const attendingCount = computed(() => {
  if (rsvpSummary.value) return rsvpSummary.value.going
  return guestList.value.filter((g) => g.rsvp?.status === 'GOING').length
})

const pendingCount = computed(() => {
  if (rsvpSummary.value) return rsvpSummary.value.pending
  return guestList.value.filter((g) => !g.rsvp?.status || g.rsvp?.status === 'PENDING' || g.rsvp?.status === 'NO_RESPONSE').length
})

const declinedCount = computed(() => {
  if (rsvpSummary.value) return rsvpSummary.value.notGoing
  return guestList.value.filter((g) => g.rsvp?.status === 'NOT_GOING').length
})

const responseRate = computed(() => {
  if (guestListSize.value === 0) return 0
  const responses = rsvpStats.value.responses
  return Math.min(100, Math.round((responses / guestListSize.value) * 100))
})

// Filtered rows by RSVP status
const filteredDisplayRows = computed(() => {
  if (rsvpFilter.value === 'ALL') return displayRows.value
  return displayRows.value.filter((row) => {
    if (rsvpFilter.value === 'ATTENDING') return row.rsvpStatus === 'Attending'
    if (rsvpFilter.value === 'NOT_ATTENDING') return row.rsvpStatus === 'Not Attending'
    if (rsvpFilter.value === 'PENDING') return row.rsvpStatus === 'Pending' || row.rsvpStatus === 'No Response'
    return true
  })
})

const hasActiveFilters = computed(() => {
  return Boolean(searchQuery.value.trim().length > 0 || rsvpFilter.value !== 'ALL')
})

function clearFilters() {
  searchQuery.value = ''
  rsvpFilter.value = 'ALL'
}

// Checkbox selection across filtered rows
const isAllFilteredVisibleSelected = computed(() => {
  const visible = filteredDisplayRows.value
  if (visible.length === 0) return false
  return visible.every((row) => selectedGuestIds.value.has(row.guestId))
})

const isSomeFilteredVisibleSelected = computed(() => {
  const visible = filteredDisplayRows.value
  if (visible.length === 0) return false
  const selected = visible.filter((row) => selectedGuestIds.value.has(row.guestId))
  return selected.length > 0 && selected.length < visible.length
})

function toggleSelectAllFilteredVisible(checked: boolean) {
  for (const row of filteredDisplayRows.value) {
    toggleSelection(row.guestId, checked)
  }
}

const guestModalUi = {
  header: 'bg-orange-500 border-none',
  title: 'text-white font-serif text-xl',
  content: 'border-none ring-transparent w-full max-w-md',
  overlay: 'bg-orange-900/30',
}

const tabButtons = computed(() => [
  {
    key: 'guest-list',
    label: 'Guest List',
    count: guestListSize.value,
    icon: 'i-lucide-users',
  },
  {
    key: 'groups',
    label: 'Groups',
    count: guestGroups.value.length,
    icon: 'i-lucide-users-round',
  },
  {
    key: 'roles',
    label: 'Roles',
    count: guestRoles.value.length,
    icon: 'i-lucide-theater',
  },
  {
    key: 'tables',
    label: 'Tables',
    count: tablesBySection.value.length,
    icon: 'i-lucide-layout-grid',
  },
])

const isRolesTabEmpty = computed(
  () => rolesBySection.value.length === 0 && !isLoadingRoles.value
)

const isTablesTabEmpty = computed(() => tablesBySection.value.length === 0)

const showGuestListActionBar = computed(
  () => showActionBar.value && selectedTab.value === 'guest-list'
)

const showTablesActionBar = computed(
  () => showActionBar.value && selectedTab.value === 'tables'
)

const showGroupsActionBar = computed(
  () => showActionBar.value && selectedTab.value === 'groups' && canAddToExistingGroup.value
)

const canAssignUngroupedToGroup = computed(
  () => !mutationsDisabled.value && guestGroups.value.length > 0
)

const canAssignToExistingInModal = computed(
  () => guestGroups.value.length > 0
)

function rsvpStatusColor(status: string): 'success' | 'error' | 'warning' | 'secondary' {
  if (status === 'Attending') return 'success'
  if (status === 'Not Attending') return 'error'
  if (status === 'No Response') return 'warning'
  return 'secondary'
}

const bulkAddLink = computed(() => ({
  path: '/event/add-guests-bulk',
  query: eventId.value ? { eventId: eventId.value } : {},
}))

const rsvpMakerLink = computed(() => ({
  path: '/event/rsvp',
  query: eventId.value ? { eventId: eventId.value } : {},
}))

const emailCreditsLink = computed(() => {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  return {
    path: '/event/email-credits',
    query: id ? { eventId: id } : {},
  }
})

const columns: TableColumn<GuestTableRow>[] = [
  {
    id: 'select',
    header: () =>
      h(UCheckbox, {
        modelValue: isAllFilteredVisibleSelected.value,
        indeterminate: isSomeFilteredVisibleSelected.value,
        disabled: mutationsDisabled.value || filteredDisplayRows.value.length === 0,
        'aria-label': 'Select all visible guests',
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => {
          toggleSelectAllFilteredVisible(value === true)
        },
      }),
    cell: ({ row }) => {
      const person = row.original
      return h(UCheckbox, {
        modelValue: selectedGuestIds.value.has(person.guestId),
        disabled: mutationsDisabled.value,
        'aria-label': `Select ${person.displayName}`,
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => {
          toggleSelection(person.guestId, value === true)
        },
      })
    },
  },
  {
    accessorKey: 'displayName',
    header: 'Name',
    cell: ({ row }) => {
      const person = row.original
      const showEnvelope =
        person.envelopeName.trim()
        && person.envelopeName.trim().toLowerCase()
          !== person.displayName.trim().toLowerCase()

      return h('div', { class: 'space-y-1' }, [
        h('span', { class: 'font-medium text-highlighted' }, person.displayName),
        showEnvelope
          ? h('p', { class: 'text-xs text-muted' }, `Envelope: ${person.envelopeName}`)
          : null,
        h('div', { class: 'flex flex-wrap gap-1' }, [
          person.groupName
            ? h(
                UBadge,
                { variant: 'subtle', color: 'orange', size: 'xs' },
                () => person.groupName
              )
            : null,
          ...(person.roleNames ?? []).map((roleName) =>
            h(
              UBadge,
              { variant: 'subtle', color: 'neutral', size: 'xs' },
              () => roleName
            )
          ),
        ]),
      ])
    },
  },
  { accessorKey: 'email', header: 'Email' },
  {
    accessorKey: 'tableLabel',
    header: 'Table',
    cell: ({ row }) => row.original.tableLabel ?? '—',
  },
  {
    accessorKey: 'rsvpStatus',
    header: 'RSVP Status',
    cell: ({ row }) => {
      const color = {
        Attending: 'success' as const,
        'Not Attending': 'error' as const,
        Pending: 'secondary' as const,
        'No Response': 'warning' as const,
      }[row.getValue('rsvpStatus') as string]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
        row.getValue('rsvpStatus')
      )
    },
  },
  {
    accessorKey: 'invitationSent',
    header: 'Invitation Sent',
    cell: ({ row }) => row.original.inviteDelivery,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const person = row.original
      const canEdit = !mutationsDisabled.value
      const canSendInvite = canSendGuestInvite(person)
      const canRemove = !mutationsDisabled.value
      const isSendingThisGuest = sendingGuestId.value === person.guestId

      return h('div', { class: 'flex items-center justify-end gap-1' }, [
        canEdit
          ? h(resolveComponent('UButton'), {
              size: 'xs',
              variant: 'ghost',
              color: 'neutral',
              icon: 'i-lucide-pencil',
              'aria-label': 'Edit guest',
              title: 'Edit guest',
              onClick: () => openEditGuestModal(person),
            })
          : null,
        canSendInvite
          ? h(resolveComponent('UButton'), {
              size: 'xs',
              variant: 'ghost',
              color: 'orange',
              icon: 'i-lucide-send',
              loading: isSendingThisGuest,
              disabled: mutationsDisabled.value || Boolean(sendingGuestId.value),
              'aria-label': 'Send invitation',
              title: 'Send invitation',
              onClick: () => handleSendGuestInvite(person.guestId),
            })
          : h(resolveComponent('UButton'), {
              size: 'xs',
              variant: 'ghost',
              color: 'neutral',
              icon: 'i-lucide-mail-check',
              loading: isSendingThisGuest,
              disabled: mutationsDisabled.value || Boolean(sendingGuestId.value),
              'aria-label': 'Resend invitation',
              title: 'Resend invitation',
              onClick: () => handleSendGuestInvite(person.guestId),
            }),
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

async function reloadGuestData(targetEventId?: string) {
  const id = targetEventId ?? eventId.value
  if (!id) return
  await Promise.all([
    loadGuestList(id),
    loadGuestGroups(id),
    reloadAll(id),
  ])
}

reloadGuestDataRef.value = reloadGuestData

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

    await reloadGuestData(targetEventId)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
    finishPageTransition()
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
  loadEventData()
})

watch(eventId, () => {
  loadEventData()
})
</script>

<template>
  <div
    class="guests-page-root w-full min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-4 lg:overflow-hidden bg-bread-50/30">
    <!-- Navbar Teleport Actions -->
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div class="flex items-center gap-2">
          <UButton
            :to="rsvpMakerLink"
            icon="i-lucide-calendar"
            color="neutral"
            variant="ghost"
            size="sm"
            class="cursor-pointer font-sans"
          >
            RSVP Maker
          </UButton>
          <UButton
            icon="i-lucide-file-down"
            color="neutral"
            variant="outline"
            size="sm"
            :loading="isExporting"
            :disabled="!eventId || isExporting"
            @click="exportEventPdf(eventId, 'guests')"
          >
            Export PDF
          </UButton>
          <UButton
            v-if="canInviteAll"
            icon="i-lucide-mail"
            color="orange"
            variant="soft"
            size="sm"
            :loading="isInvitingAll"
            :disabled="isInvitingAll"
            @click="handleInviteAll"
          >
            Invite All
          </UButton>
          <UButton
            icon="i-lucide-user-plus"
            color="orange"
            size="sm"
            :disabled="mutationsDisabled || (!eventId && !isUiOnlyMode)"
            @click="() => { isAddGuestModalOpen = true }"
          >
            Add Guest
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- ================= LEFT DIVISION (col-span-1): Navigation & Guest Metrics ================= -->
    <aside
      class="col-span-1 lg:col-span-1 w-full bg-white border-b lg:border-b-0 shadow-xs flex flex-col justify-between lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] z-20 overflow-y-auto p-4 sm:p-5 lg:p-6 space-y-6">
      <div class="space-y-6">
        <!-- 1. Guest Views (Navigation Buttons - 2x2 Grid) -->
        <div class="space-y-2">
          <div class="flex items-center justify-between pb-0.5">
            <h2 class="font-bold font-serif text-sm text-highlighted">
              Navigation
            </h2>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="btn in tabButtons"
              :key="btn.key"
              type="button"
              class="w-full flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all min-w-0"
              :class="selectedTab === btn.key
                ? 'bg-orange-500 border-orange-500 text-white shadow-xs font-semibold'
                : 'bg-white border-bread-200/80 text-toast-800 hover:bg-bread-50 hover:text-toast-900'"
              @click="selectedTab = btn.key"
            >
              <div class="flex items-center gap-1.5 min-w-0">
                <UIcon
                  :name="btn.icon"
                  class="size-4 shrink-0"
                  :class="selectedTab === btn.key ? 'text-white' : 'text-orange-500'"
                />
                <span class="text-xs font-sans truncate">{{ btn.label }}</span>
              </div>
              <span
                class="text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ml-1"
                :class="selectedTab === btn.key ? 'bg-white/20 text-white' : 'bg-bread-100 text-toast-700'"
              >
                {{ btn.count }}
              </span>
            </button>
          </div>
        </div>

        <!-- 3. Guest Overview (Metrics) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between pb-1">
            <h2 class="font-bold font-serif text-sm text-highlighted">
              Guest Overview
            </h2>
            <span class="text-xs text-muted font-sans font-medium">
              {{ guestListSize }} total
            </span>
          </div>

          <!-- Status Metrics Tiles (Attending, Pending, Declined) -->
          <div class="grid grid-cols-3 gap-2">
            <!-- Attending (Green) -->
            <button
              type="button"
              class="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-2.5 flex flex-col justify-between transition-all hover:bg-emerald-50 text-left cursor-pointer"
              :class="rsvpFilter === 'ATTENDING' ? 'ring-2 ring-emerald-400 bg-emerald-100/60 shadow-xs' : ''"
              :title="rsvpFilter === 'ATTENDING' ? 'Click to show all guests' : 'Filter by Attending'"
              @click="rsvpFilter = rsvpFilter === 'ATTENDING' ? 'ALL' : 'ATTENDING'">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-emerald-700 font-sans">Attending</span>
                <UIcon name="i-lucide-check-circle-2" class="size-3.5 text-emerald-500" />
              </div>
              <span class="text-xl sm:text-2xl font-bold font-serif text-emerald-800 tracking-tight mt-1">
                {{ attendingCount }}
              </span>
            </button>

            <!-- Pending (Amber) -->
            <button
              type="button"
              class="bg-amber-50/70 border border-amber-200/70 rounded-xl p-2.5 flex flex-col justify-between transition-all hover:bg-amber-100/60 text-left cursor-pointer"
              :class="rsvpFilter === 'PENDING' ? 'ring-2 ring-amber-400 bg-amber-100/80 shadow-xs' : ''"
              :title="rsvpFilter === 'PENDING' ? 'Click to show all guests' : 'Filter by Pending'"
              @click="rsvpFilter = rsvpFilter === 'PENDING' ? 'ALL' : 'PENDING'">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-amber-700 font-sans">Pending</span>
                <UIcon name="i-lucide-clock" class="size-3.5 text-amber-500" />
              </div>
              <span class="text-xl sm:text-2xl font-bold font-serif text-amber-900 tracking-tight mt-1">
                {{ pendingCount }}
              </span>
            </button>

            <!-- Declined (Red) -->
            <button
              type="button"
              class="bg-red-50/60 border border-red-200/60 rounded-xl p-2.5 flex flex-col justify-between transition-all hover:bg-red-100/50 text-left cursor-pointer"
              :class="rsvpFilter === 'NOT_ATTENDING' ? 'ring-2 ring-red-400 bg-red-100/80 shadow-xs' : ''"
              :title="rsvpFilter === 'NOT_ATTENDING' ? 'Click to show all guests' : 'Filter by Declined'"
              @click="rsvpFilter = rsvpFilter === 'NOT_ATTENDING' ? 'ALL' : 'NOT_ATTENDING'">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-red-700 font-sans">Declined</span>
                <UIcon name="i-lucide-x-circle" class="size-3.5 text-red-500" />
              </div>
              <span class="text-xl sm:text-2xl font-bold font-serif text-red-800 tracking-tight mt-1">
                {{ declinedCount }}
              </span>
            </button>
          </div>

          <!-- Secondary Metrics: Invitations & Email Credits -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <div class="bg-toast-50/60 border border-bread-200/60 rounded-xl p-2.5 flex flex-col justify-between">
              <span class="text-[11px] font-semibold text-toast-700 font-sans">Invites Sent</span>
              <span class="text-lg sm:text-xl font-bold font-serif text-highlighted tracking-tight mt-1">
                {{ invitationsSentCount }}/{{ guestListSize }}
              </span>
            </div>

            <div class="bg-toast-50/60 border border-bread-200/60 rounded-xl p-2.5 flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-toast-700 font-sans">Email Credits</span>
                <NuxtLink :to="emailCreditsLink" class="text-[10px] text-orange-600 hover:text-orange-700 font-semibold underline">
                  Buy
                </NuxtLink>
              </div>
              <span class="text-lg sm:text-xl font-bold font-serif text-highlighted tracking-tight mt-1">
                {{ remainingEmails?.toLocaleString() ?? '—' }}
              </span>
            </div>
          </div>

          <!-- Response Rate Progress Card -->
          <div class="bg-toast-50/70 border border-bread-200/60 rounded-xl p-3.5 space-y-2">
            <div class="flex items-center justify-between text-xs font-sans">
              <span class="font-semibold text-toast-800">Response Rate</span>
              <span class="font-bold font-serif text-black text-sm">{{ responseRate }}%</span>
            </div>
            <UProgress :model-value="responseRate" color="primary" size="xs" />
            <div class="flex items-center justify-between text-[11px] text-muted font-sans pt-0.5">
              <span>{{ rsvpStats.responses }} of {{ guestListSize }} responded</span>
              <span v-if="attendingCount > 0" class="text-emerald-700 font-semibold">
                {{ attendingCount }} attending
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Left Panel Bottom Links -->
      <div class="space-y-2 pt-4">
        <UButton
          icon="i-lucide-users"
          color="neutral"
          variant="outline"
          size="sm"
          block
          class="w-full justify-center"
          :to="bulkAddLink"
          :disabled="mutationsDisabled || (!eventId && !isUiOnlyMode)"
        >
          Bulk Add Guests
        </UButton>
        <UButton
          icon="i-lucide-user-plus"
          color="orange"
          size="md"
          block
          class="w-full font-semibold shadow-xs justify-center py-2.5 transition-all hover:shadow hover:brightness-105 active:scale-[0.99] cursor-pointer"
          :disabled="mutationsDisabled || (!eventId && !isUiOnlyMode)"
          @click="() => { isAddGuestModalOpen = true }"
        >
          Add New Guest
        </UButton>
      </div>
    </aside>

    <!-- ================= RIGHT DIVISION (col-span-3): Scrollable Guests View ================= -->
    <main
      class="col-span-1 lg:col-span-3 w-full h-full lg:h-[calc(100vh-64px)] flex flex-col min-h-0 overflow-hidden bg-toast-50/30">
      <!-- Top Sticky Toolbar -->
      <header
        class="bg-white/95 backdrop-blur border-b border-bread-200/80 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
        <!-- Search and Quick RSVP Filter -->
        <div class="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            type="search"
            placeholder="Search guests by name, email, group, role, or table..."
            class="w-full sm:w-64 md:w-80"
          />

          <!-- Quick RSVP Filter Pills (visible when on Guest List tab) -->
          <div
            v-if="selectedTab === 'guest-list'"
            class="inline-flex items-center p-0.5 bg-toast-100/70 border border-bread-200/50 rounded-lg text-xs font-medium font-sans">
            <button
              v-for="opt in rsvpFilterOptions"
              :key="opt.key"
              type="button"
              class="px-2.5 py-1 rounded-md transition-all cursor-pointer select-none inline-flex items-center gap-1.5"
              :class="rsvpFilter === opt.key ? 'bg-white text-highlighted shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
              @click="rsvpFilter = opt.key">
              <span v-if="opt.key === 'ATTENDING'" class="size-1.5 rounded-full bg-emerald-500" />
              <span v-else-if="opt.key === 'PENDING'" class="size-1.5 rounded-full bg-amber-500" />
              <span v-else-if="opt.key === 'NOT_ATTENDING'" class="size-1.5 rounded-full bg-red-500" />
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Right Action Controls -->
        <div v-if="hasActiveFilters" class="flex items-center gap-2 shrink-0">
          <UButton
            icon="i-lucide-filter-x"
            color="neutral"
            variant="ghost"
            size="sm"
            class="font-sans cursor-pointer text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            @click="clearFilters">
            Clear filters
          </UButton>
        </div>
      </header>

      <!-- Scrollable Body -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 min-h-0 relative">
        <!-- Event Cancelled Warning -->
        <UAlert
          v-if="mutationsDisabled"
          color="warning"
          variant="subtle"
          title="Event cancelled"
          description="The guest list cannot be modified for a cancelled event."
          class="mb-2"
        />

        <!-- No Email Credits Alert -->
        <UAlert
          v-if="!hasEmailCredits && !isUiOnlyMode"
          color="warning"
          variant="subtle"
          title="No email credits remaining"
          description="You have used all invitation emails included in your event plan."
          class="mb-2"
        >
          <template #actions>
            <UButton
              icon="i-lucide-mail-plus"
              color="warning"
              variant="soft"
              size="xs"
              :to="emailCreditsLink"
            >
              Buy Email Credits
            </UButton>
          </template>
        </UAlert>

        <!-- Loading State -->
        <div
          v-if="isLoadingGuests || isLoadingGroups || isLoadingRoles || isLoadingEvent"
          class="flex flex-col items-center justify-center py-20 text-muted"
        >
          <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
          <p class="mt-3 text-sm font-medium">Loading your guests...</p>
        </div>

        <!-- Empty Overall Guest List State -->
        <div
          v-else-if="isGuestListEmpty"
          class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-300 bg-white/70 px-6 py-16 text-center shadow-xs"
        >
          <div class="size-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-3">
            <UIcon name="i-lucide-users" class="size-6" />
          </div>
          <h3 class="text-base font-semibold text-highlighted">No guests yet</h3>
          <p class="mt-1 max-w-sm text-xs text-muted">
            Add guests one at a time or use Bulk Add to import your list and start sending invitations.
          </p>
          <div
            v-if="!mutationsDisabled"
            class="mt-5 flex flex-wrap items-center justify-center gap-2"
          >
            <UButton
              icon="i-lucide-user-plus"
              color="orange"
              size="sm"
              @click="() => { isAddGuestModalOpen = true }"
            >
              Add Guest
            </UButton>
            <UButton
              :to="bulkAddLink"
              icon="i-lucide-users"
              color="neutral"
              variant="outline"
              size="sm"
            >
              Bulk Add
            </UButton>
          </div>
        </div>

        <!-- Tab 1: Guest List Table -->
        <template v-else-if="selectedTab === 'guest-list'">
          <!-- Search / Filter Empty State -->
          <div
            v-if="filteredDisplayRows.length === 0"
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-300 bg-white/70 px-6 py-14 text-center shadow-xs"
          >
            <UIcon name="i-lucide-search-x" class="size-8 text-muted mb-2" />
            <p class="text-sm font-medium text-highlighted">No guests match your search or filter</p>
            <p class="mt-1 max-w-sm text-xs text-muted">
              Try a different search query or select "All" from the RSVP status filter.
            </p>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              class="mt-3 cursor-pointer text-orange-600 hover:text-orange-700"
              @click="clearFilters"
            >
              Clear filters
            </UButton>
          </div>

          <div
            v-else
            class="relative rounded-xl border border-bread-200/80 bg-white shadow-xs overflow-hidden"
            :class="showGuestListActionBar ? 'pb-24' : ''"
          >
            <UTable
              :data="filteredDisplayRows"
              :columns="columns"
            />
          </div>
        </template>

        <!-- Tab 2: Groups -->
        <template v-else-if="selectedTab === 'groups'">
          <div
            v-if="isGroupsTabEmpty"
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-300 bg-white/70 px-6 py-14 text-center shadow-xs"
          >
            <div class="size-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-3">
              <UIcon name="i-lucide-users-round" class="size-6" />
            </div>
            <p class="text-sm font-semibold text-highlighted">No guest groups yet</p>
            <p class="mt-1 max-w-sm text-xs text-muted">
              Select two or more guests on the Guest List tab and click "Group guests…" to create a group.
            </p>
          </div>

          <div
            v-else
            class="space-y-4"
            :class="showGroupsActionBar ? 'pb-24' : ''"
          >
            <div
              v-for="section in groupsBySection"
              :key="section.groupId ?? 'ungrouped'"
              class="rounded-xl border border-bread-200/80 bg-white shadow-xs overflow-hidden"
            >
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-bread-200/80 bg-bread-50/50 px-4 py-3">
                <div class="flex min-w-0 items-center gap-3">
                  <UCheckbox
                    v-if="!section.groupId && !mutationsDisabled && section.guests.length > 0"
                    :model-value="allUngroupedVisibleSelected"
                    :indeterminate="someUngroupedVisibleSelected"
                    aria-label="Select all ungrouped guests"
                    @update:model-value="(value: boolean | 'indeterminate') => toggleSelectAllUngrouped(value === true)"
                  />
                  <h3 class="font-semibold text-highlighted text-sm">
                    {{ section.groupName }}
                    <span class="text-xs font-normal text-muted">({{ section.guests.length }})</span>
                  </h3>
                </div>
                <UButton
                  v-if="!mutationsDisabled && section.groupId"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-pencil"
                  :loading="isGroupActionLoading"
                  @click="openRenameGroupModalForGroup(section.groupId!)"
                >
                  Rename
                </UButton>
              </div>
              <ul class="divide-y divide-bread-100">
                <li
                  v-for="guest in section.guests"
                  :key="`${section.groupId ?? 'ungrouped'}-${guest.guestId}`"
                  class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-bread-50/20 transition-colors"
                >
                  <div class="flex min-w-0 flex-1 items-center gap-3">
                    <UCheckbox
                      v-if="!section.groupId && !mutationsDisabled"
                      :model-value="selectedGuestIds.has(guest.guestId)"
                      :aria-label="`Select ${guest.displayName}`"
                      @update:model-value="(value: boolean | 'indeterminate') => toggleSelection(guest.guestId, value === true)"
                    />
                    <div class="min-w-0">
                      <p class="font-medium text-highlighted">{{ guest.displayName }}</p>
                      <p class="text-xs text-muted">{{ guest.email }}</p>
                      <p
                        v-if="guest.envelopeName.trim() && guest.envelopeName.trim().toLowerCase() !== guest.displayName.trim().toLowerCase()"
                        class="text-[11px] text-muted mt-0.5"
                      >
                        Envelope: {{ guest.envelopeName }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <UBadge
                      :color="rsvpStatusColor(guest.rsvpStatus)"
                      variant="subtle"
                      size="xs"
                      class="capitalize"
                    >
                      {{ guest.rsvpStatus }}
                    </UBadge>
                    <UButton
                      v-if="!mutationsDisabled && !section.groupId && canAssignUngroupedToGroup"
                      size="xs"
                      variant="ghost"
                      color="orange"
                      icon="i-lucide-user-plus"
                      :loading="isGroupActionLoading"
                      aria-label="Add to group"
                      @click="openAssignGuestsToGroupModal([guest.guestId])"
                    />
                    <UButton
                      v-if="!mutationsDisabled && section.groupId"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-user-minus"
                      :loading="isGroupActionLoading"
                      aria-label="Remove from group"
                      @click="handleRemoveGuestFromGroup(section.groupId!, guest.guestId)"
                    />
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </template>

        <!-- Tab 3: Roles -->
        <template v-else-if="selectedTab === 'roles'">
          <div
            v-if="isRolesTabEmpty"
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-300 bg-white/70 px-6 py-14 text-center shadow-xs"
          >
            <div class="size-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-3">
              <UIcon name="i-lucide-theater" class="size-6" />
            </div>
            <p class="text-sm font-semibold text-highlighted">No roles assigned yet</p>
            <p class="mt-1 max-w-sm text-xs text-muted">
              Select guests on the Guest List tab and click "Assign role…" to assign entourage or special roles.
            </p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="section in rolesBySection"
              :key="section.roleId"
              class="rounded-xl border border-bread-200/80 bg-white shadow-xs overflow-hidden"
            >
              <div class="border-b border-bread-200/80 bg-bread-50/50 px-4 py-3">
                <h3 class="font-semibold text-highlighted text-sm">
                  {{ section.roleName }}
                  <span class="text-xs font-normal text-muted">({{ section.guests.length }})</span>
                </h3>
              </div>
              <ul class="divide-y divide-bread-100">
                <li
                  v-for="guest in section.guests"
                  :key="`${section.roleId}-${guest.guestId}`"
                  class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-bread-50/20 transition-colors"
                >
                  <div>
                    <p class="font-medium text-highlighted">{{ guest.displayName }}</p>
                    <p class="text-xs text-muted">{{ guest.email }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <UBadge
                      :color="rsvpStatusColor(guest.rsvpStatus)"
                      variant="subtle"
                      size="xs"
                      class="capitalize"
                    >
                      {{ guest.rsvpStatus }}
                    </UBadge>
                    <UButton
                      v-if="!mutationsDisabled"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-user-minus"
                      :loading="isRoleTableActionLoading"
                      aria-label="Remove from role"
                      @click="handleRemoveGuestFromRole(section.roleId, guest.guestId)"
                    />
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </template>

        <!-- Tab 4: Tables -->
        <template v-else-if="selectedTab === 'tables'">
          <div
            v-if="isTablesTabEmpty"
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-300 bg-white/70 px-6 py-14 text-center shadow-xs"
          >
            <div class="size-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-3">
              <UIcon name="i-lucide-layout-grid" class="size-6" />
            </div>
            <p class="text-sm font-semibold text-highlighted">No table assignments yet</p>
            <p class="mt-1 max-w-sm text-xs text-muted">
              Select guests on the Guest List tab to assign tables, or move guests between tables here.
            </p>
          </div>

          <div
            v-else
            class="space-y-4"
            :class="showTablesActionBar ? 'pb-24' : ''"
          >
            <div
              v-for="section in tablesBySection"
              :key="section.label"
              class="rounded-xl border border-bread-200/80 bg-white shadow-xs overflow-hidden"
            >
              <div class="border-b border-bread-200/80 bg-bread-50/50 px-4 py-3">
                <h3 class="font-semibold text-highlighted text-sm">
                  {{ section.label }}
                  <span class="text-xs font-normal text-muted">({{ section.guests.length }})</span>
                </h3>
              </div>
              <ul class="divide-y divide-bread-100">
                <li
                  v-for="guest in section.guests"
                  :key="`${section.label}-${guest.guestId}`"
                  class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-bread-50/20 transition-colors"
                >
                  <div class="flex min-w-0 flex-1 items-center gap-3">
                    <UCheckbox
                      :model-value="selectedGuestIds.has(guest.guestId)"
                      :disabled="mutationsDisabled"
                      :aria-label="`Select ${guest.displayName}`"
                      @update:model-value="(value: boolean | 'indeterminate') => toggleSelection(guest.guestId, value === true)"
                    />
                    <div class="min-w-0">
                      <p class="font-medium text-highlighted">{{ guest.displayName }}</p>
                      <p class="text-xs text-muted">{{ guest.email }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <UBadge
                      :color="rsvpStatusColor(guest.rsvpStatus)"
                      variant="subtle"
                      size="xs"
                      class="capitalize"
                    >
                      {{ guest.rsvpStatus }}
                    </UBadge>
                    <UButton
                      v-if="!mutationsDisabled && section.tableCode != null"
                      size="xs"
                      variant="ghost"
                      color="orange"
                      icon="i-lucide-arrow-right-left"
                      :loading="isRoleTableActionLoading"
                      aria-label="Move to another table"
                      @click="openGuestTableTransferModal(guest.guestId)"
                    />
                    <UButton
                      v-if="!mutationsDisabled && section.tableCode != null"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-user-minus"
                      :loading="isRoleTableActionLoading"
                      aria-label="Unassign from table"
                      @click="handleUnassignGuestFromTable(guest.guestId)"
                    />
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </template>

        <!-- Sticky Floating Action Bar for Selected Items -->
        <div
          v-if="showGuestListActionBar || showTablesActionBar || showGroupsActionBar"
          class="sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-200 bg-white/95 backdrop-blur px-4 py-3 shadow-lg dark:border-orange-800 dark:bg-neutral-900"
        >
          <div class="space-y-0.5">
            <span class="text-sm font-semibold text-highlighted">
              {{ selectedCount }} guest{{ selectedCount === 1 ? '' : 's' }} selected
            </span>
            <p
              v-if="showGuestListActionBar && showCreateGroupHint"
              class="text-xs text-muted"
            >
              Select at least 2 guests to create a new group
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <template v-if="showGuestListActionBar">
              <UButton
                v-if="canAssignRole"
                color="orange"
                variant="outline"
                size="sm"
                icon="i-lucide-theater"
                :loading="isRoleTableActionLoading"
                @click="openRoleAssignmentModal"
              >
                Assign role…
              </UButton>
              <UButton
                v-if="canUnassignRole"
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-user-minus"
                :loading="isRoleTableActionLoading"
                @click="openRoleUnassignmentModal"
              >
                Unassign role…
              </UButton>
              <UButton
                v-if="canGroupGuests"
                color="orange"
                size="sm"
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
                size="sm"
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
                size="sm"
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
                size="sm"
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
                size="sm"
                icon="i-lucide-user-minus"
                :loading="isGroupActionLoading"
                @click="handleUngroupAll"
              >
                Ungroup all
              </UButton>
            </template>
            <template v-if="showGroupsActionBar">
              <UButton
                color="orange"
                size="sm"
                icon="i-lucide-user-plus"
                :loading="isGroupActionLoading"
                @click="openAddToExistingModal"
              >
                Add to existing group
              </UButton>
            </template>
            <UButton
              v-if="showTablesActionBar && canAssignTable"
              color="orange"
              variant="outline"
              size="sm"
              icon="i-lucide-layout-grid"
              :loading="isRoleTableActionLoading"
              @click="openTableAssignmentModal"
            >
              Assign table…
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              :disabled="isGroupActionLoading || isRoleTableActionLoading"
              @click="clearSelection"
            >
              Clear
            </UButton>
          </div>
        </div>
      </div>
    </main>

    <!-- ================= MODALS ================= -->
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
          <UFormField label="First name" name="firstName" required>
            <UInput
              v-model="addGuestState.firstName"
              class="w-full"
              placeholder="Juan"
              :disabled="mutationsDisabled"
            />
          </UFormField>
          <UFormField label="Last name" name="lastName" required>
            <UInput
              v-model="addGuestState.lastName"
              class="w-full"
              placeholder="Dela Cruz"
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
          <UFormField label="Mailing address" name="mailingAddress">
            <UTextarea
              v-model="addGuestState.mailingAddress"
              class="w-full"
              placeholder="123 Rizal St, Manila"
              :disabled="mutationsDisabled"
              :rows="2"
            />
          </UFormField>
          <UFormField label="Contact number" name="contactNumber">
            <UInput
              v-model="addGuestState.contactNumber"
              class="w-full"
              placeholder="+63 912 345 6789"
              :disabled="mutationsDisabled"
            />
          </UFormField>
          <UFormField label="Envelope name" name="envelopeName">
            <UInput
              v-model="addGuestState.envelopeName"
              class="w-full"
              placeholder="Mr. & Mrs. Juan Dela Cruz"
              :disabled="mutationsDisabled"
            />
          </UFormField>

          <!-- Pax / Registered Companions -->
          <div class="bg-toast-50/80 border border-toast-200/90 rounded-xl p-3 space-y-2">
            <div class="flex items-center justify-between">
              <div>
                <label class="block text-xs font-semibold text-toast-900">Total Pax / Registered Seats</label>
                <p class="text-[11px] text-muted">Number of guests registered under this entry</p>
              </div>
              <div class="flex items-center gap-1.5 bg-white border border-toast-300/80 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  class="size-6 rounded flex items-center justify-center font-bold text-toast-800 hover:bg-toast-100 cursor-pointer disabled:opacity-30"
                  :disabled="!addGuestState.pax || addGuestState.pax <= 1"
                  @click="addGuestState.pax = Math.max(1, (addGuestState.pax || 1) - 1)"
                >
                  -
                </button>
                <input
                  v-model.number="addGuestState.pax"
                  type="number"
                  min="1"
                  max="20"
                  class="w-10 text-center font-bold font-mono text-xs text-toast-900 focus:outline-none"
                />
                <button
                  type="button"
                  class="size-6 rounded flex items-center justify-center font-bold text-toast-800 hover:bg-toast-100 cursor-pointer disabled:opacity-30"
                  :disabled="(addGuestState.pax || 1) >= 20"
                  @click="addGuestState.pax = Math.min(20, (addGuestState.pax || 1) + 1)"
                >
                  +
                </button>
              </div>
            </div>

            <!-- Preview of registered companions -->
            <div v-if="(addGuestState.pax || 1) > 1" class="pt-2 border-t border-toast-200/70 text-xs">
              <span class="text-toast-700 font-medium text-[11px] block mb-1">
                Reflected in backend as:
              </span>
              <div class="space-y-1 max-h-28 overflow-y-auto pr-1">
                <div
                  v-for="n in ((addGuestState.pax || 1) - 1)"
                  :key="n"
                  class="flex items-center gap-2 px-2 py-1 bg-white/95 border border-bread-200 rounded-lg text-[11px] text-toast-800 font-mono shadow-2xs"
                >
                  <UIcon name="i-lucide-user-plus" class="size-3 text-toast-500 shrink-0" />
                  <span class="truncate">
                    {{ `${addGuestState.firstName || ''} ${addGuestState.lastName || ''}`.trim() || 'Guest' }}'s companion {{ n }}
                  </span>
                </div>
              </div>
            </div>
          </div>
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
      v-model:open="isEditGuestModalOpen"
      title="Edit Guest"
      :ui="guestModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isUpdatingGuest"
    >
      <template #body>
        <UForm
          :schema="editGuestSchema"
          :state="editGuestState"
          class="space-y-4"
          @submit="handleEditGuest"
        >
          <UFormField label="First name" name="firstName" required>
            <UInput
              v-model="editGuestState.firstName"
              class="w-full"
              :disabled="mutationsDisabled"
            />
          </UFormField>
          <UFormField label="Last name" name="lastName" required>
            <UInput
              v-model="editGuestState.lastName"
              class="w-full"
              :disabled="mutationsDisabled"
            />
          </UFormField>
          <UFormField label="Email" name="email" required>
            <UInput
              v-model="editGuestState.email"
              type="email"
              class="w-full"
              :disabled="mutationsDisabled"
            />
          </UFormField>
          <UFormField label="Mailing address" name="mailingAddress">
            <UTextarea
              v-model="editGuestState.mailingAddress"
              class="w-full"
              :disabled="mutationsDisabled"
              :rows="2"
            />
          </UFormField>
          <UFormField label="Contact number" name="contactNumber">
            <UInput
              v-model="editGuestState.contactNumber"
              class="w-full"
              :disabled="mutationsDisabled"
            />
          </UFormField>
          <UFormField label="Envelope name" name="envelopeName">
            <UInput
              v-model="editGuestState.envelopeName"
              class="w-full"
              :disabled="mutationsDisabled"
            />
          </UFormField>
          <div class="flex gap-2 pt-2">
            <UButton
              variant="outline"
              color="neutral"
              class="flex-1"
              :disabled="isUpdatingGuest"
              @click="closeEditGuestModal"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              color="orange"
              class="flex-1"
              :loading="isUpdatingGuest"
              :disabled="mutationsDisabled"
            >
              Save changes
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal
      v-model:open="isRoleAssignmentModalOpen"
      title="Assign role"
      :ui="{ content: 'border-none ring-transparent max-w-md' }"
      :dismissible="!isRoleTableActionLoading"
    >
      <template #body>
        <p class="mb-4 text-sm text-muted">
          Assign {{ selectedCount }} guest{{ selectedCount === 1 ? '' : 's' }} to a role.
        </p>
        <div
          v-if="roleOptions.length > 0"
          class="mb-4 flex gap-2"
        >
          <UButton
            label="Existing role"
            :color="roleAssignmentMode === 'existing' ? 'orange' : 'neutral'"
            :variant="roleAssignmentMode === 'existing' ? 'solid' : 'outline'"
            class="flex-1"
            :disabled="isRoleTableActionLoading"
            @click="() => { roleAssignmentMode = 'existing' }"
          />
          <UButton
            label="Create new"
            :color="roleAssignmentMode === 'new' ? 'orange' : 'neutral'"
            :variant="roleAssignmentMode === 'new' ? 'solid' : 'outline'"
            class="flex-1"
            :disabled="isRoleTableActionLoading"
            @click="() => { roleAssignmentMode = 'new' }"
          />
        </div>
        <UFormField
          v-if="roleAssignmentMode === 'existing'"
          label="Role"
          name="targetRole"
          required
        >
          <USelect
            v-model="targetRoleId"
            :items="roleOptions"
            value-key="value"
            label-key="label"
            class="w-full"
            :disabled="isRoleTableActionLoading"
          />
        </UFormField>
        <UFormField
          v-else
          label="Role name"
          name="createRoleName"
          required
        >
          <UInput
            v-model="createRoleName"
            class="w-full"
            placeholder="Ring Bearer"
            :disabled="isRoleTableActionLoading"
          />
        </UFormField>
        <div class="mt-4 flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="isRoleTableActionLoading"
            @click="() => { isRoleAssignmentModalOpen = false }"
          />
          <UButton
            label="Assign role"
            color="orange"
            :loading="isRoleTableActionLoading"
            :disabled="roleAssignmentMode === 'existing' && !targetRoleId"
            @click="handleRoleAssignment"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isRoleUnassignmentModalOpen"
      title="Unassign role"
      :ui="{ content: 'border-none ring-transparent max-w-md' }"
      :dismissible="!isRoleTableActionLoading"
    >
      <template #body>
        <p class="mb-4 text-sm text-muted">
          Remove {{ selectedCount }} guest{{ selectedCount === 1 ? '' : 's' }} from a role.
          Guests who do not have the selected role are skipped.
        </p>
        <UFormField label="Role" name="unassignRole" required>
          <USelect
            v-model="targetUnassignRoleId"
            :items="unassignRoleOptions"
            value-key="value"
            label-key="label"
            class="w-full"
            :disabled="isRoleTableActionLoading"
          />
        </UFormField>
        <div class="mt-4 flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="isRoleTableActionLoading"
            @click="() => { isRoleUnassignmentModalOpen = false }"
          />
          <UButton
            label="Remove role"
            color="orange"
            :loading="isRoleTableActionLoading"
            :disabled="!targetUnassignRoleId"
            @click="handleRoleUnassignment"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isTableAssignmentModalOpen"
      :title="tableAssignmentModalTitle"
      :ui="{ content: 'border-none ring-transparent max-w-md' }"
      :dismissible="!isRoleTableActionLoading"
    >
      <template #body>
        <p class="mb-4 text-sm text-muted">
          Place {{ tableAssignmentGuestCount }} guest{{ tableAssignmentGuestCount === 1 ? '' : 's' }} at a table.
          Choose <span class="font-medium">Unassigned</span> to remove table seating.
        </p>
        <UFormField label="Table" name="targetTable" required>
          <USelect
            v-model="targetTableValue"
            :items="tableOptions"
            value-key="value"
            label-key="label"
            class="w-full"
            :disabled="isRoleTableActionLoading"
          />
        </UFormField>
        <div class="mt-4 flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="isRoleTableActionLoading"
            @click="closeTableAssignmentModal"
          />
          <UButton
            :label="tableAssignmentSubmitLabel"
            color="orange"
            :loading="isRoleTableActionLoading"
            :disabled="targetTableValue === undefined"
            @click="handleTableAssignment"
          />
        </div>
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
            @click="() => { groupAssignmentMode = 'new' }"
          />
          <UButton
            label="Add to existing"
            :color="groupAssignmentMode === 'existing' ? 'orange' : 'neutral'"
            :variant="groupAssignmentMode === 'existing' ? 'solid' : 'outline'"
            class="flex-1"
            :disabled="isGroupActionLoading"
            @click="() => { groupAssignmentMode = 'existing' }"
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
            @click="() => { isGroupAssignmentModalOpen = false }"
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
          Add
          {{ assignModalGuestCount }}
          guest{{ assignModalGuestCount === 1 ? '' : 's' }}
          to an existing group.
        </p>
        <UFormField label="Group" name="targetGroup" required>
          <USelect
            v-model="targetGroupId"
            :items="groupOptions"
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
            @click="closeAddToExistingModal"
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
            @click="() => { isRenameGroupModalOpen = false }"
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
          <span class="font-medium text-highlighted">{{ guestToRemove?.displayName }}</span>
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
          meaningful responses until you set up RSVP questions in the RSVP dashboard.
        </p>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="() => { isNoQuestionsWarningOpen = false }"
          />
          <UButton
            label="Send anyway"
            color="orange"
            @click="confirmInviteWithoutQuestions"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
