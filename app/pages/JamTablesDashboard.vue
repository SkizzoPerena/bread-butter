<script setup lang="ts">
import type { GatheringRecord, SeatMoveTarget, SeatingGuestRecord, SeatingSeat, SeatingTable } from '~/types/seating'
import { guestDisplayName } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'

definePageMeta({
  layout: 'jam-sub-navbar',
  middleware: 'seating-enabled',
  title: 'Tables & Seats',
  bgClass: 'bg-emerald-50',
})

const route = useRoute()
const toast = useToast()
const { setActiveEvent } = useActiveEvent()
const seating = useSeating()

const gatheringId = computed(() => String(route.params.gatheringId || route.query.gatheringId || ''))
const gathering = ref<GatheringRecord | null>(null)
const guests = ref<SeatingGuestRecord[]>([])
const loading = ref(true)
const saving = ref(false)

// Search filters
const guestSearchQuery = ref('')
const tableSearchQuery = ref('')

// Add Table Controls
const newTableSeats = ref(8)
const isAddTablePopoverOpen = ref(false)

// Drag and Drop State
const draggedGuestId = ref<string | null>(null)
const draggedTableId = ref<string | null>(null)
const dragOverTableId = ref<string | null>(null)
const dragOverSeatKey = ref<string | null>(null)
const isOverUnseatZone = ref(false)
const pendingSaves = ref(0)

// Computed Guest Metrics
const attendingGuests = computed(() =>
  guests.value.filter((g) => g.isAttending || g.rsvpStatus === 'GOING')
)

const seatedGuests = computed(() =>
  attendingGuests.value.filter((g) => g.tableId && g.seatNumber)
)

const unseatedGuests = computed(() =>
  attendingGuests.value.filter((g) => !g.tableId || !g.seatNumber)
)

const filteredUnseatedGuests = computed(() => {
  const q = guestSearchQuery.value.trim().toLowerCase()
  if (!q) return unseatedGuests.value
  return unseatedGuests.value.filter((g) =>
    guestDisplayName(g).toLowerCase().includes(q) ||
    (g.partyName || '').toLowerCase().includes(q) ||
    (g.email || '').toLowerCase().includes(q)
  )
})

const seatedCount = computed(() => seatedGuests.value.length)

const totalSeatsCapacity = computed(() =>
  (gathering.value?.tables || []).reduce((acc, t) => acc + (t.capacity || 0), 0)
)

const seatedPercent = computed(() => {
  if (!attendingGuests.value.length) return 0
  return Math.min(100, Math.round((seatedCount.value / attendingGuests.value.length) * 100))
})

// Filtered Tables
const filteredTables = computed(() => {
  const tables = gathering.value?.tables || []
  const q = tableSearchQuery.value.trim().toLowerCase()
  if (!q) return tables
  return tables.filter((table) => {
    if (table.label.toLowerCase().includes(q)) return true
    // Check if any seated guest on this table matches
    const seatedOnTable = guests.value.filter((g) => g.tableId === table._id)
    return seatedOnTable.some((g) =>
      guestDisplayName(g).toLowerCase().includes(q) ||
      (g.partyName || '').toLowerCase().includes(q)
    )
  })
})

/** `quiet` keeps the page on screen, for refreshing it after a change. */
async function load(quiet = false) {
  if (!gatheringId.value) return
  if (!quiet) loading.value = true
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
    toast.add({
      title: 'Could not load tables and seating',
      description: getApiErrorMessage(error),
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

// Guests can choose seats while the host is here, so pick those up when the plan has changed.
const REFRESH_INTERVAL_MS = 30_000
let refreshTimer: ReturnType<typeof setInterval> | undefined

async function refreshIfSeatsChanged() {
  if (loading.value || draggedGuestId.value || draggedTableId.value || pendingSaves.value) return
  try {
    const latest = await seating.getGathering(gatheringId.value)
    if (latest.seatVersion !== gathering.value?.seatVersion) await load(true)
  } catch {
    // The next check tries again.
  }
}

onMounted(() => {
  load()
  refreshTimer = setInterval(refreshIfSeatsChanged, REFRESH_INTERVAL_MS)
  window.addEventListener('focus', refreshIfSeatsChanged)
})

onBeforeUnmount(() => {
  clearInterval(refreshTimer)
  window.removeEventListener('focus', refreshIfSeatsChanged)
})

// Saves run one at a time, in the order they were made. Any failure shows the plan as it really is.
let saveQueue: Promise<void> = Promise.resolve()

function queueSave(failureTitle: string, save: () => Promise<void>) {
  pendingSaves.value += 1
  saveQueue = saveQueue
    .then(save)
    .catch(async (error) => {
      toast.add({ title: failureTitle, description: getApiErrorMessage(error), color: 'error' })
      await load(true)
    })
    .finally(() => {
      pendingSaves.value -= 1
    })
  return saveQueue
}

// Helper to get seats of a table
function seatsOf(table: SeatingTable): SeatingSeat[] {
  return table.seats ?? Array.from({ length: table.capacity }, (_, index) => ({
    number: index + 1,
    unavailable: false,
    guest: null,
  }))
}

function guestInSeat(table: SeatingTable, seatNumber: number): SeatingGuestRecord | undefined {
  return guests.value.find((g) => g.tableId === table._id && g.seatNumber === seatNumber)
}

function occupiedSeatsCount(table: SeatingTable): number {
  return guests.value.filter((g) => g.tableId === table._id && g.seatNumber !== null).length
}

function nextOpenSeat(table: SeatingTable): SeatingSeat | undefined {
  return seatsOf(table).find((seat) => !seat.unavailable && !guestInSeat(table, seat.number))
}

function tablePosition(table: SeatingTable): number {
  return (gathering.value?.tables ?? []).findIndex((t) => t._id === table._id) + 1
}

function seatKey(table: SeatingTable, seatNumber: number): string {
  return `${table._id}-${seatNumber}`
}

function applyGuest(updated: SeatingGuestRecord | null) {
  if (!updated) return
  const index = guests.value.findIndex((g) => g._id === updated._id)
  if (index !== -1) guests.value[index] = { ...guests.value[index], ...updated }
}

function tableLabelOf(tableId: string | null): string {
  return gathering.value?.tables.find((t) => t._id === tableId)?.label ?? ''
}

function saveMove(guest: SeatingGuestRecord, target: SeatMoveTarget, failureTitle: string) {
  return queueSave(failureTitle, async () => {
    const result = await seating.moveSeat(gatheringId.value, guest._id, target)
    applyGuest(result.guest)
    applyGuest(result.swappedGuest)
    if (gathering.value) gathering.value.seatVersion = result.seatVersion
    toast.add({
      title: result.message,
      description: result.guest.seatNumber
        ? `${guestDisplayName(result.guest)}: ${tableLabelOf(result.guest.tableId)}, Seat ${result.guest.seatNumber}.`
        : `${guestDisplayName(result.guest)} is unassigned.`,
      color: result.guest.seatNumber ? 'success' : 'neutral',
    })
  })
}

/** A drop on a table takes its lowest open seat. The server chooses, so this is only a preview. */
function assignGuestToTable(guestId: string, table: SeatingTable) {
  const guest = guests.value.find((g) => g._id === guestId)
  if (!guest || guest.tableId === table._id) return

  const seat = nextOpenSeat(table)
  if (!seat) {
    toast.add({
      title: 'Table is full',
      description: `${table.label} has no open seats.`,
      color: 'warning',
    })
    return
  }

  guest.tableId = table._id
  guest.seatNumber = seat.number
  return saveMove(guest, { tableId: table._id }, 'Could not assign seat')
}

/** A taken seat trades the two guests, or unassigns its holder if the dragged guest had no seat. */
function assignGuestToSeat(guestId: string, table: SeatingTable, seat: SeatingSeat) {
  const guest = guests.value.find((g) => g._id === guestId)
  if (!guest) return
  if (seat.unavailable) {
    toast.add({ title: 'This seat is unavailable', color: 'warning' })
    return
  }
  const occupant = guestInSeat(table, seat.number)
  if (occupant?._id === guest._id) return

  if (occupant) {
    occupant.tableId = guest.tableId
    occupant.seatNumber = guest.seatNumber
  }
  guest.tableId = table._id
  guest.seatNumber = seat.number
  return saveMove(
    guest,
    { tableId: table._id, seatNumber: seat.number, expectedGuestId: occupant?._id ?? null },
    'Could not assign seat',
  )
}

// Table Naming helpers
function isTableCustomNamed(table: SeatingTable): boolean {
  return Boolean(table.customLabel)
}

const isRenameModalOpen = ref(false)
const targetTableToRename = ref<SeatingTable | null>(null)
const editingTableLabel = ref('')

function openRenameModal(table: SeatingTable) {
  targetTableToRename.value = table
  editingTableLabel.value = table.customLabel ?? ''
  isRenameModalOpen.value = true
}

function saveTableRename() {
  const table = targetTableToRename.value
  if (!table) return
  const label = editingTableLabel.value.trim()
  isRenameModalOpen.value = false
  targetTableToRename.value = null
  if (label === (table.customLabel ?? '')) return

  return queueSave('Could not rename table', async () => {
    gathering.value = await seating.updateTable(gatheringId.value, table._id, { label })
    toast.add({ title: 'Table renamed', color: 'success' })
  })
}

// ---------------------------------------------------------------------------
// Drag & Drop Handlers
// ---------------------------------------------------------------------------

function onGuestDragStart(event: DragEvent, guest: SeatingGuestRecord) {
  draggedGuestId.value = guest._id
  draggedTableId.value = null
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'guest', guestId: guest._id }))
  }
}

function onGuestDragEnd() {
  draggedGuestId.value = null
  dragOverTableId.value = null
  dragOverSeatKey.value = null
  isOverUnseatZone.value = false
}

function onTableDragLeave(event: DragEvent, table: SeatingTable) {
  const related = event.relatedTarget as HTMLElement | null
  const current = event.currentTarget as HTMLElement | null
  if (current && related && current.contains(related)) {
    return
  }
  if (dragOverTableId.value === table._id) {
    dragOverTableId.value = null
  }
}

function onTableDragStart(event: DragEvent, table: SeatingTable) {
  draggedTableId.value = table._id
  draggedGuestId.value = null
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'table', tableId: table._id }))
  }
}

function onTableDragEnd() {
  draggedTableId.value = null
  dragOverTableId.value = null
}

// Swapping Tables. Guests and custom names stay with their table, and numbers follow the position.
function onTableDrop(target: SeatingTable) {
  dragOverTableId.value = null
  const sourceId = draggedTableId.value
  draggedTableId.value = null
  if (!sourceId || sourceId === target._id || !gathering.value) return

  const tables = [...gathering.value.tables]
  const from = tables.findIndex((t) => t._id === sourceId)
  const to = tables.findIndex((t) => t._id === target._id)
  const source = tables[from]
  const destination = tables[to]
  if (!source || !destination) return
  tables[from] = destination
  tables[to] = source
  gathering.value.tables = tables.map((t, index) => ({
    ...t,
    sortOrder: index,
    label: t.customLabel || `Table ${index + 1}`,
  }))

  return queueSave('Could not save swapped tables', async () => {
    gathering.value = await seating.swapTables(gatheringId.value, source._id, destination._id)
    toast.add({ title: 'Tables swapped', color: 'success' })
  })
}

// Dropping guest onto table container (takes the next open seat)
function onTableGuestDrop(table: SeatingTable) {
  dragOverTableId.value = null
  const guestId = draggedGuestId.value
  draggedGuestId.value = null
  if (!guestId) return

  return assignGuestToTable(guestId, table)
}

// Dropping a guest onto one seat. A dragged table falls through to its table's drop.
function onSeatDragOver(table: SeatingTable, seatNumber: number) {
  if (draggedGuestId.value) dragOverSeatKey.value = seatKey(table, seatNumber)
}

function onSeatDrop(event: DragEvent, table: SeatingTable, seat: SeatingSeat) {
  const guestId = draggedGuestId.value
  if (!guestId) return
  event.stopPropagation()
  draggedGuestId.value = null
  dragOverTableId.value = null
  dragOverSeatKey.value = null
  return assignGuestToSeat(guestId, table, seat)
}

function unseatGuest(guest: SeatingGuestRecord) {
  guest.tableId = null
  guest.seatNumber = null
  return saveMove(guest, { tableId: null }, 'Could not unassign guest')
}

// Dropping guest to unseat pool
function onDropToUnseat() {
  isOverUnseatZone.value = false
  const guestId = draggedGuestId.value
  draggedGuestId.value = null
  if (!guestId) return

  const guest = guests.value.find((g) => g._id === guestId)
  if (!guest) return
  if (!guest.tableId && !guest.seatNumber) return

  return unseatGuest(guest)
}

// ---------------------------------------------------------------------------
// Table Management: Add & Modify Seats On The Fly
// ---------------------------------------------------------------------------

function layoutRow(table: SeatingTable) {
  return { _id: table._id, label: table.customLabel ?? '', capacity: table.capacity }
}

function addNewTable() {
  if (!gathering.value) return
  const capacity = Math.max(1, Math.min(newTableSeats.value || 8, 30))
  const layout = [...gathering.value.tables.map(layoutRow), { label: '', capacity }]
  isAddTablePopoverOpen.value = false

  return queueSave('Could not add table', async () => {
    saving.value = true
    try {
      gathering.value = await seating.replaceTables(gatheringId.value, layout)
      toast.add({ title: 'Table added', description: `New table with ${capacity} seats.`, color: 'success' })
    } finally {
      saving.value = false
    }
  })
}

// Each click on the stepper would be a write, so save once the host has stopped clicking.
const CAPACITY_SAVE_DELAY_MS = 400
const capacitySaves = new Map<string, { timer: ReturnType<typeof setTimeout>, confirmClear: boolean }>()

function updateTableCapacity(table: SeatingTable, newCapacity: number) {
  if (newCapacity < 1 || newCapacity > 30 || newCapacity === table.capacity) return

  const affected = guests.value.filter((g) => g.tableId === table._id && (g.seatNumber || 0) > newCapacity)
  if (affected.length && !window.confirm(`Removing this seat also unseats ${affected.map(guestDisplayName).join(', ')}. Continue?`)) {
    return
  }
  affected.forEach((g) => {
    g.tableId = null
    g.seatNumber = null
  })

  table.capacity = newCapacity
  table.seats = Array.from({ length: newCapacity }, (_, i) => (
    table.seats?.find((s) => s.number === i + 1) ?? { number: i + 1, unavailable: false, guest: null }
  ))

  const pending = capacitySaves.get(table._id)
  if (pending) clearTimeout(pending.timer)
  const confirmClear = Boolean(pending?.confirmClear) || affected.length > 0
  capacitySaves.set(table._id, {
    confirmClear,
    timer: setTimeout(() => {
      capacitySaves.delete(table._id)
      const capacity = table.capacity
      queueSave('Could not update capacity', async () => {
        gathering.value = await seating.updateTable(gatheringId.value, table._id, { capacity, confirmClear })
      })
    }, CAPACITY_SAVE_DELAY_MS),
  })
}

function removeTable(tableId: string) {
  if (!gathering.value) return
  const targetTable = gathering.value.tables.find((t) => t._id === tableId)
  if (!targetTable) return

  const guestsOnTable = guests.value.filter((g) => g.tableId === tableId)
  if (guestsOnTable.length && !window.confirm(`Deleting ${targetTable.label} also unseats ${guestsOnTable.length === 1 ? '1 guest' : `${guestsOnTable.length} guests`}. Continue?`)) {
    return
  }
  guestsOnTable.forEach((g) => {
    g.tableId = null
    g.seatNumber = null
  })

  const remaining = gathering.value.tables.filter((t) => t._id !== tableId)
  gathering.value.tables = remaining

  return queueSave('Could not delete table', async () => {
    saving.value = true
    try {
      gathering.value = await seating.replaceTables(gatheringId.value, remaining.map(layoutRow), true)
      toast.add({ title: 'Table removed', description: `${targetTable.label} has been deleted.`, color: 'neutral' })
    } finally {
      saving.value = false
    }
  })
}

async function runAutoAssign() {
  if (!gatheringId.value) return
  saving.value = true
  try {
    const result = await seating.autoAssign(gatheringId.value)
    guests.value = result.guests
    gathering.value = result.gathering
    toast.add({
      title: 'Auto-seating completed',
      description: `Assigned seats to ${result.assignedCount} guests.`,
      color: 'success',
    })
    await load(true)
  } catch (error) {
    toast.add({ title: 'Could not auto-assign', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function toggleSeatSelectionLock() {
  if (!gathering.value) return
  try {
    gathering.value = await seating.saveInvitation(gatheringId.value, {
      seatSelectionLocked: !gathering.value.seatSelectionLocked,
    })
    toast.add({
      title: gathering.value.seatSelectionLocked ? 'Seat selection locked' : 'Seat selection unlocked',
      color: 'success',
    })
  } catch (error) {
    toast.add({ title: 'Could not toggle lock', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function toggleSeat(table: SeatingTable, seat: SeatingSeat) {
  try {
    gathering.value = await seating.setSeatUnavailable(gatheringId.value, table._id, seat.number, !seat.unavailable)
  } catch (error) {
    toast.add({ title: 'Could not toggle seat', description: getApiErrorMessage(error), color: 'error' })
  }
}
</script>

<template>
  <div class="jam-tables-dashboard-root w-full">
    <!-- Subpage Top Navbar Teleport -->
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div class="flex items-center gap-2">
          <UButton
            :icon="gathering?.seatSelectionLocked ? 'i-lucide-lock' : 'i-lucide-unlock'"
            color="neutral"
            variant="outline"
            size="xs"
            class="hidden sm:inline-flex cursor-pointer text-xs font-semibold"
            :title="gathering?.seatSelectionLocked ? 'Guests cannot pick seats' : 'Guests can pick seats'"
            @click="toggleSeatSelectionLock"
          >
            {{ gathering?.seatSelectionLocked ? 'Locked' : 'Unlocked' }}
          </UButton>
          <UButton
            color="toast"
            variant="solid"
            size="xs"
            icon="i-lucide-sparkles"
            :loading="saving"
            class="bg-toast-800 hover:bg-toast-900 text-white font-bold cursor-pointer shadow-xs"
            @click="runAutoAssign"
          >
            Auto-Seat
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- Main Workspace Container: 2-Division Split Layout -->
    <div
      class="grid grid-cols-1 lg:grid-cols-4 lg:overflow-hidden min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] w-full bg-toast-50/20"
    >
      <!-- ================= LEFT DIVISION (col-span-1): Overview & Unassigned Pool ================= -->
      <aside
        class="col-span-1 border-r border-bread-200/80 bg-white/80 backdrop-blur p-4 sm:p-5 flex flex-col justify-between overflow-y-auto lg:h-[calc(100vh-64px)] space-y-4"
      >
        <div class="space-y-4">
          <!-- Sidebar Header -->
          <div>
            <h2 class="font-serif text-lg font-bold text-highlighted tracking-tight">Tables & Seating</h2>
            <p class="text-xs text-muted mt-0.5">Drag guests to tables or swap table positions</p>
          </div>

          <!-- Overview Metrics 2x2 Grid -->
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-toast-50/70 border border-bread-200/70 rounded-xl p-2.5 flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-toast-800 font-sans">Tables</span>
                <UIcon name="i-lucide-layout-grid" class="size-3.5 text-toast-600" />
              </div>
              <span class="text-xl sm:text-2xl font-bold font-serif text-toast-900 tracking-tight mt-1">
                {{ gathering?.tables?.length || 0 }}
              </span>
            </div>

            <div class="bg-toast-50/70 border border-bread-200/70 rounded-xl p-2.5 flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-toast-800 font-sans">Capacity</span>
                <UIcon name="i-lucide-users" class="size-3.5 text-toast-600" />
              </div>
              <span class="text-xl sm:text-2xl font-bold font-serif text-toast-900 tracking-tight mt-1">
                {{ totalSeatsCapacity }}
              </span>
            </div>

            <div class="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-2.5 flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-emerald-800 font-sans">Seated</span>
                <UIcon name="i-lucide-check-circle" class="size-3.5 text-emerald-600" />
              </div>
              <span class="text-xl sm:text-2xl font-bold font-serif text-emerald-900 tracking-tight mt-1">
                {{ seatedCount }}
              </span>
            </div>

            <div class="bg-rose-50/70 border border-rose-200/70 rounded-xl p-2.5 flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-rose-800 font-sans">Unassigned</span>
                <UIcon name="i-lucide-user-x" class="size-3.5 text-rose-600" />
              </div>
              <span class="text-xl sm:text-2xl font-bold font-serif text-rose-900 tracking-tight mt-1">
                {{ unseatedGuests.length }}
              </span>
            </div>
          </div>

          <!-- Progress Bar Card -->
          <div class="bg-toast-50/70 border border-bread-200/70 rounded-xl p-3 space-y-1.5">
            <div class="flex items-center justify-between text-xs font-sans">
              <span class="font-semibold text-toast-800">Seating Progress</span>
              <span class="font-bold font-serif text-highlighted">{{ seatedPercent }}%</span>
            </div>
            <UProgress :model-value="seatedPercent" color="emerald" size="xs" />
            <p class="text-[11px] text-muted font-sans pt-0.5">
              {{ seatedCount }} of {{ attendingGuests.length }} attending seated
            </p>
          </div>

          <!-- Unassigned Pool Section -->
          <div class="pt-2 space-y-2.5 border-t border-bread-200/60">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-xs text-toast-900 font-sans">Unassigned Guests</span>
                <UBadge color="neutral" variant="subtle" size="xs">
                  {{ unseatedGuests.length }}
                </UBadge>
              </div>
              <span class="text-[10px] text-muted">Drag onto a table or seat</span>
            </div>

            <!-- Search unassigned guests -->
            <UInput
              v-model="guestSearchQuery"
              icon="i-lucide-search"
              placeholder="Search unassigned..."
              size="xs"
              class="w-full"
            />

            <!-- Drop zone to unseat guests -->
            <div
              class="border-2 border-dashed rounded-xl p-2.5 text-center transition-all flex items-center justify-center gap-2 text-xs font-medium cursor-default select-none"
              :class="isOverUnseatZone
                ? 'border-rose-400 bg-rose-100 text-rose-800 ring-2 ring-rose-300'
                : draggedGuestId
                  ? 'border-rose-300/80 bg-rose-50/60 text-rose-700 animate-pulse'
                  : 'border-bread-300 bg-toast-50/40 text-muted'"
              @dragover.prevent="isOverUnseatZone = true"
              @dragleave="isOverUnseatZone = false"
              @drop="onDropToUnseat()"
            >
              <UIcon name="i-lucide-user-minus" class="size-4 shrink-0" />
              <span>Drop guest here to unseat</span>
            </div>

            <!-- Draggable Unassigned Guests List -->
            <div
              v-if="filteredUnseatedGuests.length === 0"
              class="py-6 text-center text-xs text-muted border border-dashed border-bread-200 rounded-xl bg-toast-50/30"
            >
              {{ unseatedGuests.length === 0 ? 'All attending guests are seated!' : 'No guests match your search' }}
            </div>

            <div
              v-else
              class="space-y-1.5 max-h-72 lg:max-h-80 overflow-y-auto pr-1"
            >
              <div
                v-for="guest in filteredUnseatedGuests"
                :key="guest._id"
                draggable="true"
                class="flex items-center justify-between gap-2 p-2 rounded-xl border border-bread-200/90 bg-white hover:bg-toast-50/90 hover:border-toast-300 shadow-2xs transition-all cursor-grab active:cursor-grabbing select-none group"
                :class="draggedGuestId === guest._id ? 'opacity-40 ring-2 ring-toast-400' : ''"
                @dragstart="onGuestDragStart($event, guest)"
                @dragend="onGuestDragEnd"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <UIcon name="i-lucide-grip-vertical" class="size-3.5 text-muted group-hover:text-toast-600 shrink-0" />
                  <div class="min-w-0">
                    <p class="font-semibold text-xs text-toast-900 truncate leading-tight">
                      {{ guestDisplayName(guest) }}
                    </p>
                    <p v-if="guest.partyName" class="text-[10px] text-muted truncate">
                      {{ guest.partyName }}
                    </p>
                  </div>
                </div>

                <UBadge color="emerald" variant="subtle" size="xs" class="shrink-0 text-[10px]">
                  Attending
                </UBadge>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Bottom Quick Action -->
        <div class="pt-3 border-t border-bread-200/60 space-y-2">
          <UButton
            icon="i-lucide-sparkles"
            color="toast"
            size="sm"
            block
            class="w-full justify-center bg-toast-800 hover:bg-toast-900 text-white font-semibold cursor-pointer shadow-xs"
            :loading="saving"
            @click="runAutoAssign"
          >
            Auto-Seat All Guests
          </UButton>
        </div>
      </aside>

      <!-- ================= RIGHT DIVISION (col-span-3): Interactive Floor & Tables ================= -->
      <main
        class="col-span-1 lg:col-span-3 w-full h-full lg:h-[calc(100vh-64px)] flex flex-col min-h-0 overflow-hidden bg-toast-50/30"
      >
        <!-- Top Sticky Toolbar -->
        <header
          class="bg-white/95 backdrop-blur border-b border-bread-200/80 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10 w-full"
        >
          <!-- Left: Search and Filter tables -->
          <div class="flex items-center gap-2.5 flex-1 min-w-0">
            <UInput
              v-model="tableSearchQuery"
              icon="i-lucide-search"
              type="search"
              placeholder="Filter tables or search seated guest..."
              class="w-full sm:w-72"
            />
            <span class="text-xs text-muted hidden md:inline-block">
              {{ filteredTables.length }} of {{ gathering?.tables?.length || 0 }} tables
            </span>
          </div>

          <!-- Right: Add Table Controls On The Fly -->
          <div class="flex items-center gap-2.5 shrink-0 ml-auto">
            <!-- On-the-fly Table Adder -->
            <div class="flex items-center gap-1.5 bg-toast-100/70 border border-bread-200/70 rounded-xl px-2.5 py-1 text-xs">
              <span class="text-muted text-[11px] font-medium">Seats:</span>
              <button
                type="button"
                class="size-5 rounded flex items-center justify-center font-bold text-toast-800 hover:bg-white cursor-pointer disabled:opacity-30"
                :disabled="newTableSeats <= 1"
                @click="newTableSeats = Math.max(1, newTableSeats - 1)"
              >
                -
              </button>
              <span class="font-bold text-toast-900 font-mono w-4 text-center">{{ newTableSeats }}</span>
              <button
                type="button"
                class="size-5 rounded flex items-center justify-center font-bold text-toast-800 hover:bg-white cursor-pointer disabled:opacity-30"
                :disabled="newTableSeats >= 30"
                @click="newTableSeats = Math.min(30, newTableSeats + 1)"
              >
                +
              </button>
            </div>

            <UButton
              icon="i-lucide-plus"
              color="emerald"
              variant="solid"
              size="sm"
              class="cursor-pointer font-semibold shadow-xs"
              :loading="saving"
              @click="addNewTable"
            >
              Add Table
            </UButton>
          </div>
        </header>

        <!-- Interactive Tables Canvas -->
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 min-h-0">
          <!-- Loading State -->
          <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-muted">
            <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-toast-600" />
            <p class="mt-3 text-sm font-medium">Loading tables & seating arrangement...</p>
          </div>

          <!-- Empty Tables State -->
          <div
            v-else-if="!gathering?.tables?.length"
            class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-toast-300/80 bg-toast-50/50 p-12 text-center max-w-lg mx-auto space-y-3"
          >
            <div class="size-14 rounded-full bg-toast-100 flex items-center justify-center text-toast-600 mx-auto">
              <UIcon name="i-lucide-layout-grid" class="size-7" />
            </div>
            <h3 class="font-serif text-lg font-bold text-toast-900">No tables created yet</h3>
            <p class="text-xs text-toast-600 max-w-sm">
              Add your first reception table above. You can change a table's seats at any time and drag guests onto them.
            </p>
            <UButton
              icon="i-lucide-plus"
              color="emerald"
              size="sm"
              class="mt-2 font-semibold cursor-pointer shadow-xs"
              @click="addNewTable"
            >
              Add Table ({{ newTableSeats }} seats)
            </UButton>
          </div>

          <!-- No Search Results -->
          <div
            v-else-if="filteredTables.length === 0"
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-300 p-8 text-center text-muted"
          >
            <UIcon name="i-lucide-search-x" class="size-6 mb-2" />
            <p class="text-sm font-medium">No tables or seated guests match "{{ tableSearchQuery }}"</p>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              class="mt-2 cursor-pointer text-toast-700"
              @click="tableSearchQuery = ''"
            >
              Clear filter
            </UButton>
          </div>

          <!-- Interactive Tables Grid -->
          <div
            v-else
            class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start"
          >
            <div
              v-for="table in filteredTables"
              :key="table._id"
              data-testid="jam-table"
              class="relative bg-white rounded-2xl border border-bread-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-start overflow-hidden group select-none"
              :class="[
                dragOverTableId === table._id && (draggedTableId !== null || draggedGuestId !== null)
                  ? 'ring-4 ring-toast-400 bg-toast-50/40 border-toast-400'
                  : draggedTableId === table._id
                    ? 'opacity-40 border-dashed border-toast-300'
                    : '',
              ]"
              @dragover.prevent="dragOverTableId = table._id"
              @dragleave="onTableDragLeave($event, table)"
              @drop="draggedTableId !== null ? onTableDrop(table) : onTableGuestDrop(table)"
            >
              <!-- Table Card Header (toast-500, draggable for swapping) -->
              <div
                draggable="true"
                class="px-3.5 py-2.5 bg-toast-500 text-white flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-colors rounded-t-2xl"
                title="Drag this table onto another table to swap their positions. Guests stay with their table."
                @dragstart="onTableDragStart($event, table)"
                @dragend="onTableDragEnd"
              >
                <!-- Drag Grip & Table Label -->
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    class="size-6 rounded-md bg-white/20 text-white flex items-center justify-center shadow-2xs shrink-0 group-hover:bg-white/30"
                  >
                    <UIcon name="i-lucide-grip-vertical" class="size-3.5" />
                  </div>

                  <div class="flex items-center gap-1.5 min-w-0 group/name">
                    <h3
                      class="font-serif font-bold text-sm sm:text-base text-white truncate cursor-pointer hover:text-toast-100"
                      :title="'Click to rename ' + table.label"
                      @click.stop="openRenameModal(table)"
                    >
                      {{ table.label }}
                    </h3>
                    <UBadge
                      v-if="isTableCustomNamed(table)"
                      color="neutral"
                      variant="solid"
                      size="xs"
                      class="bg-white/20 text-white text-[9.5px] font-mono px-1.5 py-0 shrink-0 font-semibold"
                    >
                      Table {{ tablePosition(table) }}
                    </UBadge>
                    <button
                      type="button"
                      class="opacity-0 group-hover/name:opacity-100 p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-md transition-opacity cursor-pointer shrink-0"
                      title="Rename table"
                      @click.stop="openRenameModal(table)"
                    >
                      <UIcon name="i-lucide-pencil" class="size-3" />
                    </button>
                  </div>
                </div>

                <!-- On the fly seat count adjustment & Delete -->
                <div class="flex items-center gap-1.5 shrink-0">
                  <!-- Stepper for on the fly seats (Solid white pill) -->
                  <div
                    class="inline-flex items-center gap-1 bg-white rounded-lg p-0.5 shadow-2xs"
                    title="Change seat capacity on the fly"
                    @click.stop
                  >
                    <button
                      type="button"
                      class="size-5 rounded flex items-center justify-center font-bold text-toast-700 hover:bg-toast-100 cursor-pointer disabled:opacity-30"
                      :disabled="table.capacity <= 1"
                      @click="updateTableCapacity(table, table.capacity - 1)"
                    >
                      -
                    </button>
                    <span class="text-xs font-bold font-mono text-toast-900 px-1">{{ table.capacity }}</span>
                    <button
                      type="button"
                      class="size-5 rounded flex items-center justify-center font-bold text-toast-700 hover:bg-toast-100 cursor-pointer disabled:opacity-30"
                      :disabled="table.capacity >= 30"
                      @click="updateTableCapacity(table, table.capacity + 1)"
                    >
                      +
                    </button>
                  </div>

                  <!-- Table Occupancy Badge -->
                  <span
                    class="font-bold text-[10px] px-2 py-0.5 rounded-full shrink-0 shadow-2xs"
                    :class="occupiedSeatsCount(table) >= table.capacity
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-toast-900'"
                  >
                    {{ occupiedSeatsCount(table) }}/{{ table.capacity }}
                  </span>

                  <!-- Delete Table -->
                  <button
                    type="button"
                    class="size-6 rounded-lg text-white/80 hover:text-white hover:bg-rose-600/70 flex items-center justify-center cursor-pointer transition-colors"
                    title="Delete Table"
                    @click.stop="removeTable(table._id)"
                  >
                    <UIcon name="i-lucide-trash-2" class="size-3.5" />
                  </button>
                </div>
              </div>

              <!-- Interactive Banquet Table Body -->
              <div class="p-3 sm:p-3.5 flex flex-col justify-start">
                <p
                  v-if="draggedGuestId && dragOverTableId === table._id"
                  class="mb-2 rounded-lg bg-toast-100 px-2 py-1 text-center text-[11px] font-semibold text-toast-900"
                >
                  {{ nextOpenSeat(table) ? `Drop on a seat, or anywhere here for Seat ${nextOpenSeat(table)?.number}` : 'No open seats. Drop on a guest to swap.' }}
                </p>
                <!-- Seat Slots Grid. Seats keep their real numbers, because guests choose their own. -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 content-start items-start">
                  <div
                    v-for="seat in seatsOf(table)"
                    :key="seatKey(table, seat.number)"
                    class="min-h-[46px] rounded-xl transition-all"
                    :class="dragOverSeatKey === seatKey(table, seat.number) ? 'ring-2 ring-toast-500' : ''"
                    data-testid="host-seat"
                    @dragover.prevent="onSeatDragOver(table, seat.number)"
                    @dragleave="dragOverSeatKey = null"
                    @drop="onSeatDrop($event, table, seat)"
                  >
                    <!-- 1. OCCUPIED SEAT -->
                    <div
                      v-if="guestInSeat(table, seat.number)"
                      draggable="true"
                      class="flex items-center justify-between gap-2 p-2 rounded-xl bg-toast-100 hover:bg-toast-200/80 shadow-2xs transition-all cursor-grab active:cursor-grabbing select-none group"
                      :class="draggedGuestId === guestInSeat(table, seat.number)?._id ? 'opacity-40 ring-2 ring-toast-400' : ''"
                      @dragstart="onGuestDragStart($event, guestInSeat(table, seat.number)!)"
                      @dragend="onGuestDragEnd"
                    >
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span class="size-5.5 rounded-md bg-toast-500 text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0 shadow-2xs">
                          {{ seat.number }}
                        </span>
                        <div class="min-w-0">
                          <p class="text-xs font-bold text-toast-900 truncate leading-tight">
                            {{ guestDisplayName(guestInSeat(table, seat.number)!) }}
                          </p>
                          <p v-if="guestInSeat(table, seat.number)?.partyName" class="text-[10px] text-toast-600 truncate font-medium">
                            {{ guestInSeat(table, seat.number)?.partyName }}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        class="size-5 rounded flex items-center justify-center cursor-pointer text-toast-400 hover:text-rose-600 hover:bg-rose-100/70 transition-colors shrink-0"
                        title="Unseat guest"
                        @click.stop="unseatGuest(guestInSeat(table, seat.number)!)"
                      >
                        <UIcon name="i-lucide-x" class="size-3.5" />
                      </button>
                    </div>

                    <!-- 2. EMPTY OR UNAVAILABLE SEAT -->
                    <div
                      v-else
                      class="flex items-center justify-between gap-2 p-2 rounded-xl select-none border"
                      :class="seat.unavailable
                        ? 'bg-rose-50/60 text-rose-400 border-rose-100'
                        : 'bg-toast-50/50 text-toast-400 border-toast-100/60'"
                    >
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="size-5.5 rounded-md bg-white border border-toast-200/60 text-toast-400 text-[10px] font-mono font-bold flex items-center justify-center shadow-2xs shrink-0">
                          {{ seat.number }}
                        </span>
                        <span class="text-[11px] font-medium truncate">{{ seat.unavailable ? 'Unavailable' : 'Available' }}</span>
                      </div>
                      <button
                        type="button"
                        class="size-5 rounded flex items-center justify-center cursor-pointer text-toast-400 hover:text-toast-800 hover:bg-toast-100 transition-colors shrink-0"
                        :title="seat.unavailable ? 'Make this seat available' : 'Make this seat unavailable'"
                        :aria-label="`${seat.unavailable ? 'Make available' : 'Make unavailable'}: ${table.label}, seat ${seat.number}`"
                        @click.stop="toggleSeat(table, seat)"
                      >
                        <UIcon :name="seat.unavailable ? 'i-lucide-rotate-ccw' : 'i-lucide-ban'" class="size-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Change Table Name Modal -->
    <UModal v-model:open="isRenameModalOpen" title="Change Table Name">
      <template #content>
        <div class="p-4 sm:p-5 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-toast-900 mb-1.5">
              Table Name
            </label>
            <UInput
              v-model="editingTableLabel"
              placeholder="e.g. VIP Table, Presidential, Family"
              size="md"
              class="w-full"
              autofocus
              @keydown.enter.prevent="saveTableRename"
            />
            <p class="text-[11px] text-muted mt-1.5">
              Leave blank to use default numbering (e.g. Table 1).
            </p>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-bread-200/60">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              class="cursor-pointer"
              @click="isRenameModalOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="toast"
              variant="solid"
              size="sm"
              class="bg-toast-800 hover:bg-toast-900 text-white font-bold cursor-pointer"
              :loading="saving"
              @click="saveTableRename"
            >
              Change table name
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
/* Smooth drag preview styling */
[draggable="true"] {
  user-select: none;
  -webkit-user-select: none;
}
</style>
