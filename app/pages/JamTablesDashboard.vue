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
const dragOverSeatKey = ref<string | null>(null)
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

function occupiedSeatsCount(table: SeatingTable): number {
  return guests.value.filter((g) => g.tableId === table._id && g.seatNumber).length
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
  dragOverSeatKey.value = null
  isOverUnseatZone.value = false
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

  // 2. Adjust table labels based on new arrangement (Table 1, Table 2...)
  tables.forEach((t, idx) => {
    t.sortOrder = idx
    if (/^Table\s+\d+$/i.test(t.label.trim()) || !t.label.trim()) {
      t.label = `Table ${idx + 1}`
    }
  })

  // 3. Swap guests between the two tables (tableA guests move to tableB, tableB guests move to tableA)
  const guestsA = guests.value.filter((g) => g.tableId === tableA._id)
  const guestsB = guests.value.filter((g) => g.tableId === tableB._id)

  guestsA.forEach((g) => {
    g.tableId = tableB._id
    if ((g.seatNumber || 0) > tableB.capacity) {
      g.seatNumber = null
      g.tableId = null
    }
  })

  guestsB.forEach((g) => {
    g.tableId = tableA._id
    if ((g.seatNumber || 0) > tableA.capacity) {
      g.seatNumber = null
      g.tableId = null
    }
  })

  gathering.value.tables = tables

  toast.add({
    title: 'Tables swapped',
    description: `Swapped arrangement, numbers, and guests of ${tableA.label} and ${tableB.label}.`,
    color: 'success',
  })

  try {
    saving.value = true
    const payload = tables.map((t) => ({
      _id: t._id,
      label: t.label,
      capacity: t.capacity,
    }))
    await seating.replaceTables(gatheringId.value, payload)
    await Promise.all([
      ...guestsA.map((g) => seating.moveSeat(gatheringId.value, g._id, g.tableId, g.seatNumber).catch(() => {})),
      ...guestsB.map((g) => seating.moveSeat(gatheringId.value, g._id, g.tableId, g.seatNumber).catch(() => {})),
    ])
  } catch (error) {
    toast.add({ title: 'Could not save swapped tables', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

// Dropping guest on specific seat
async function onSeatDrop(event: DragEvent, table: SeatingTable, seatNumber: number) {
  dragOverSeatKey.value = null
  dragOverTableIndex.value = null
  const guestId = draggedGuestId.value
  draggedGuestId.value = null
  if (!guestId) return

  const guest = guests.value.find((g) => g._id === guestId)
  if (!guest) return

  // If seat is occupied, swap occupants
  const existingGuest = guests.value.find((g) => g.tableId === table._id && g.seatNumber === seatNumber)
  if (existingGuest && existingGuest._id !== guest._id) {
    existingGuest.tableId = guest.tableId
    existingGuest.seatNumber = guest.seatNumber
  }

  guest.tableId = table._id
  guest.seatNumber = seatNumber
  guest.isAttending = true

  toast.add({
    title: 'Guest seated',
    description: `${guestDisplayName(guest)} placed at ${table.label}, Seat ${seatNumber}.`,
    color: 'success',
  })

  try {
    await seating.moveSeat(gatheringId.value, guest._id, table._id, seatNumber)
  } catch (error) {
    toast.add({ title: 'Could not assign seat', description: getApiErrorMessage(error), color: 'error' })
    await load()
  }
}

// Dropping guest onto whole table (auto-seats to first free slot)
async function onTableGuestDrop(event: DragEvent, table: SeatingTable) {
  dragOverTableIndex.value = null
  const guestId = draggedGuestId.value
  if (!guestId) return

  const occupiedSeatNums = new Set(
    guests.value
      .filter((g) => g.tableId === table._id && g.seatNumber)
      .map((g) => g.seatNumber as number)
  )

  let firstEmptySeat: number | null = null
  for (let s = 1; s <= table.capacity; s++) {
    const isUnavailable = table.seats?.find((seat) => seat.number === s)?.unavailable
    if (!occupiedSeatNums.has(s) && !isUnavailable) {
      firstEmptySeat = s
      break
    }
  }

  if (!firstEmptySeat) {
    toast.add({
      title: 'Table is full',
      description: `${table.label} has no empty seats. Add seats or choose another table.`,
      color: 'warning',
    })
    draggedGuestId.value = null
    return
  }

  await onSeatDrop(event, table, firstEmptySeat)
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

  guest.tableId = null
  guest.seatNumber = null

  toast.add({
    title: 'Guest unseated',
    description: `${guestDisplayName(guest)} moved to unassigned pool.`,
    color: 'neutral',
  })

  try {
    await seating.moveSeat(gatheringId.value, guest._id, null, null)
  } catch (error) {
    toast.add({ title: 'Could not unassign guest', description: getApiErrorMessage(error), color: 'error' })
    await load()
  }
}

async function unseatGuest(guest: SeatingGuestRecord) {
  guest.tableId = null
  guest.seatNumber = null
  toast.add({
    title: `${guestDisplayName(guest)} unassigned`,
    color: 'neutral',
  })
  try {
    await seating.moveSeat(gatheringId.value, guest._id, null, null)
  } catch (error) {
    toast.add({ title: 'Could not unassign guest', description: getApiErrorMessage(error), color: 'error' })
    await load()
  }
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
      label: /^Table\s+\d+$/i.test(t.label.trim()) || !t.label.trim() ? `Table ${idx + 1}` : t.label,
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
            class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            <div
              v-for="(table, index) in filteredTables"
              :key="table._id"
              class="bg-white rounded-2xl border-2 transition-all shadow-xs flex flex-col justify-between overflow-hidden group select-none"
              :class="[
                dragOverTableIndex === index
                  ? 'border-emerald-500 ring-4 ring-emerald-200 bg-emerald-50/30 scale-[1.01]'
                  : draggedTableIndex === index
                    ? 'opacity-40 border-dashed border-toast-400'
                    : 'border-toast-200/90 hover:border-toast-300 hover:shadow-sm',
              ]"
              @dragover.prevent="dragOverTableIndex = index"
              @dragleave="dragOverTableIndex = null"
              @drop="draggedTableIndex !== null ? onTableDrop($event, index) : onTableGuestDrop($event, table)"
            >
              <!-- Table Card Header (Draggable for Swapping) -->
              <div
                draggable="true"
                class="px-4 py-3 bg-toast-50/70 border-b border-toast-200/70 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-colors"
                title="Drag this table to another table to swap positions and guests"
                @dragstart="onTableDragStart($event, index)"
                @dragend="onTableDragEnd"
              >
                <!-- Drag Grip & Table Label -->
                <div class="flex items-center gap-2 min-w-0">
                  <div
                    class="size-6 rounded-md bg-white border border-toast-200/70 flex items-center justify-center text-toast-400 group-hover:text-toast-700 shadow-2xs shrink-0"
                  >
                    <UIcon name="i-lucide-grip-vertical" class="size-3.5" />
                  </div>
                  <div>
                    <h3 class="font-serif font-bold text-sm sm:text-base text-toast-900 truncate">
                      {{ table.label }}
                    </h3>
                  </div>
                </div>

                <!-- On the fly seat count adjustment & Delete -->
                <div class="flex items-center gap-1.5 shrink-0">
                  <!-- Stepper for on the fly seats -->
                  <div
                    class="inline-flex items-center gap-1 bg-white rounded-lg p-0.5 border border-toast-200/80 shadow-2xs"
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
                  <UBadge
                    :color="occupiedSeatsCount(table) >= table.capacity ? 'emerald' : 'toast'"
                    variant="subtle"
                    size="xs"
                    class="font-medium text-[10px]"
                  >
                    {{ occupiedSeatsCount(table) }}/{{ table.capacity }}
                  </UBadge>

                  <!-- Delete Table -->
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    class="cursor-pointer hover:bg-rose-50"
                    title="Delete Table"
                    @click.stop="removeTable(table._id)"
                  />
                </div>
              </div>

              <!-- Interactive Banquet Table Body with Centerpiece & Seats -->
              <div class="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                <!-- Round Table Centerpiece (Drop target for auto-seating) -->
                <div
                  class="rounded-xl border-2 border-dashed p-3 text-center transition-all flex items-center justify-between gap-3"
                  :class="dragOverTableIndex === index && draggedGuestId
                    ? 'border-emerald-500 bg-emerald-100/70 ring-2 ring-emerald-300'
                    : 'border-toast-200 bg-toast-50/40'"
                  @dragover.prevent="dragOverTableIndex = index"
                  @dragleave="dragOverTableIndex = null"
                  @drop.stop="onTableGuestDrop($event, table)"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="size-8 rounded-full bg-toast-200/70 border border-toast-300/60 flex items-center justify-center text-toast-800 shrink-0">
                      <UIcon name="i-lucide-utensils" class="size-4" />
                    </div>
                    <div class="text-left min-w-0">
                      <p class="text-xs font-bold text-toast-900 truncate">
                        {{ table.label }} Center
                      </p>
                      <p class="text-[10px] text-muted">
                        {{ table.capacity - occupiedSeatsCount(table) }} seats remaining
                      </p>
                    </div>
                  </div>

                  <span class="text-[10px] text-toast-600 bg-toast-100/80 px-2 py-0.5 rounded-full font-medium shrink-0">
                    Drop to auto-seat
                  </span>
                </div>

                <!-- Seat Slots Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div
                    v-for="seat in seatsOf(table)"
                    :key="`${table._id}-${seat.number}`"
                    class="min-h-[46px]"
                  >
                    <!-- 1. OCCUPIED SEAT (Draggable guest!) -->
                    <div
                      v-if="guestInSeat(table, seat.number)"
                      draggable="true"
                      class="flex items-center justify-between gap-2 p-2 rounded-xl bg-toast-50/80 border border-toast-200/80 shadow-2xs hover:bg-toast-100/80 transition-all cursor-grab active:cursor-grabbing select-none group"
                      :class="draggedGuestId === guestInSeat(table, seat.number)?._id ? 'opacity-40 ring-2 ring-toast-400' : ''"
                      @dragstart="onGuestDragStart($event, guestInSeat(table, seat.number)!)"
                      @dragend="onGuestDragEnd"
                    >
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span class="size-5 rounded-md bg-toast-200/70 text-toast-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                          {{ seat.number }}
                        </span>
                        <div class="min-w-0">
                          <p class="text-xs font-semibold text-toast-900 truncate leading-tight">
                            {{ guestDisplayName(guestInSeat(table, seat.number)!) }}
                          </p>
                          <p v-if="guestInSeat(table, seat.number)?.partyName" class="text-[10px] text-muted truncate">
                            {{ guestInSeat(table, seat.number)?.partyName }}
                          </p>
                        </div>
                      </div>

                      <UButton
                        icon="i-lucide-x"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        class="size-5 p-0 cursor-pointer text-muted hover:text-rose-600 hover:bg-rose-50 shrink-0"
                        title="Unseat guest"
                        @click.stop="unseatGuest(guestInSeat(table, seat.number)!)"
                      />
                    </div>

                    <!-- 2. UNAVAILABLE / BLOCKED SEAT -->
                    <div
                      v-else-if="seat.unavailable"
                      class="flex items-center justify-between gap-2 p-2 rounded-xl bg-neutral-100 text-neutral-400 text-xs border border-neutral-200/70 select-none"
                    >
                      <div class="flex items-center gap-1.5">
                        <span class="size-5 rounded-md bg-neutral-200 text-neutral-500 text-[10px] font-mono font-bold flex items-center justify-center">
                          {{ seat.number }}
                        </span>
                        <span class="text-[11px] italic">Seat Blocked</span>
                      </div>
                      <UButton
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        class="text-[10px] p-1 cursor-pointer"
                        @click="toggleSeat(table, seat)"
                      >
                        Unblock
                      </UButton>
                    </div>

                    <!-- 3. EMPTY SEAT (Interactive Drop Target) -->
                    <div
                      v-else
                      class="flex items-center justify-between gap-2 p-2 rounded-xl border-2 border-dashed transition-all select-none"
                      :class="dragOverSeatKey === `${table._id}-${seat.number}`
                        ? 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-300 scale-[1.02]'
                        : 'border-bread-200/90 hover:border-toast-300 bg-white/70 text-muted'"
                      @dragover.prevent="dragOverSeatKey = `${table._id}-${seat.number}`"
                      @dragleave="dragOverSeatKey = null"
                      @drop.stop="onSeatDrop($event, table, seat.number)"
                    >
                      <div class="flex items-center gap-1.5">
                        <span class="size-5 rounded-md bg-bread-100 text-toast-600 text-[10px] font-mono font-bold flex items-center justify-center">
                          {{ seat.number }}
                        </span>
                        <span class="text-[11px] font-medium text-muted">Empty</span>
                      </div>

                      <div class="flex items-center gap-1">
                        <UButton
                          size="xs"
                          color="neutral"
                          variant="ghost"
                          class="text-[10px] p-0.5 text-muted hover:text-toast-800 cursor-pointer"
                          title="Block this seat"
                          @click="toggleSeat(table, seat)"
                        >
                          Block
                        </UButton>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Smooth drag preview styling */
[draggable="true"] {
  user-select: none;
  -webkit-user-select: none;
}
</style>
