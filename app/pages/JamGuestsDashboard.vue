<script setup lang="ts">
import { DateFormatter } from '@internationalized/date'
import type { GatheringRecord, RsvpStatus, SeatingGuestRecord } from '~/types/seating'
import { guestDisplayName, guestNeedsName } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import JamBulkInvite from '~/components/JamBulkInvite.vue'
import JamGuestImport from '~/components/JamGuestImport.vue'

definePageMeta({
  layout: 'jam-sub-navbar',
  middleware: 'seating-enabled',
  title: 'Guest List',
  bgClass: 'bg-orange-50',
})

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const route = useRoute()
const toast = useToast()
const { isUiOnlyMode } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const seating = useSeating()

const gatheringId = computed(() => String(route.params.gatheringId || route.query.gatheringId || ''))
const gathering = ref<GatheringRecord | null>(null)
const guests = ref<SeatingGuestRecord[]>([])
const loading = ref(true)
const saving = ref(false)
const sendingInvites = ref(false)
const exportingCsv = ref(false)

// Active View Tab
type JamGuestTab = 'guest-list' | 'groups' | 'tables' | 'checked-in'
const selectedTab = ref<JamGuestTab>('guest-list')

// Search & Filter
const searchQuery = ref('')
type RsvpFilter = 'ALL' | 'GOING' | 'PENDING' | 'NOT_GOING'
const rsvpFilter = ref<RsvpFilter>('ALL')

const rsvpFilterOptions: { key: RsvpFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'GOING', label: 'Attending' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'NOT_GOING', label: 'Declined' },
]

const selectedGuestIds = ref<Set<string>>(new Set())

// Modals
const isAddGuestModalOpen = ref(false)
const isEditGuestModalOpen = ref(false)
const isBulkInviteOpen = ref(false)
const isImportOpen = ref(false)
const isDeleteConfirmOpen = ref(false)
const guestToDelete = ref<SeatingGuestRecord | null>(null)

// Add Guest Form
const addForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  partyName: '',
  rsvpStatus: 'PENDING' as RsvpStatus,
  pax: 1,
})

// Edit Guest Form
const editingGuestId = ref('')
const editForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  partyName: '',
  rsvpStatus: 'PENDING' as RsvpStatus,
})

// Event Details
const eventTitle = computed(() => gathering.value?.name ?? '')
const eventDateLabel = computed(() => {
  const dateValue = gathering.value?.eventDate
  return dateValue ? df.format(new Date(dateValue)) : ''
})

// Computed stats
const maxGuests = computed(() => gathering.value?.maxGuests ?? 0)
const guestCount = computed(() => guests.value.length)
const guestListFull = computed(() => Boolean(gathering.value) && guestCount.value >= maxGuests.value)
const emailCreditsRemaining = computed(() => {
  if (!gathering.value) return 0
  return Math.max(gathering.value.maxGuests - guests.value.length, 0)
})

const goingCount = computed(() => guests.value.filter((g) => g.rsvpStatus === 'GOING').length)
const pendingCount = computed(() => guests.value.filter((g) => !g.rsvpStatus || g.rsvpStatus === 'PENDING').length)
const notGoingCount = computed(() => guests.value.filter((g) => g.rsvpStatus === 'NOT_GOING').length)
const seatedCount = computed(() => guests.value.filter((g) => g.tableId && g.seatNumber).length)
const unseatedAttendingCount = computed(() => guests.value.filter((g) => (g.isAttending || g.rsvpStatus === 'GOING') && (!g.tableId || !g.seatNumber)).length)
const checkedInCount = computed(() => guests.value.filter((g) => g.checkedInAt).length)
const invitesSentCount = computed(() => guests.value.filter((g) => Boolean(g.inviteSentAt)).length)

const responseCount = computed(() => goingCount.value + notGoingCount.value)
const responseRate = computed(() => {
  if (guestCount.value === 0) return 0
  return Math.min(100, Math.round((responseCount.value / guestCount.value) * 100))
})

// Filtered List for Table
const filteredGuests = computed(() => {
  return guests.value.filter((guest) => {
    // RSVP filter
    if (rsvpFilter.value === 'GOING' && guest.rsvpStatus !== 'GOING') return false
    if (rsvpFilter.value === 'PENDING' && guest.rsvpStatus !== 'PENDING' && guest.rsvpStatus) return false
    if (rsvpFilter.value === 'NOT_GOING' && guest.rsvpStatus !== 'NOT_GOING') return false

    // Search query
    if (!searchQuery.value.trim()) return true
    const q = searchQuery.value.toLowerCase().trim()
    const name = guestDisplayName(guest).toLowerCase()
    const email = (guest.email || '').toLowerCase()
    const party = (guest.partyName || '').toLowerCase()
    const table = getTableLabel(guest.tableId).toLowerCase()
    return name.includes(q) || email.includes(q) || party.includes(q) || table.includes(q)
  })
})

const hasActiveFilters = computed(() => {
  return Boolean(searchQuery.value.trim().length > 0 || rsvpFilter.value !== 'ALL')
})

function clearFilters() {
  searchQuery.value = ''
  rsvpFilter.value = 'ALL'
}

// Party Groups computed
const partyGroups = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  const map = new Map<string, SeatingGuestRecord[]>()
  for (const g of guests.value) {
    const party = g.partyName?.trim() || 'Ungrouped Guests'
    if (!map.has(party)) map.set(party, [])
    map.get(party)!.push(g)
  }
  return Array.from(map.entries())
    .map(([partyName, partyGuests]) => {
      let filtered = partyGuests
      if (q) {
        filtered = partyGuests.filter((g) => {
          const name = guestDisplayName(g).toLowerCase()
          const email = (g.email || '').toLowerCase()
          return name.includes(q) || email.includes(q) || partyName.toLowerCase().includes(q)
        })
      }
      return {
        name: partyName,
        guests: filtered,
        totalGuests: partyGuests.length,
      }
    })
    .filter((group) => group.guests.length > 0)
})

// Tables Sections computed
const tablesBySection = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  const tables = gathering.value?.tables || []
  const map = new Map<string, { label: string; capacity?: number; guests: SeatingGuestRecord[] }>()
  for (const t of tables) {
    map.set(t._id, { label: t.label, capacity: t.capacity, guests: [] })
  }
  const unassigned: SeatingGuestRecord[] = []
  for (const g of guests.value) {
    if (g.tableId && map.has(g.tableId)) {
      map.get(g.tableId)!.guests.push(g)
    } else {
      unassigned.push(g)
    }
  }
  const result: { label: string; capacity?: number; guests: SeatingGuestRecord[]; isUnassigned?: boolean }[] = Array.from(map.values()).map((section) => ({
    label: section.label,
    capacity: section.capacity,
    guests: q
      ? section.guests.filter((g) => {
          const name = guestDisplayName(g).toLowerCase()
          const email = (g.email || '').toLowerCase()
          return name.includes(q) || email.includes(q)
        })
      : section.guests,
  }))
  if (unassigned.length > 0) {
    result.push({
      label: 'Unassigned Seats',
      capacity: undefined,
      isUnassigned: true,
      guests: q
        ? unassigned.filter((g) => {
            const name = guestDisplayName(g).toLowerCase()
            const email = (g.email || '').toLowerCase()
            return name.includes(q) || email.includes(q)
          })
        : unassigned,
    })
  }
  return result
})

// Checked-In Sections computed
const checkedInSections = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  const checkedIn = guests.value.filter((g) => Boolean(g.checkedInAt))
  const awaiting = guests.value.filter((g) => !g.checkedInAt && (g.isAttending || g.rsvpStatus === 'GOING'))
  const filterList = (list: SeatingGuestRecord[]) => {
    if (!q) return list
    return list.filter((g) => {
      const name = guestDisplayName(g).toLowerCase()
      const email = (g.email || '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }
  return [
    { label: 'Checked In', count: checkedIn.length, guests: filterList(checkedIn), isCheckedIn: true },
    { label: 'Awaiting Check-in (Attending)', count: awaiting.length, guests: filterList(awaiting), isCheckedIn: false },
  ]
})

// Tab Navigation Buttons for 2x2 Grid
const tabButtons = computed(() => [
  {
    key: 'guest-list' as const,
    label: 'Guest List',
    count: guestCount.value,
    icon: 'i-lucide-users',
  },
  {
    key: 'groups' as const,
    label: 'Parties',
    count: partyGroups.value.filter((p) => p.name !== 'Ungrouped Guests').length,
    icon: 'i-lucide-users-round',
  },
  {
    key: 'tables' as const,
    label: 'Tables',
    count: gathering.value?.tables?.length ?? 0,
    icon: 'i-lucide-layout-grid',
  },
  {
    key: 'checked-in' as const,
    label: 'Checked In',
    count: checkedInCount.value,
    icon: 'i-lucide-qr-code',
  },
])

// Multi-selection helpers
const allFilteredSelected = computed(() => {
  if (!filteredGuests.value.length) return false
  return filteredGuests.value.every((g) => selectedGuestIds.value.has(g._id))
})

const someFilteredSelected = computed(() => {
  if (!filteredGuests.value.length) return false
  const selected = filteredGuests.value.filter((g) => selectedGuestIds.value.has(g._id))
  return selected.length > 0 && selected.length < filteredGuests.value.length
})

function toggleSelectAll(val?: boolean) {
  const shouldSelect = typeof val === 'boolean' ? val : !allFilteredSelected.value
  if (shouldSelect) {
    for (const g of filteredGuests.value) {
      selectedGuestIds.value.add(g._id)
    }
  } else {
    for (const g of filteredGuests.value) {
      selectedGuestIds.value.delete(g._id)
    }
  }
}

function toggleGuestSelection(guestId: string) {
  if (selectedGuestIds.value.has(guestId)) {
    selectedGuestIds.value.delete(guestId)
  } else {
    selectedGuestIds.value.add(guestId)
  }
}

function clearSelection() {
  selectedGuestIds.value.clear()
}

// Data Loading
async function load() {
  if (!gatheringId.value) return
  loading.value = true
  try {
    const [gatheringData, guestsData] = await Promise.all([
      seating.getGathering(gatheringId.value),
      seating.listGuests(gatheringId.value),
    ])
    gathering.value = gatheringData
    guests.value = guestsData.guests
    setActiveEvent({
      _id: gatheringData._id,
      name: gatheringData.name,
      title: gatheringData.name,
      location: gatheringData.venue,
      date: gatheringData.eventDate,
      eventDate: gatheringData.eventDate,
      status: gatheringData.status,
      maxGuests: gatheringData.maxGuests,
    } as any)
  } catch (error) {
    toast.add({ title: 'Could not load guest list', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
})

// Guest Actions
function openAddGuestModal() {
  if (guestListFull.value) {
    toast.add({
      title: 'Guest List Full',
      description: 'Your plan guest limit has been reached. Please upgrade to add more guests.',
      color: 'warning',
    })
    return
  }
  addForm.firstName = ''
  addForm.lastName = ''
  addForm.email = ''
  addForm.partyName = ''
  addForm.rsvpStatus = 'PENDING'
  addForm.pax = 1
  isAddGuestModalOpen.value = true
}

async function handleAddGuest() {
  if (!addForm.email.trim()) {
    toast.add({ title: 'Email is required', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const primaryFullName = `${addForm.firstName.trim()} ${addForm.lastName.trim()}`.trim() || addForm.email.trim()
    const primaryParty = addForm.partyName.trim() || (addForm.pax > 1 ? `${primaryFullName}'s Party` : undefined)
    const paxCount = Math.max(1, Math.min(addForm.pax || 1, 20))

    // 1. Create primary guest
    const newGuest = await seating.createGuest(gatheringId.value, {
      firstName: addForm.firstName.trim(),
      lastName: addForm.lastName.trim(),
      email: addForm.email.trim().toLowerCase(),
      partyName: primaryParty,
    })

    if (addForm.rsvpStatus && addForm.rsvpStatus !== 'PENDING') {
      await seating.updateGuest(gatheringId.value, newGuest._id, {
        rsvpStatus: addForm.rsvpStatus,
        isAttending: addForm.rsvpStatus === 'GOING',
      })
    }

    // 2. Companions need no email, and follow the guest's reply
    if (paxCount > 1) {
      await seating.saveGuestCompanions(
        gatheringId.value,
        newGuest._id,
        Array.from({ length: paxCount - 1 }, () => ({})),
      )
    }

    toast.add({
      title: 'Guest registered',
      description: paxCount > 1
        ? `Added ${primaryFullName} + ${paxCount - 1} companion(s) (${paxCount} pax total).`
        : 'Guest added successfully',
      color: 'success',
    })
    isAddGuestModalOpen.value = false
    await load()
  } catch (error) {
    toast.add({ title: 'Could not add guest', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

const editingIsCompanion = computed(() => Boolean(
  guests.value.find((guest) => guest._id === editingGuestId.value)?.companionOf,
))

function companionOfName(guest: SeatingGuestRecord): string {
  const primary = guests.value.find((item) => item._id === guest.companionOf)
  return primary ? guestDisplayName(primary) : 'a guest'
}

function companionCount(guest: SeatingGuestRecord): number {
  return guests.value.filter((item) => item.companionOf === guest._id).length
}

function openEditGuestModal(guest: SeatingGuestRecord) {
  editingGuestId.value = guest._id
  editForm.firstName = guest.firstName || ''
  editForm.lastName = guest.lastName || ''
  editForm.email = guest.email || ''
  editForm.partyName = guest.partyName || ''
  editForm.rsvpStatus = guest.rsvpStatus || 'PENDING'
  isEditGuestModalOpen.value = true
}

async function handleEditGuest() {
  if (!editingGuestId.value) return
  saving.value = true
  try {
    await seating.updateGuest(gatheringId.value, editingGuestId.value, {
      firstName: editForm.firstName.trim() || undefined,
      lastName: editForm.lastName.trim() || undefined,
      email: editForm.email.trim().toLowerCase() || undefined,
      partyName: editForm.partyName.trim(),
      // A companion follows the reply of the guest who brought them.
      ...(editingIsCompanion.value
        ? {}
        : { rsvpStatus: editForm.rsvpStatus, isAttending: editForm.rsvpStatus === 'GOING' }),
    })
    toast.add({ title: 'Guest updated successfully', color: 'success' })
    isEditGuestModalOpen.value = false
    await load()
  } catch (error) {
    toast.add({ title: 'Could not update guest', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function handleQuickStatusChange(guest: SeatingGuestRecord, select: HTMLSelectElement) {
  const status = select.value as RsvpStatus
  // A guest invited by email alone can't be marked as coming until they have a name.
  if (status === 'GOING' && guestNeedsName(guest)) {
    select.value = guest.rsvpStatus || 'PENDING'
    openEditGuestModal(guest)
    editForm.rsvpStatus = 'GOING'
    toast.add({ title: 'Add their name first', description: 'A guest needs a name to be marked as going.', color: 'warning' })
    return
  }
  try {
    await seating.updateGuest(gatheringId.value, guest._id, {
      rsvpStatus: status,
      isAttending: status === 'GOING',
    })
    toast.add({ title: `RSVP updated to ${status}`, color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: 'Could not update RSVP status', description: getApiErrorMessage(error), color: 'error' })
  }
}

function promptDeleteGuest(guest: SeatingGuestRecord) {
  const companions = companionCount(guest)
  if (companions && !confirm(`Removing ${guestDisplayName(guest)} also removes their ${companions === 1 ? 'companion' : `${companions} companions`}. Continue?`)) {
    return
  }
  guestToDelete.value = guest
  isDeleteConfirmOpen.value = true
}

async function confirmDeleteGuest() {
  if (!guestToDelete.value) return
  saving.value = true
  try {
    await seating.deleteGuest(gatheringId.value, guestToDelete.value._id)
    selectedGuestIds.value.delete(guestToDelete.value._id)
    toast.add({ title: 'Guest removed', color: 'success' })
    isDeleteConfirmOpen.value = false
    guestToDelete.value = null
    await load()
  } catch (error) {
    toast.add({ title: 'Could not delete guest', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function deleteSelectedGuests() {
  if (!selectedGuestIds.value.size) return
  const count = selectedGuestIds.value.size
  if (!confirm(`Are you sure you want to remove ${count} selected guest(s)?`)) return

  saving.value = true
  try {
    for (const id of selectedGuestIds.value) {
      await seating.deleteGuest(gatheringId.value, id).catch(() => {})
    }
    selectedGuestIds.value.clear()
    toast.add({ title: `Removed ${count} guest(s)`, color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: 'Could not remove all selected guests', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function sendInviteToGuest(guestId: string) {
  try {
    const res = await seating.sendInvites(gatheringId.value, [guestId])
    toast.add({ title: 'Invitation sent', description: res.message, color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: 'Could not send invitation', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function sendInvitesToSelected() {
  if (!selectedGuestIds.value.size) return
  sendingInvites.value = true
  try {
    const ids = Array.from(selectedGuestIds.value)
    const res = await seating.sendInvites(gatheringId.value, ids)
    toast.add({ title: 'Invitations dispatched', description: `Sent to ${res.sent} guests`, color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: 'Could not send invitations', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    sendingInvites.value = false
  }
}

async function sendInvitesToAllPending() {
  sendingInvites.value = true
  try {
    const res = await seating.sendInvites(gatheringId.value)
    toast.add({ title: 'Invitations dispatched', description: `Sent: ${res.sent}, Skipped: ${res.skipped}`, color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: 'Could not send invitations', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    sendingInvites.value = false
  }
}

async function resendQrPass(guestId: string) {
  try {
    await seating.resendPass(gatheringId.value, guestId)
    toast.add({ title: 'Personal QR pass sent to guest email', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not send QR pass', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function exportGuestsCsv() {
  exportingCsv.value = true
  try {
    const blob = await seating.exportGuests(gatheringId.value)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `guest-list-${gathering.value?.name || 'jam'}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.add({ title: 'Guest list exported to CSV', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not export guest list', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    exportingCsv.value = false
  }
}

function getTableLabel(tableId: string | null): string {
  if (!tableId || !gathering.value) return 'Not seated'
  const table = gathering.value.tables?.find((t) => t._id === tableId)
  return table?.label || 'Not seated'
}
</script>

<template>
  <div
    class="guests-page-root w-full min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-4 lg:overflow-hidden bg-bread-50/30"
  >
    <!-- Navbar Teleport Actions -->
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div class="flex items-center gap-2">
          <UButton
            :to="`/jam/rsvps/${gatheringId}`"
            icon="i-lucide-calendar"
            color="neutral"
            variant="ghost"
            size="sm"
            class="cursor-pointer font-sans"
          >
            RSVP Manager
          </UButton>
          <UButton
            icon="i-lucide-download"
            color="neutral"
            variant="outline"
            size="sm"
            :loading="exportingCsv"
            class="cursor-pointer font-sans"
            @click="exportGuestsCsv"
          >
            Export CSV
          </UButton>
          <UButton
            v-if="pendingCount > 0"
            icon="i-lucide-mail"
            color="orange"
            variant="soft"
            size="sm"
            :loading="sendingInvites"
            :disabled="sendingInvites"
            class="cursor-pointer font-sans"
            @click="sendInvitesToAllPending"
          >
            Invite All ({{ pendingCount }})
          </UButton>
          <UButton
            icon="i-lucide-user-plus"
            color="orange"
            size="sm"
            class="cursor-pointer font-sans"
            @click="openAddGuestModal"
          >
            Add Guest
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- ================= LEFT DIVISION (col-span-1): Navigation & Guest Metrics ================= -->
    <aside
      class="col-span-1 lg:col-span-1 w-full bg-white border-b lg:border-b-0 shadow-xs flex flex-col justify-between lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] z-20 overflow-y-auto p-4 sm:p-5 lg:p-6 space-y-6"
    >
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
              {{ guestCount }} / {{ maxGuests }} total
            </span>
          </div>

          <!-- Status Metrics Tiles (Attending, Pending, Declined) -->
          <div class="grid grid-cols-3 gap-2">
            <!-- Attending (Green) -->
            <button
              type="button"
              class="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-2.5 flex flex-col justify-between transition-all hover:bg-emerald-50 text-left cursor-pointer"
              :class="rsvpFilter === 'GOING' ? 'ring-2 ring-emerald-400 bg-emerald-100/60 shadow-xs' : ''"
              :title="rsvpFilter === 'GOING' ? 'Click to show all guests' : 'Filter by Attending'"
              @click="rsvpFilter = rsvpFilter === 'GOING' ? 'ALL' : 'GOING'"
            >
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-emerald-700 font-sans">Attending</span>
                <UIcon name="i-lucide-check-circle-2" class="size-3.5 text-emerald-500" />
              </div>
              <span class="text-xl sm:text-2xl font-bold font-serif text-emerald-800 tracking-tight mt-1">
                {{ goingCount }}
              </span>
            </button>

            <!-- Pending (Amber) -->
            <button
              type="button"
              class="bg-amber-50/70 border border-amber-200/70 rounded-xl p-2.5 flex flex-col justify-between transition-all hover:bg-amber-100/60 text-left cursor-pointer"
              :class="rsvpFilter === 'PENDING' ? 'ring-2 ring-amber-400 bg-amber-100/80 shadow-xs' : ''"
              :title="rsvpFilter === 'PENDING' ? 'Click to show all guests' : 'Filter by Pending'"
              @click="rsvpFilter = rsvpFilter === 'PENDING' ? 'ALL' : 'PENDING'"
            >
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
              :class="rsvpFilter === 'NOT_GOING' ? 'ring-2 ring-red-400 bg-red-100/80 shadow-xs' : ''"
              :title="rsvpFilter === 'NOT_GOING' ? 'Click to show all guests' : 'Filter by Declined'"
              @click="rsvpFilter = rsvpFilter === 'NOT_GOING' ? 'ALL' : 'NOT_GOING'"
            >
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-red-700 font-sans">Declined</span>
                <UIcon name="i-lucide-x-circle" class="size-3.5 text-red-500" />
              </div>
              <span class="text-xl sm:text-2xl font-bold font-serif text-red-800 tracking-tight mt-1">
                {{ notGoingCount }}
              </span>
            </button>
          </div>

          <!-- Secondary Metrics: Invitations & Email Credits -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <div class="bg-toast-50/60 border border-bread-200/60 rounded-xl p-2.5 flex flex-col justify-between">
              <span class="text-[11px] font-semibold text-toast-700 font-sans">Invites Sent</span>
              <span class="text-lg sm:text-xl font-bold font-serif text-highlighted tracking-tight mt-1">
                {{ invitesSentCount }}/{{ guestCount }}
              </span>
            </div>

            <div class="bg-toast-50/60 border border-bread-200/60 rounded-xl p-2.5 flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-toast-700 font-sans">Email Credits</span>
                <NuxtLink
                  :to="`/user/jam-upgrade/${gatheringId}`"
                  class="text-[10px] text-orange-600 hover:text-orange-700 font-semibold underline"
                >
                  Upgrade
                </NuxtLink>
              </div>
              <span class="text-lg sm:text-xl font-bold font-serif text-highlighted tracking-tight mt-1">
                {{ emailCreditsRemaining }}
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
              <span>{{ responseCount }} of {{ guestCount }} responded</span>
              <span v-if="goingCount > 0" class="text-emerald-700 font-semibold">
                {{ goingCount }} attending
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Left Panel Bottom Links -->
      <div class="space-y-2 pt-4">
        <UButton
          icon="i-lucide-mails"
          color="neutral"
          variant="outline"
          size="sm"
          block
          class="w-full justify-center"
          @click="isBulkInviteOpen = true"
        >
          Bulk Invite
        </UButton>
        <UButton
          icon="i-lucide-copy"
          color="neutral"
          variant="outline"
          size="sm"
          block
          class="w-full justify-center"
          @click="isImportOpen = true"
        >
          Import Guests
        </UButton>
        <UButton
          icon="i-lucide-user-plus"
          color="orange"
          size="md"
          block
          class="w-full font-semibold shadow-xs justify-center py-2.5 transition-all hover:shadow hover:brightness-105 active:scale-[0.99] cursor-pointer"
          @click="openAddGuestModal"
        >
          Add New Guest
        </UButton>
      </div>
    </aside>

    <!-- ================= RIGHT DIVISION (col-span-3): Scrollable Guests View ================= -->
    <main
      class="col-span-1 lg:col-span-3 w-full h-full lg:h-[calc(100vh-64px)] flex flex-col min-h-0 overflow-hidden bg-toast-50/30"
    >
      <!-- Top Sticky Toolbar -->
      <header
        class="bg-white/95 backdrop-blur border-b border-bread-200/80 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10"
      >
        <!-- Search and Quick RSVP Filter -->
        <div class="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            type="search"
            placeholder="Search guests by name, email, party, or table..."
            class="w-full sm:w-64 md:w-80"
          />

          <!-- Quick RSVP Filter Pills (visible when on Guest List tab) -->
          <div
            v-if="selectedTab === 'guest-list'"
            class="inline-flex items-center p-0.5 bg-toast-100/70 border border-bread-200/50 rounded-lg text-xs font-medium font-sans"
          >
            <button
              v-for="opt in rsvpFilterOptions"
              :key="opt.key"
              type="button"
              class="px-2.5 py-1 rounded-md transition-all cursor-pointer select-none inline-flex items-center gap-1.5"
              :class="rsvpFilter === opt.key ? 'bg-white text-highlighted shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
              @click="rsvpFilter = opt.key"
            >
              <span v-if="opt.key === 'GOING'" class="size-1.5 rounded-full bg-emerald-500" />
              <span v-else-if="opt.key === 'PENDING'" class="size-1.5 rounded-full bg-amber-500" />
              <span v-else-if="opt.key === 'NOT_GOING'" class="size-1.5 rounded-full bg-red-500" />
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
            @click="clearFilters"
          >
            Clear filters
          </UButton>
        </div>
      </header>

      <!-- Scrollable Body -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 min-h-0 relative">
        <!-- Guest List Full Upgrade Notice -->
        <UAlert
          v-if="guestListFull"
          color="warning"
          variant="subtle"
          title="Guest list full"
          :description="`Your plan guest limit has been reached (${guestCount}/${maxGuests}). Upgrade your plan to invite more guests.`"
          class="mb-2"
        >
          <template #actions>
            <UButton
              :to="`/user/jam-upgrade/${gatheringId}`"
              color="warning"
              variant="soft"
              size="xs"
              icon="i-lucide-arrow-up-circle"
            >
              Upgrade Plan
            </UButton>
          </template>
        </UAlert>

        <!-- Loading State -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-muted">
          <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
          <p class="mt-3 text-sm font-medium">Loading your guest list...</p>
        </div>

        <!-- Empty Overall Guest List State -->
        <div
          v-else-if="guests.length === 0"
          class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-300 bg-white/70 px-6 py-16 text-center shadow-xs"
        >
          <div class="size-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-3">
            <UIcon name="i-lucide-users" class="size-6" />
          </div>
          <h3 class="text-base font-semibold text-highlighted">No guests yet</h3>
          <p class="mt-1 max-w-sm text-xs text-muted">
            Add guests one at a time or import from another Jam to start sending invitations.
          </p>
          <div class="mt-5 flex flex-wrap items-center justify-center gap-2">
            <UButton
              icon="i-lucide-user-plus"
              color="orange"
              size="sm"
              @click="openAddGuestModal"
            >
              Add Guest
            </UButton>
            <UButton
              icon="i-lucide-copy"
              color="neutral"
              variant="outline"
              size="sm"
              @click="isImportOpen = true"
            >
              Import Guests
            </UButton>
          </div>
        </div>

        <!-- Tab 1: Guest List Table -->
        <template v-else-if="selectedTab === 'guest-list'">
          <!-- Search / Filter Empty State -->
          <div
            v-if="filteredGuests.length === 0"
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

          <!-- Table Card -->
          <div
            v-else
            class="relative rounded-xl border border-bread-200/80 bg-white shadow-xs overflow-hidden"
            :class="selectedGuestIds.size > 0 ? 'pb-24' : ''"
          >
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-bread-50/60 border-b border-bread-200/80 text-[11px] font-semibold text-toast-800 uppercase tracking-wider">
                    <th class="py-3 px-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        :checked="allFilteredSelected"
                        :indeterminate="someFilteredSelected && !allFilteredSelected"
                        class="rounded border-toast-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                        @change="toggleSelectAll(($event.target as HTMLInputElement).checked)"
                      />
                    </th>
                    <th class="py-3 px-3">Guest Name & Party</th>
                    <th class="py-3 px-3">Email Address</th>
                    <th class="py-3 px-3">RSVP Status</th>
                    <th class="py-3 px-3">Table & Seat</th>
                    <th class="py-3 px-3">Invitation</th>
                    <th class="py-3 px-3">Check-in</th>
                    <th class="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-bread-100 bg-white">
                  <tr
                    v-for="guest in filteredGuests"
                    :key="guest._id"
                    class="hover:bg-bread-50/30 transition-colors"
                    :class="{ 'bg-orange-50/20': selectedGuestIds.has(guest._id) }"
                  >
                    <!-- Checkbox -->
                    <td class="py-3 px-3.5 text-center">
                      <input
                        type="checkbox"
                        :checked="selectedGuestIds.has(guest._id)"
                        class="rounded border-toast-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                        @change="toggleGuestSelection(guest._id)"
                      />
                    </td>

                    <!-- Guest Name & Party -->
                    <td class="py-3 px-3">
                      <div class="flex items-center gap-2.5">
                        <div class="size-7 rounded-full bg-toast-100 text-toast-800 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                          {{ (guest.firstName?.[0] || guest.email?.[0] || '?') }}
                        </div>
                        <div class="min-w-0">
                          <div class="font-bold text-highlighted truncate">
                            {{ guestDisplayName(guest) }}
                            <span v-if="guestNeedsName(guest)" class="text-[10px] text-amber-600 font-normal italic ml-1">
                              (Waiting for name)
                            </span>
                          </div>
                          <div v-if="guest.companionOf" class="text-[10.5px] text-muted truncate" data-testid="companion-of">
                            Companion of <strong class="font-medium text-toast-700">{{ companionOfName(guest) }}</strong>
                          </div>
                          <div v-else-if="guest.partyName" class="text-[10.5px] text-muted truncate">
                            Party: <strong class="font-medium text-toast-700">{{ guest.partyName }}</strong>
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Email Address -->
                    <td class="py-3 px-3">
                      <span class="font-mono text-xs text-toast-700 truncate block max-w-44">
                        {{ guest.email || '—' }}
                      </span>
                    </td>

                    <!-- RSVP Status Dropdown -->
                    <td class="py-3 px-3">
                      <span
                        v-if="guest.companionOf"
                        class="text-[11px] text-muted"
                        title="A companion follows the reply of the guest who brought them"
                      >
                        {{ guest.rsvpStatus === 'GOING' ? 'Going' : 'Pending' }}
                      </span>
                      <select
                        v-else
                        :value="guest.rsvpStatus || 'PENDING'"
                        class="text-[11px] font-bold rounded-lg px-2 py-0.5 border cursor-pointer focus:outline-none"
                        :class="{
                          'bg-emerald-50 text-emerald-800 border-emerald-200': guest.rsvpStatus === 'GOING',
                          'bg-rose-50 text-rose-800 border-rose-200': guest.rsvpStatus === 'NOT_GOING',
                          'bg-amber-50 text-amber-800 border-amber-200': !guest.rsvpStatus || guest.rsvpStatus === 'PENDING',
                        }"
                        @change="handleQuickStatusChange(guest, $event.target as HTMLSelectElement)"
                      >
                        <option value="GOING">Going</option>
                        <option value="PENDING">Pending</option>
                        <option value="NOT_GOING">Declined</option>
                      </select>
                    </td>

                    <!-- Table & Seat -->
                    <td class="py-3 px-3">
                      <span
                        v-if="guest.tableId && guest.seatNumber"
                        class="inline-flex items-center gap-1 font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-lg text-[11px]"
                      >
                        <UIcon name="i-lucide-layout-grid" class="size-3" />
                        {{ getTableLabel(guest.tableId) }}, Seat {{ guest.seatNumber }}
                      </span>
                      <span v-else class="text-[11px] text-muted italic">
                        Unassigned
                      </span>
                    </td>

                    <!-- Invitation Sent -->
                    <td class="py-3 px-3">
                      <span
                        v-if="guest.inviteSentAt"
                        class="text-[11px] text-emerald-700 font-medium flex items-center gap-1"
                        :title="guest.inviteSentAt"
                      >
                        <UIcon name="i-lucide-check-circle-2" class="size-3.5" />
                        Sent
                      </span>
                      <span v-else class="text-[11px] text-muted">
                        Not sent
                      </span>
                    </td>

                    <!-- Check-in Status -->
                    <td class="py-3 px-3">
                      <span
                        v-if="guest.checkedInAt"
                        class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-md"
                      >
                        <UIcon name="i-lucide-check" class="size-3" /> Checked In
                      </span>
                      <span v-else class="text-[11px] text-muted">
                        Pending
                      </span>
                    </td>

                    <!-- Actions -->
                    <td class="py-3 px-3 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <UButton
                          v-if="guest.email"
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          icon="i-lucide-send"
                          title="Send / Resend Invitation Email"
                          class="cursor-pointer"
                          @click="sendInviteToGuest(guest._id)"
                        />
                        <UButton
                          v-if="guest.rsvpStatus === 'GOING' && guest.email"
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          icon="i-lucide-qr-code"
                          title="Resend QR Pass"
                          class="cursor-pointer"
                          @click="resendQrPass(guest._id)"
                        />
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          icon="i-lucide-pencil"
                          title="Edit Guest"
                          class="cursor-pointer"
                          @click="openEditGuestModal(guest)"
                        />
                        <UButton
                          color="error"
                          variant="ghost"
                          size="xs"
                          icon="i-lucide-trash-2"
                          title="Remove Guest"
                          class="cursor-pointer"
                          @click="promptDeleteGuest(guest)"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- Tab 2: Parties / Groups -->
        <template v-else-if="selectedTab === 'groups'">
          <div
            v-if="partyGroups.length === 0"
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-300 bg-white/70 px-6 py-14 text-center shadow-xs"
          >
            <div class="size-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-3">
              <UIcon name="i-lucide-users-round" class="size-6" />
            </div>
            <p class="text-sm font-semibold text-highlighted">No parties configured</p>
            <p class="mt-1 max-w-sm text-xs text-muted">
              Assign a party name when adding or editing guests to group families or guest parties together.
            </p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="party in partyGroups"
              :key="party.name"
              class="rounded-xl border border-bread-200/80 bg-white shadow-xs overflow-hidden"
            >
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-bread-200/80 bg-bread-50/50 px-4 py-3">
                <h3 class="font-semibold text-highlighted text-sm">
                  {{ party.name }}
                  <span class="text-xs font-normal text-muted">({{ party.guests.length }} guests)</span>
                </h3>
              </div>
              <ul class="divide-y divide-bread-100">
                <li
                  v-for="guest in party.guests"
                  :key="guest._id"
                  class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-bread-50/20 transition-colors"
                >
                  <div>
                    <p class="font-medium text-highlighted">{{ guestDisplayName(guest) }}</p>
                    <p class="text-xs text-muted">{{ guest.email }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <UBadge
                      :color="guest.rsvpStatus === 'GOING' ? 'success' : guest.rsvpStatus === 'NOT_GOING' ? 'error' : 'warning'"
                      variant="subtle"
                      size="xs"
                      class="capitalize"
                    >
                      {{ guest.rsvpStatus || 'Pending' }}
                    </UBadge>
                    <UButton
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-pencil"
                      title="Edit Party"
                      @click="openEditGuestModal(guest)"
                    />
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </template>

        <!-- Tab 3: Tables -->
        <template v-else-if="selectedTab === 'tables'">
          <div
            v-if="tablesBySection.length === 0"
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-300 bg-white/70 px-6 py-14 text-center shadow-xs"
          >
            <div class="size-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-3">
              <UIcon name="i-lucide-layout-grid" class="size-6" />
            </div>
            <p class="text-sm font-semibold text-highlighted">No tables configured</p>
            <p class="mt-1 max-w-sm text-xs text-muted">
              Set up tables in the Tables & Seats manager to arrange guest seating.
            </p>
            <UButton
              :to="`/jam/tables/${gatheringId}`"
              icon="i-lucide-layout-grid"
              color="orange"
              size="xs"
              class="mt-3"
            >
              Open Tables & Seats
            </UButton>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="table in tablesBySection"
              :key="table.label"
              class="rounded-xl border border-bread-200/80 bg-white shadow-xs overflow-hidden"
            >
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-bread-200/80 bg-bread-50/50 px-4 py-3">
                <h3 class="font-semibold text-highlighted text-sm">
                  {{ table.label }}
                  <span class="text-xs font-normal text-muted">
                    ({{ table.guests.length }}{{ table.capacity ? ` / ${table.capacity} capacity` : ' guests' }})
                  </span>
                </h3>
              </div>
              <ul v-if="table.guests.length > 0" class="divide-y divide-bread-100">
                <li
                  v-for="guest in table.guests"
                  :key="guest._id"
                  class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-bread-50/20 transition-colors"
                >
                  <div>
                    <p class="font-medium text-highlighted">
                      {{ guestDisplayName(guest) }}
                      <span v-if="guest.seatNumber" class="text-xs text-muted font-normal">
                        — Seat {{ guest.seatNumber }}
                      </span>
                    </p>
                    <p class="text-xs text-muted">{{ guest.email }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <UBadge
                      :color="guest.rsvpStatus === 'GOING' ? 'success' : guest.rsvpStatus === 'NOT_GOING' ? 'error' : 'warning'"
                      variant="subtle"
                      size="xs"
                      class="capitalize"
                    >
                      {{ guest.rsvpStatus || 'Pending' }}
                    </UBadge>
                    <UButton
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-pencil"
                      title="Edit Guest"
                      @click="openEditGuestModal(guest)"
                    />
                  </div>
                </li>
              </ul>
              <div v-else class="p-4 text-center text-xs text-muted">
                No guests seated at this table yet.
              </div>
            </div>
          </div>
        </template>

        <!-- Tab 4: Checked In -->
        <template v-else-if="selectedTab === 'checked-in'">
          <div class="space-y-4">
            <div
              v-for="section in checkedInSections"
              :key="section.label"
              class="rounded-xl border border-bread-200/80 bg-white shadow-xs overflow-hidden"
            >
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-bread-200/80 bg-bread-50/50 px-4 py-3">
                <h3 class="font-semibold text-highlighted text-sm">
                  {{ section.label }}
                  <span class="text-xs font-normal text-muted">({{ section.count }} guests)</span>
                </h3>
              </div>
              <ul v-if="section.guests.length > 0" class="divide-y divide-bread-100">
                <li
                  v-for="guest in section.guests"
                  :key="guest._id"
                  class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-bread-50/20 transition-colors"
                >
                  <div>
                    <p class="font-medium text-highlighted">{{ guestDisplayName(guest) }}</p>
                    <p class="text-xs text-muted">
                      {{ guest.email }}
                      <span v-if="guest.checkedInAt" class="text-emerald-700 font-semibold ml-2">
                        • Checked in: {{ new Date(guest.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                      </span>
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <UButton
                      v-if="!guest.checkedInAt && guest.email"
                      color="orange"
                      variant="outline"
                      size="xs"
                      icon="i-lucide-qr-code"
                      @click="resendQrPass(guest._id)"
                    >
                      Resend QR Pass
                    </UButton>
                    <UBadge
                      v-else-if="guest.checkedInAt"
                      color="success"
                      variant="subtle"
                      size="xs"
                    >
                      Present
                    </UBadge>
                  </div>
                </li>
              </ul>
              <div v-else class="p-6 text-center text-xs text-muted">
                No guests in this section.
              </div>
            </div>
          </div>
        </template>

        <!-- Sticky Floating Action Bar for Selected Items -->
        <div
          v-if="selectedGuestIds.size > 0"
          class="sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-200 bg-white/95 backdrop-blur px-4 py-3 shadow-lg dark:border-orange-800 dark:bg-neutral-900"
        >
          <div class="space-y-0.5">
            <span class="text-sm font-semibold text-highlighted">
              {{ selectedGuestIds.size }} guest{{ selectedGuestIds.size === 1 ? '' : 's' }} selected
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              color="orange"
              size="sm"
              icon="i-lucide-mail"
              :loading="sendingInvites"
              @click="sendInvitesToSelected"
            >
              Send Invites
            </UButton>
            <UButton
              color="error"
              variant="outline"
              size="sm"
              icon="i-lucide-trash-2"
              :loading="saving"
              @click="deleteSelectedGuests"
            >
              Remove Selected
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              :disabled="saving || sendingInvites"
              @click="clearSelection"
            >
              Clear
            </UButton>
          </div>
        </div>
      </div>
    </main>

    <!-- ----------------- ADD GUEST MODAL ----------------- -->
    <UModal v-model:open="isAddGuestModalOpen" title="Add New Guest">
      <template #content>
        <div class="p-4 sm:p-5 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-toast-900 mb-1">First Name</label>
              <input
                v-model="addForm.firstName"
                type="text"
                placeholder="First name"
                class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-toast-900 mb-1">Last Name</label>
              <input
                v-model="addForm.lastName"
                type="text"
                placeholder="Last name"
                class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-toast-900 mb-1">Email Address *</label>
            <input
              v-model="addForm.email"
              type="email"
              placeholder="guest@example.com"
              class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-toast-900 mb-1">Party / Group Name</label>
              <input
                v-model="addForm.partyName"
                type="text"
                placeholder="e.g. VIP, Smith Family"
                class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-toast-900 mb-1">Initial RSVP</label>
              <select
                v-model="addForm.rsvpStatus"
                class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500 font-semibold"
              >
                <option value="PENDING">Pending (Awaiting Reply)</option>
                <option value="GOING">Going (Attending)</option>
                <option value="NOT_GOING">Not Going (Declined)</option>
              </select>
            </div>
          </div>

          <!-- Pax / Registered Companions -->
          <div class="bg-toast-50/80 border border-toast-200/90 rounded-xl p-3 space-y-2">
            <div class="flex items-center justify-between">
              <div>
                <label class="block text-xs font-semibold text-toast-900">Total Pax / Seats</label>
                <p class="text-[11px] text-muted">Total number of guests registered under this entry</p>
              </div>
              <div class="flex items-center gap-1.5 bg-white border border-toast-300/80 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  class="size-6 rounded flex items-center justify-center font-bold text-toast-800 hover:bg-toast-100 cursor-pointer disabled:opacity-30"
                  :disabled="addForm.pax <= 1"
                  @click="addForm.pax = Math.max(1, addForm.pax - 1)"
                >
                  -
                </button>
                <input
                  v-model.number="addForm.pax"
                  type="number"
                  min="1"
                  max="20"
                  class="w-10 text-center font-bold font-mono text-xs text-toast-900 focus:outline-none"
                />
                <button
                  type="button"
                  class="size-6 rounded flex items-center justify-center font-bold text-toast-800 hover:bg-toast-100 cursor-pointer disabled:opacity-30"
                  :disabled="addForm.pax >= 20"
                  @click="addForm.pax = Math.min(20, addForm.pax + 1)"
                >
                  +
                </button>
              </div>
            </div>

            <!-- Preview of registered companions -->
            <div v-if="addForm.pax > 1" class="pt-2 border-t border-toast-200/70 text-xs">
              <span class="text-toast-700 font-medium text-[11px] block mb-1">
                Listed with no email, until you add their names:
              </span>
              <div class="space-y-1 max-h-28 overflow-y-auto pr-1">
                <div
                  v-for="n in (addForm.pax - 1)"
                  :key="n"
                  class="flex items-center gap-2 px-2 py-1 bg-white/95 border border-bread-200 rounded-lg text-[11px] text-toast-800 font-mono shadow-2xs"
                >
                  <UIcon name="i-lucide-user-plus" class="size-3 text-toast-500 shrink-0" />
                  <span class="truncate">
                    {{ addForm.firstName.trim() || 'Guest' }}'s companion {{ n }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-bread-200/60">
            <UButton color="neutral" variant="ghost" size="sm" @click="isAddGuestModalOpen = false">
              Cancel
            </UButton>
            <UButton
              color="toast"
              variant="solid"
              size="sm"
              class="bg-toast-800 hover:bg-toast-900 text-white font-bold"
              :loading="saving"
              @click="handleAddGuest"
            >
              Add Guest
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ----------------- EDIT GUEST MODAL ----------------- -->
    <UModal v-model:open="isEditGuestModalOpen" title="Edit Guest Details">
      <template #content>
        <div class="p-4 sm:p-5 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-toast-900 mb-1">First Name</label>
              <input
                v-model="editForm.firstName"
                type="text"
                placeholder="First name"
                class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-toast-900 mb-1">Last Name</label>
              <input
                v-model="editForm.lastName"
                type="text"
                placeholder="Last name"
                class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-toast-900 mb-1">
              Email Address<span v-if="editingIsCompanion" class="text-muted font-normal"> (optional for a companion)</span>
            </label>
            <input
              v-model="editForm.email"
              type="email"
              placeholder="guest@example.com"
              class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-toast-900 mb-1">Party / Group Name</label>
              <input
                v-model="editForm.partyName"
                type="text"
                placeholder="e.g. VIP, Family"
                class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-toast-900 mb-1">RSVP Status</label>
              <p v-if="editingIsCompanion" class="text-[11px] text-muted pt-1.5">
                Follows the reply of the guest who brought them.
              </p>
              <select
                v-else
                v-model="editForm.rsvpStatus"
                class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500 font-semibold"
              >
                <option value="GOING">Going (Attending)</option>
                <option value="PENDING">Pending (Awaiting Reply)</option>
                <option value="NOT_GOING">Not Going (Declined)</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-bread-200/60">
            <UButton color="neutral" variant="ghost" size="sm" @click="isEditGuestModalOpen = false">
              Cancel
            </UButton>
            <UButton
              color="toast"
              variant="solid"
              size="sm"
              class="bg-toast-800 hover:bg-toast-900 text-white font-bold"
              :loading="saving"
              @click="handleEditGuest"
            >
              Save Changes
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ----------------- BULK INVITE MODAL ----------------- -->
    <UModal v-model:open="isBulkInviteOpen" title="Send Bulk Email Invitations">
      <template #content>
        <div class="p-4 sm:p-5">
          <JamBulkInvite
            :gathering-id="gatheringId"
            @sent="load()"
          />
        </div>
      </template>
    </UModal>

    <!-- ----------------- IMPORT GUESTS MODAL ----------------- -->
    <UModal v-model:open="isImportOpen" title="Import Guests from Another Jam">
      <template #content>
        <div class="p-4 sm:p-5">
          <JamGuestImport
            :gathering-id="gatheringId"
            :guest-count="guests.length"
            start-open
            @imported="isImportOpen = false; load()"
          />
        </div>
      </template>
    </UModal>

    <!-- ----------------- DELETE CONFIRM MODAL ----------------- -->
    <UModal v-model:open="isDeleteConfirmOpen" title="Remove Guest">
      <template #content>
        <div class="p-4 sm:p-5 space-y-3">
          <p class="text-xs sm:text-sm text-toast-800">
            Are you sure you want to remove <strong>{{ guestToDelete ? guestDisplayName(guestToDelete) : 'this guest' }}</strong> from the guest list?
          </p>
          <div class="flex justify-end gap-2 pt-2 border-t border-bread-200/60">
            <UButton color="neutral" variant="ghost" size="sm" @click="isDeleteConfirmOpen = false">
              Cancel
            </UButton>
            <UButton
              color="error"
              variant="solid"
              size="sm"
              :loading="saving"
              @click="confirmDeleteGuest"
            >
              Delete Guest
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
