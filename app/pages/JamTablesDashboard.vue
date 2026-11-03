<script setup lang="ts">
import type { GatheringRecord, SeatingGuestRecord, SeatingSeat, SeatingTable } from '~/types/seating'
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
const { startPageTransition, finishPageTransition } = usePageTransition()
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
const draggedTableIndex = ref<number | null>(null)
const dragOverTableIndex = ref<number | null>(null)
const isOverUnseatZone = ref(false)

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
    compactAllTables()

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
    finishPageTransition()
  }
}

onMounted(load)

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

function tableSeatedGuests(tableId: string): SeatingGuestRecord[] {
  return guests.value
    .filter((g) => g.tableId === tableId && g.seatNumber !== null)
    .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0))
}

function guestAtSeat(table: SeatingTable, seatNumber: number): SeatingGuestRecord | undefined {
  const seated = tableSeatedGuests(table._id)
  return seated[seatNumber - 1]
}

function occupiedSeatsCount(table: SeatingTable): number {
  return tableSeatedGuests(table._id).length
}

async function compactTableSeats(tableId: string): Promise<void> {
  const tableGuests = tableSeatedGuests(tableId)
  const changedGuests: { guest: SeatingGuestRecord; newSeat: number }[] = []

  tableGuests.forEach((g, index) => {
    const expectedSeat = index + 1
    if (g.seatNumber !== expectedSeat) {
      g.seatNumber = expectedSeat
      changedGuests.push({ guest: g, newSeat: expectedSeat })
    }
  })

  if (changedGuests.length > 0) {
    await Promise.all(
      changedGuests.map(({ guest, newSeat }) =>
        seating.moveSeat(gatheringId.value, guest._id, tableId, newSeat).catch(() => {})
      )
    )
  }
}

function compactAllTables() {
  if (!gathering.value) return
  gathering.value.tables.forEach((t) => {
    const tableGuests = tableSeatedGuests(t._id)
    tableGuests.forEach((g, idx) => {
      g.seatNumber = idx + 1
    })
  })
}

async function assignGuestToTable(guestId: string, table: SeatingTable) {
  const guest = guests.value.find((g) => g._id === guestId)
  if (!guest) return

  // If already at this table, nothing to do
  if (guest.tableId === table._id) return

  const currentTableGuests = tableSeatedGuests(table._id)
  if (currentTableGuests.length >= table.capacity) {
    toast.add({
      title: 'Table is full',
      description: `${table.label} has reached its capacity of ${table.capacity} seats.`,
      color: 'warning',
    })
    return
  }

  const previousTableId = guest.tableId
  const nextSeatNumber = currentTableGuests.length + 1

  guest.tableId = table._id
  guest.seatNumber = nextSeatNumber
  guest.isAttending = true

  toast.add({
    title: 'Guest seated',
    description: `${guestDisplayName(guest)} assigned to ${table.label}, Seat ${nextSeatNumber}.`,
    color: 'success',
  })

  try {
    await seating.moveSeat(gatheringId.value, guest._id, table._id, nextSeatNumber)
    if (previousTableId && previousTableId !== table._id) {
      await compactTableSeats(previousTableId)
    }
  } catch (error) {
    toast.add({ title: 'Could not assign seat', description: getApiErrorMessage(error), color: 'error' })
    await load()
  }
}

// Table Naming helpers
function isTableCustomNamed(table: SeatingTable): boolean {
  if (!table.label) return false
  const trimmed = table.label.trim()
  if (!trimmed) return false
  return !/^Table\s+\d+$/i.test(trimmed)
}

const isRenameModalOpen = ref(false)
const targetTableToRename = ref<SeatingTable | null>(null)
const editingTableLabel = ref('')

function openRenameModal(table: SeatingTable) {
  targetTableToRename.value = table
  editingTableLabel.value = table.label
  isRenameModalOpen.value = true
}

async function saveTableRename() {
  if (!gathering.value || !targetTableToRename.value) return
  const table = targetTableToRename.value
  const trimmed = editingTableLabel.value.trim()
  const tableIndex = gathering.value.tables.findIndex((t) => t._id === table._id)
  const defaultLabel = `Table ${tableIndex >= 0 ? tableIndex + 1 : 1}`

  const newLabel = trimmed || defaultLabel
  const oldLabel = table.label
  table.label = newLabel
  table.customLabel = trimmed ? newLabel : ''
  isRenameModalOpen.value = false

  if (oldLabel === newLabel) return

  toast.add({
    title: 'Table renamed',
    description: `Renamed to ${newLabel}.`,
    color: 'success',
  })

  try {
    saving.value = true
    const payload = gathering.value.tables.map((t) => ({
      _id: t._id,
      label: t.label,
      capacity: t.capacity,
    }))
    await seating.replaceTables(gatheringId.value, payload)
  } catch (error) {
    toast.add({ title: 'Could not rename table', description: getApiErrorMessage(error), color: 'error' })
    table.label = oldLabel
  } finally {
    saving.value = false
    targetTableToRename.value = null
  }
}

// ---------------------------------------------------------------------------
// Drag & Drop Handlers
// ---------------------------------------------------------------------------

function onGuestDragStart(event: DragEvent, guest: SeatingGuestRecord) {
  draggedGuestId.value = guest._id
  draggedTableIndex.value = null
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'guest', guestId: guest._id }))
  }
}

function onGuestDragEnd() {
  draggedGuestId.value = null
  dragOverTableIndex.value = null
  isOverUnseatZone.value = false
}

function onTableDragLeave(event: DragEvent, index: number) {
  const related = event.relatedTarget as HTMLElement | null
  const current = event.currentTarget as HTMLElement | null
  if (current && related && current.contains(related)) {
    return
  }
  if (dragOverTableIndex.value === index) {
    dragOverTableIndex.value = null
  }
}

function onTableDragStart(event: DragEvent, index: number) {
  draggedTableIndex.value = index
  draggedGuestId.value = null
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'table', tableIndex: index }))
  }
}

function onTableDragEnd() {
  draggedTableIndex.value = null
  dragOverTableIndex.value = null
}

// Swapping Tables
async function onTableDrop(event: DragEvent, targetIndex: number) {
  dragOverTableIndex.value = null
  const sourceIndex = draggedTableIndex.value
  draggedTableIndex.value = null

  if (sourceIndex === null || sourceIndex === targetIndex || !gathering.value) return

  const tables = [...gathering.value.tables]
  const tableA = tables[sourceIndex]
  const tableB = tables[targetIndex]
  if (!tableA || !tableB) return

  // 1. Swap table positions in layout
  tables[sourceIndex] = tableB
  tables[targetIndex] = tableA

  // 2. Adjust table labels based on the user's rule:
  // "when I move a named table, the moved table retains the name,
  // and the moved table will retain the table number of the named table,
  // unless the moved table also has a name"
  tables.forEach((t, idx) => {
    t.sortOrder = idx
    if (!isTableCustomNamed(t)) {
      t.label = `Table ${idx + 1}`
    }
  })

  // 3. Guests stay with their table, so they move to the new location with their table
  gathering.value.tables = tables

  toast.add({
    title: 'Tables swapped',
    description: `Moved ${tableA.label} and ${tableB.label} and their guests to their new locations.`,
    color: 'success',
  })

  try {
    saving.value = true
    const payload = tables.map((t) => ({
      _id: t._id,
      label: t.label,
      capacity: t.capacity,
    }))
    const updated = await seating.replaceTables(gatheringId.value, payload)
    gathering.value = updated
  } catch (error) {
    toast.add({ title: 'Could not save swapped tables', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

// Dropping guest onto table container (assigns to next seat 1..n)
async function onTableGuestDrop(event: DragEvent, table: SeatingTable) {
  dragOverTableIndex.value = null
  const guestId = draggedGuestId.value
  draggedGuestId.value = null
  if (!guestId) return

  await assignGuestToTable(guestId, table)
}

async function unseatGuest(guest: SeatingGuestRecord) {
  const previousTableId = guest.tableId
  guest.tableId = null
  guest.seatNumber = null

  toast.add({
    title: `${guestDisplayName(guest)} unassigned`,
    color: 'neutral',
  })

  try {
    await seating.moveSeat(gatheringId.value, guest._id, null, null)
    if (previousTableId) {
      await compactTableSeats(previousTableId)
    }
  } catch (error) {
    toast.add({ title: 'Could not unassign guest', description: getApiErrorMessage(error), color: 'error' })
    await load()
  }
}

// Dropping guest to unseat pool
async function onDropToUnseat(event: DragEvent) {
  isOverUnseatZone.value = false
  const guestId = draggedGuestId.value
  draggedGuestId.value = null
  if (!guestId) return

  const guest = guests.value.find((g) => g._id === guestId)
  if (!guest) return
  if (!guest.tableId && !guest.seatNumber) return

  await unseatGuest(guest)
}

// ---------------------------------------------------------------------------
// Table Management: Add & Modify Seats On The Fly
// ---------------------------------------------------------------------------

async function addNewTable() {
  if (!gathering.value) return
  const tables = [...gathering.value.tables]
  const newIndex = tables.length
  const capacity = Math.max(1, Math.min(newTableSeats.value || 8, 30))

  const newTable: SeatingTable = {
    _id: `table-${Date.now()}`,
    label: `Table ${newIndex + 1}`,
    capacity,
    sortOrder: newIndex,
    seats: Array.from({ length: capacity }, (_, i) => ({
      number: i + 1,
      unavailable: false,
      guest: null,
    })),
  }
  tables.push(newTable)
  gathering.value.tables = tables
  isAddTablePopoverOpen.value = false

  toast.add({
    title: 'Table added',
    description: `${newTable.label} created with ${capacity} seats.`,
    color: 'success',
  })

  try {
    saving.value = true
    const payload = tables.map((t) => ({
      _id: t._id,
      label: t.label,
      capacity: t.capacity,
    }))
    const updated = await seating.replaceTables(gatheringId.value, payload)
    gathering.value = updated
  } catch (error) {
    toast.add({ title: 'Could not add table', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function updateTableCapacity(table: SeatingTable, newCapacity: number) {
  if (newCapacity < 1 || newCapacity > 30 || !gathering.value) return
  if (newCapacity === table.capacity) return

  const oldCapacity = table.capacity
  table.capacity = newCapacity

  table.seats = Array.from({ length: newCapacity }, (_, i) => {
    const existing = table.seats?.find((s) => s.number === i + 1)
    return existing ?? { number: i + 1, unavailable: false, guest: null }
  })

  if (newCapacity < oldCapacity) {
    const affected = guests.value.filter((g) => g.tableId === table._id && (g.seatNumber || 0) > newCapacity)
    affected.forEach((g) => {
      g.tableId = null
      g.seatNumber = null
    })
    await Promise.all(
      affected.map((g) => seating.moveSeat(gatheringId.value, g._id, null, null).catch(() => {}))
    )
  }

  try {
    const payload = gathering.value.tables.map((t) => ({
      _id: t._id,
      label: t.label,
      capacity: t.capacity,
    }))
    await seating.replaceTables(gatheringId.value, payload)
  } catch (error) {
    toast.add({ title: 'Could not update capacity', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function removeTable(tableId: string) {
  if (!gathering.value) return
  const targetTable = gathering.value.tables.find((t) => t._id === tableId)
  if (!targetTable) return

  const guestsOnTable = guests.value.filter((g) => g.tableId === tableId)
  guestsOnTable.forEach((g) => {
    g.tableId = null
    g.seatNumber = null
  })

  const updatedTables = gathering.value.tables
    .filter((t) => t._id !== tableId)
    .map((t, idx) => ({
      ...t,
      sortOrder: idx,
      label: isTableCustomNamed(t) ? t.label : `Table ${idx + 1}`,
    }))

  gathering.value.tables = updatedTables

  toast.add({
    title: 'Table removed',
    description: `${targetTable.label} has been deleted.`,
    color: 'neutral',
  })

  try {
    saving.value = true
    const payload = updatedTables.map((t) => ({
      _id: t._id,
      label: t.label,
      capacity: t.capacity,
    }))
    await seating.replaceTables(gatheringId.value, payload)
    await Promise.all(
      guestsOnTable.map((g) => seating.moveSeat(gatheringId.value, g._id, null, null).catch(() => {}))
    )
  } catch (error) {
    toast.add({ title: 'Could not delete table', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
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
    await load()
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
    await load()
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
              <span class="text-[10px] text-muted">Drag onto any table</span>
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
              @drop="onDropToUnseat"
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
              Add your first reception table above. You can customize seat capacity on the fly and drag guests to their seats.
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
              v-for="(table, index) in filteredTables"
              :key="table._id"
              class="relative bg-white rounded-2xl border border-bread-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-start overflow-hidden group select-none"
              :class="[
                dragOverTableIndex === index && draggedTableIndex !== null
                  ? 'ring-4 ring-toast-400 bg-toast-50/40 scale-[1.01] border-toast-400'
                  : draggedTableIndex === index
                    ? 'opacity-40 border-dashed border-toast-300'
                    : '',
              ]"
              @dragover.prevent="dragOverTableIndex = index"
              @dragleave="onTableDragLeave($event, index)"
              @drop="draggedTableIndex !== null ? onTableDrop($event, index) : onTableGuestDrop($event, table)"
            >
              <!-- Drag-over Guest Assignment Overlay (Full container takeover) -->
              <div
                v-if="draggedGuestId && dragOverTableIndex === index"
                class="absolute inset-0 z-30 bg-toast-500/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center rounded-2xl pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-150 text-white shadow-xl"
              >
                <div class="size-14 rounded-full bg-white text-toast-600 flex items-center justify-center mb-3 shadow-md">
                  <UIcon name="i-lucide-user-plus" class="size-7" />
                </div>
                <p class="font-serif font-bold text-lg sm:text-xl text-white">
                  assign guest to {{ table.label }}
                </p>
                <p class="text-xs text-toast-100 font-medium mt-1.5">
                  <span v-if="occupiedSeatsCount(table) >= table.capacity" class="bg-rose-500 text-white font-bold px-2.5 py-0.5 rounded-full">
                    Table is full ({{ table.capacity }}/{{ table.capacity }} seats)
                  </span>
                  <span v-else class="bg-white/20 text-white font-semibold px-2.5 py-0.5 rounded-full">
                    Will be seated at Seat {{ occupiedSeatsCount(table) + 1 }}
                  </span>
                </p>
              </div>

              <!-- Table Card Header (toast-500, draggable for swapping) -->
              <div
                draggable="true"
                class="px-3.5 py-2.5 bg-toast-500 text-white flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-colors rounded-t-2xl"
                title="Drag this table to another table to swap positions and guests"
                @dragstart="onTableDragStart($event, index)"
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
                      Table {{ index + 1 }}
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

              <!-- Interactive Banquet Table Body with Sequential Seats -->
              <div class="p-3 sm:p-3.5 flex flex-col justify-start">
                <!-- Seat Slots Grid (Numbered sequentially 1 to n with no gaps) -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 content-start items-start">
                  <div
                    v-for="seatNum in table.capacity"
                    :key="`${table._id}-${seatNum}`"
                    class="min-h-[46px]"
                  >
                    <!-- 1. OCCUPIED SEAT (1 to n) -->
                    <div
                      v-if="guestAtSeat(table, seatNum)"
                      draggable="true"
                      class="flex items-center justify-between gap-2 p-2 rounded-xl bg-toast-100 hover:bg-toast-200/80 shadow-2xs transition-all cursor-grab active:cursor-grabbing select-none group"
                      :class="draggedGuestId === guestAtSeat(table, seatNum)?._id ? 'opacity-40 ring-2 ring-toast-400' : ''"
                      @dragstart="onGuestDragStart($event, guestAtSeat(table, seatNum)!)"
                      @dragend="onGuestDragEnd"
                    >
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span class="size-5.5 rounded-md bg-toast-500 text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0 shadow-2xs">
                          {{ seatNum }}
                        </span>
                        <div class="min-w-0">
                          <p class="text-xs font-bold text-toast-900 truncate leading-tight">
                            {{ guestDisplayName(guestAtSeat(table, seatNum)!) }}
                          </p>
                          <p v-if="guestAtSeat(table, seatNum)?.partyName" class="text-[10px] text-toast-600 truncate font-medium">
                            {{ guestAtSeat(table, seatNum)?.partyName }}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        class="size-5 rounded flex items-center justify-center cursor-pointer text-toast-400 hover:text-rose-600 hover:bg-rose-100/70 transition-colors shrink-0"
                        title="Unseat guest"
                        @click.stop="unseatGuest(guestAtSeat(table, seatNum)!)"
                      >
                        <UIcon name="i-lucide-x" class="size-3.5" />
                      </button>
                    </div>

                    <!-- 2. EMPTY SEAT (No individual drop, sequential placeholder) -->
                    <div
                      v-else
                      class="flex items-center gap-2 p-2 rounded-xl bg-toast-50/50 text-toast-400 select-none border border-toast-100/60"
                    >
                      <span class="size-5.5 rounded-md bg-white border border-toast-200/60 text-toast-400 text-[10px] font-mono font-bold flex items-center justify-center shadow-2xs">
                        {{ seatNum }}
                      </span>
                      <span class="text-[11px] font-medium text-toast-400">Available</span>
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
