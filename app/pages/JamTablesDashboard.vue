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
const { startPageTransition, finishPageTransition } = usePageTransition()
const seating = useSeating()

const gatheringId = computed(() => String(route.params.gatheringId || route.query.gatheringId || ''))
const gathering = ref<GatheringRecord | null>(null)
const guests = ref<SeatingGuestRecord[]>([])
const loading = ref(true)
const saving = ref(false)

// ---------------------------------------------------------------------------
// Table Groups & Segregation System
// ---------------------------------------------------------------------------
export interface TableGroupMeta {
  id: string
  name: string
  color: 'amber' | 'rose' | 'blue' | 'purple' | 'teal' | 'emerald' | 'stone'
}

const DEFAULT_TABLE_GROUPS: TableGroupMeta[] = []

const LEGACY_DEFAULT_GROUP_IDS = new Set(['presidential', 'brides-side', 'grooms-side', 'friends', 'colleagues', 'general'])

interface GroupThemeTokens {
  badge: string
  dot: string
  border: string
  bg: string
  text: string
  header: string
  lightBg: string
}

const DEFAULT_THEME_FALLBACK: GroupThemeTokens = {
  badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  dot: 'bg-emerald-500',
  border: 'border-emerald-300',
  bg: 'bg-emerald-500',
  text: 'text-emerald-800',
  header: 'bg-emerald-600',
  lightBg: 'bg-emerald-50/70',
}

const GROUP_THEMES: Record<string, GroupThemeTokens> = {
  amber: {
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    dot: 'bg-amber-500',
    border: 'border-amber-300',
    bg: 'bg-amber-500',
    text: 'text-amber-800',
    header: 'bg-amber-600',
    lightBg: 'bg-amber-50/70',
  },
  rose: {
    badge: 'bg-rose-100 text-rose-900 border-rose-300',
    dot: 'bg-rose-500',
    border: 'border-rose-300',
    bg: 'bg-rose-500',
    text: 'text-rose-800',
    header: 'bg-rose-600',
    lightBg: 'bg-rose-50/70',
  },
  blue: {
    badge: 'bg-blue-100 text-blue-900 border-blue-300',
    dot: 'bg-blue-500',
    border: 'border-blue-300',
    bg: 'bg-blue-500',
    text: 'text-blue-800',
    header: 'bg-blue-600',
    lightBg: 'bg-blue-50/70',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-900 border-purple-300',
    dot: 'bg-purple-500',
    border: 'border-purple-300',
    bg: 'bg-purple-500',
    text: 'text-purple-800',
    header: 'bg-purple-600',
    lightBg: 'bg-purple-50/70',
  },
  teal: {
    badge: 'bg-teal-100 text-teal-900 border-teal-300',
    dot: 'bg-teal-500',
    border: 'border-teal-300',
    bg: 'bg-teal-500',
    text: 'text-teal-800',
    header: 'bg-teal-600',
    lightBg: 'bg-teal-50/70',
  },
  emerald: {
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    dot: 'bg-emerald-500',
    border: 'border-emerald-300',
    bg: 'bg-emerald-500',
    text: 'text-emerald-800',
    header: 'bg-emerald-600',
    lightBg: 'bg-emerald-50/70',
  },
  stone: {
    badge: 'bg-stone-100 text-stone-900 border-stone-300',
    dot: 'bg-stone-500',
    border: 'border-stone-300',
    bg: 'bg-stone-500',
    text: 'text-stone-800',
    header: 'bg-stone-600',
    lightBg: 'bg-stone-50/70',
  },
}

function getGroupTheme(color = 'emerald'): GroupThemeTokens {
  return GROUP_THEMES[color] ?? DEFAULT_THEME_FALLBACK
}

function getBadgeColor(color?: string): 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'primary' {
  switch (color) {
    case 'amber':
      return 'warning'
    case 'rose':
      return 'error'
    case 'blue':
      return 'info'
    case 'emerald':
    case 'teal':
      return 'success'
    default:
      return 'neutral'
  }
}

const TABLE_GROUPS_STORAGE_PREFIX = 'jam_table_groups_'
const TABLE_ASSIGNMENTS_STORAGE_PREFIX = 'jam_table_assignments_'

const tableGroups = ref<TableGroupMeta[]>([...DEFAULT_TABLE_GROUPS])
const tableGroupAssignments = ref<Record<string, string>>({})
const selectedGroupFilter = ref<string>('all')
const isGroupedView = ref(true)

function loadTableGroups() {
  if (typeof window === 'undefined' || !gatheringId.value) return
  try {
    const savedGroups = localStorage.getItem(`${TABLE_GROUPS_STORAGE_PREFIX}${gatheringId.value}`)
    if (savedGroups) {
      const parsed: TableGroupMeta[] = JSON.parse(savedGroups)
      tableGroups.value = parsed.filter((g) => !LEGACY_DEFAULT_GROUP_IDS.has(g.id))
    } else {
      tableGroups.value = []
    }
    const savedAssignments = localStorage.getItem(`${TABLE_ASSIGNMENTS_STORAGE_PREFIX}${gatheringId.value}`)
    if (savedAssignments) {
      const parsedAssignments = JSON.parse(savedAssignments)
      for (const k in parsedAssignments) {
        if (LEGACY_DEFAULT_GROUP_IDS.has(parsedAssignments[k])) {
          delete parsedAssignments[k]
        }
      }
      tableGroupAssignments.value = parsedAssignments
    }
  } catch (e) {
    console.error('Could not load table groups from storage', e)
  }
}

function persistTableGroups() {
  if (typeof window === 'undefined' || !gatheringId.value) return
  try {
    localStorage.setItem(`${TABLE_GROUPS_STORAGE_PREFIX}${gatheringId.value}`, JSON.stringify(tableGroups.value))
    localStorage.setItem(`${TABLE_ASSIGNMENTS_STORAGE_PREFIX}${gatheringId.value}`, JSON.stringify(tableGroupAssignments.value))
  } catch (e) {
    console.error('Could not persist table groups to storage', e)
  }
}

function getTableGroupId(tableId: string): string | null {
  return tableGroupAssignments.value[tableId] || null
}

function getTableGroup(groupIdOrTableId: string): TableGroupMeta | null {
  const gId = tableGroupAssignments.value[groupIdOrTableId] || groupIdOrTableId
  return tableGroups.value.find((g) => g.id === gId) || null
}

function assignTableToGroup(tableId: string, groupId: string | null) {
  if (!groupId) {
    delete tableGroupAssignments.value[tableId]
  } else {
    tableGroupAssignments.value[tableId] = groupId
  }
  persistTableGroups()
  toast.add({ title: 'Table group updated', color: 'success' })
}

function getTablesInGroup(groupId: string): SeatingTable[] {
  return (filteredTables.value || []).filter((t) => tableGroupAssignments.value[t._id] === groupId)
}

function getGroupCapacity(groupId: string): number {
  const tables = (gathering.value?.tables || []).filter((t) => tableGroupAssignments.value[t._id] === groupId)
  return tables.reduce((acc, t) => acc + (t.capacity || 0), 0)
}

function getGroupSeatedCount(groupId: string): number {
  const tables = (gathering.value?.tables || []).filter((t) => tableGroupAssignments.value[t._id] === groupId)
  const tableIds = new Set(tables.map((t) => t._id))
  return guests.value.filter((g) => g.tableId && tableIds.has(g.tableId) && g.seatNumber !== null).length
}

const activeTableGroups = computed(() => {
  if (selectedGroupFilter.value !== 'all') {
    return tableGroups.value.filter((g) => g.id === selectedGroupFilter.value)
  }
  return tableGroups.value
})

const renderedSections = computed(() => {
  if (!isGroupedView.value || tableGroups.value.length === 0) {
    return [{
      id: '__flat__',
      group: null,
      tables: filteredTables.value,
    }]
  }

  const sections: { id: string; group: TableGroupMeta | null; tables: SeatingTable[] }[] = activeTableGroups.value
    .map((grp) => ({
      id: grp.id,
      group: grp,
      tables: getTablesInGroup(grp.id),
    }))
    .filter((sec) => sec.tables.length > 0 || (selectedGroupFilter.value !== 'all' && selectedGroupFilter.value === sec.id))

  // If "all" filter is selected, check for any tables not yet assigned to any group
  if (selectedGroupFilter.value === 'all') {
    const assignedIds = new Set(Object.keys(tableGroupAssignments.value).filter((id) => {
      const gId = tableGroupAssignments.value[id]
      return tableGroups.value.some((g) => g.id === gId)
    }))
    const ungrouped = filteredTables.value.filter((t) => !assignedIds.has(t._id))
    if (ungrouped.length > 0) {
      sections.push({
        id: '__ungrouped__',
        group: { id: '__ungrouped__', name: 'Ungrouped Tables', color: 'stone' },
        tables: ungrouped,
      })
    }
  }

  return sections
})

// Create / Edit Group Modal State
const isGroupModalOpen = ref(false)
const editingGroupId = ref<string | null>(null)
const groupFormName = ref('')
const groupFormColor = ref<TableGroupMeta['color']>('blue')
const groupFormSelectedTableIds = ref<string[]>([])

function openCreateGroupModal() {
  editingGroupId.value = null
  groupFormName.value = ''
  groupFormColor.value = 'blue'
  groupFormSelectedTableIds.value = []
  isGroupModalOpen.value = true
}

function openEditGroupModal(group: TableGroupMeta) {
  editingGroupId.value = group.id
  groupFormName.value = group.name
  groupFormColor.value = group.color
  groupFormSelectedTableIds.value = (gathering.value?.tables || [])
    .filter((t) => tableGroupAssignments.value[t._id] === group.id)
    .map((t) => t._id)
  isGroupModalOpen.value = true
}

function toggleTableInGroupForm(tableId: string) {
  const idx = groupFormSelectedTableIds.value.indexOf(tableId)
  if (idx >= 0) {
    groupFormSelectedTableIds.value.splice(idx, 1)
  } else {
    groupFormSelectedTableIds.value.push(tableId)
  }
}

function saveGroup() {
  const name = groupFormName.value.trim()
  if (!name) return

  let targetId = editingGroupId.value
  if (!targetId) {
    targetId = `grp_${Date.now()}`
    tableGroups.value.push({
      id: targetId,
      name,
      color: groupFormColor.value,
    })
  } else {
    const existing = tableGroups.value.find((g) => g.id === targetId)
    if (existing) {
      existing.name = name
      existing.color = groupFormColor.value
    }
  }

  // Clear existing assignments for this group
  for (const tId in tableGroupAssignments.value) {
    if (tableGroupAssignments.value[tId] === targetId) {
      delete tableGroupAssignments.value[tId]
    }
  }
  // Assign newly selected tables
  for (const tId of groupFormSelectedTableIds.value) {
    tableGroupAssignments.value[tId] = targetId
  }

  persistTableGroups()
  isGroupModalOpen.value = false
  toast.add({
    title: editingGroupId.value ? 'Table group updated' : 'Table group created',
    description: `"${name}" with ${groupFormSelectedTableIds.value.length} tables.`,
    color: 'success',
  })
}

function deleteGroup(groupId: string) {
  const grp = tableGroups.value.find((g) => g.id === groupId)
  if (!grp) return
  if (!window.confirm(`Delete table group "${grp.name}"? The tables and guests will not be deleted, only ungrouped.`)) {
    return
  }

  tableGroups.value = tableGroups.value.filter((g) => g.id !== groupId)
  for (const tId in tableGroupAssignments.value) {
    if (tableGroupAssignments.value[tId] === groupId) {
      delete tableGroupAssignments.value[tId]
    }
  }
  if (selectedGroupFilter.value === groupId) {
    selectedGroupFilter.value = 'all'
  }
  persistTableGroups()
  toast.add({ title: 'Table group deleted', description: `Ungrouped "${grp.name}".`, color: 'neutral' })
}

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
  const groupFilter = selectedGroupFilter.value

  return tables.filter((table) => {
    if (groupFilter !== 'all' && getTableGroupId(table._id) !== groupFilter) {
      return false
    }
    if (!q) return true
    if (table.label.toLowerCase().includes(q)) return true
    const grp = getTableGroup(table._id)
    if (grp.name.toLowerCase().includes(q)) return true
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

    loadTableGroups()

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

// Dropping a guest anywhere on a table auto-assigns them
function onSeatDrop(event: DragEvent, table: SeatingTable) {
  event.stopPropagation()
  dragOverTableId.value = null
  dragOverSeatKey.value = null
  return onTableGuestDrop(table)
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

function addNewTable(targetGroupId?: string) {
  if (!gathering.value) return
  const capacity = Math.max(1, Math.min(newTableSeats.value || 8, 30))
  const layout = [...gathering.value.tables.map(layoutRow), { label: '', capacity }]
  isAddTablePopoverOpen.value = false
  const assignedGroup = targetGroupId || (selectedGroupFilter.value !== 'all' ? selectedGroupFilter.value : null)

  return queueSave('Could not add table', async () => {
    saving.value = true
    try {
      gathering.value = await seating.replaceTables(gatheringId.value, layout)
      const newTable = gathering.value.tables[gathering.value.tables.length - 1]
      if (newTable && assignedGroup) {
        tableGroupAssignments.value[newTable._id] = assignedGroup
        persistTableGroups()
      }
      toast.add({ title: 'Table added', description: `New table with ${capacity} seats.`, color: 'success' })
    } finally {
      saving.value = false
    }
  })
}

// ---------------------------------------------------------------------------
// Auto-Sort & Allotment by Table Groups
// ---------------------------------------------------------------------------
const isAutoSortModalOpen = ref(false)
const autoSortTargetGroupId = ref<string | null>(null)
const groupAllotments = ref<Record<string, string[]>>({})

const unseatedPartiesList = computed(() => {
  const map = new Map<string, SeatingGuestRecord[]>()
  for (const g of unseatedGuests.value) {
    const party = g.partyName?.trim() || 'Individual Guests'
    if (!map.has(party)) {
      map.set(party, [])
    }
    map.get(party)!.push(g)
  }
  return Array.from(map.entries()).map(([partyName, partyGuests]) => ({
    partyName,
    count: partyGuests.length,
    guests: partyGuests,
  }))
})

const unallottedParties = computed(() => {
  const allottedSet = new Set<string>()
  for (const grpId in groupAllotments.value) {
    for (const p of groupAllotments.value[grpId] || []) {
      allottedSet.add(p)
    }
  }
  return unseatedPartiesList.value.filter((p) => !allottedSet.has(p.partyName))
})

function openAutoSortModal(targetGroupId: string | null = null) {
  if (!tableGroups.value.length) {
    toast.add({
      title: 'No table groups yet',
      description: 'Create a table group first to allot and auto-sort guests.',
      color: 'warning',
    })
    openCreateGroupModal()
    return
  }
  autoSortTargetGroupId.value = targetGroupId
  autoDetectAllotments()
  isAutoSortModalOpen.value = true
}

function autoDetectAllotments() {
  const allotments: Record<string, string[]> = {}
  for (const g of tableGroups.value) {
    allotments[g.id] = []
  }

  for (const p of unseatedPartiesList.value) {
    const nameLower = p.partyName.toLowerCase()
    let assigned = false

    for (const g of tableGroups.value) {
      const gNameLower = g.name.toLowerCase()
      const words = gNameLower.split(/[\s/&,]+/).filter((w) => w.length > 2)
      if (words.some((w) => nameLower.includes(w)) || nameLower.includes(gNameLower)) {
        allotments[g.id].push(p.partyName)
        assigned = true
        break
      }
    }

    if (!assigned && tableGroups.value.length === 1 && tableGroups.value[0]) {
      allotments[tableGroups.value[0].id]?.push(p.partyName)
    }
  }

  groupAllotments.value = allotments
}

function clearAllotments() {
  const allotments: Record<string, string[]> = {}
  for (const g of tableGroups.value) {
    allotments[g.id] = []
  }
  groupAllotments.value = allotments
}

function togglePartyInGroup(groupId: string, partyName: string) {
  if (!groupAllotments.value[groupId]) {
    groupAllotments.value[groupId] = []
  }
  const idx = groupAllotments.value[groupId].indexOf(partyName)
  if (idx >= 0) {
    groupAllotments.value[groupId].splice(idx, 1)
  } else {
    for (const otherId in groupAllotments.value) {
      const otherIdx = groupAllotments.value[otherId]?.indexOf(partyName) ?? -1
      if (otherIdx >= 0) {
        groupAllotments.value[otherId]!.splice(otherIdx, 1)
      }
    }
    groupAllotments.value[groupId].push(partyName)
  }
}

function getAllottedGuestsCount(groupId: string): number {
  const parties = groupAllotments.value[groupId] || []
  let count = 0
  for (const pName of parties) {
    const pObj = unseatedPartiesList.value.find((p) => p.partyName === pName)
    if (pObj) count += pObj.count
  }
  return count
}

function getGroupOpenSeatsCount(groupId: string): number {
  const tables = (gathering.value?.tables || []).filter((t) => getTableGroupId(t._id) === groupId)
  let open = 0
  for (const t of tables) {
    for (const s of seatsOf(t)) {
      if (!s.unavailable && !guestInSeat(t, s.number)) {
        open++
      }
    }
  }
  return open
}

async function executeGroupAutoSort() {
  if (!gathering.value) return
  saving.value = true

  try {
    const groupsToProcess = autoSortTargetGroupId.value
      ? tableGroups.value.filter((g) => g.id === autoSortTargetGroupId.value)
      : tableGroups.value

    const assignments: { guest: SeatingGuestRecord; target: { tableId: string; seatNumber: number } }[] = []

    for (const group of groupsToProcess) {
      const groupTables = (gathering.value.tables || []).filter(
        (t) => getTableGroupId(t._id) === group.id
      )
      if (!groupTables.length) continue

      const openSeats: { tableId: string; seatNumber: number }[] = []
      for (const t of groupTables) {
        for (const s of seatsOf(t)) {
          if (!s.unavailable && !guestInSeat(t, s.number)) {
            if (!assignments.some((a) => a.target.tableId === t._id && a.target.seatNumber === s.number)) {
              openSeats.push({ tableId: t._id, seatNumber: s.number })
            }
          }
        }
      }

      if (!openSeats.length) continue

      const allottedParties = groupAllotments.value[group.id] || []
      const matchedGuests: SeatingGuestRecord[] = []
      for (const partyName of allottedParties) {
        const partyObj = unseatedPartiesList.value.find((p) => p.partyName === partyName)
        if (partyObj) {
          for (const g of partyObj.guests) {
            if (!assignments.some((a) => a.guest._id === g._id)) {
              matchedGuests.push(g)
            }
          }
        }
      }

      let seatIdx = 0
      for (const guest of matchedGuests) {
        if (seatIdx >= openSeats.length) break
        const seat = openSeats[seatIdx++]
        if (!seat) break
        assignments.push({ guest, target: seat })
      }
    }

    if (!assignments.length) {
      toast.add({
        title: 'No guests seated',
        description: 'No open seats or matching unseated guests found for the selected groups.',
        color: 'warning',
      })
      isAutoSortModalOpen.value = false
      return
    }

    // Apply locally
    for (const item of assignments) {
      item.guest.tableId = item.target.tableId
      item.guest.seatNumber = item.target.seatNumber
    }

    // Persist
    for (const item of assignments) {
      await seating.moveSeat(gatheringId.value, item.guest._id, item.target)
    }

    toast.add({
      title: 'Auto-sort completed',
      description: `Successfully seated ${assignments.length} guests across table groups.`,
      color: 'success',
    })

    isAutoSortModalOpen.value = false
    await load(true)
  } catch (error) {
    toast.add({ title: 'Could not auto-sort', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
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
      <!-- Desktop Navbar Actions (Right Side) -->
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
            @click="openAutoSortModal()"
          >
            Auto-Sort by Groups
          </UButton>
        </div>
      </Teleport>

      <!-- Mobile Navbar Actions (Right Toggle Button Menu) -->
      <Teleport to="#navbar-mobile-actions">
        <div class="space-y-2 w-full">
          <UButton
            color="toast"
            variant="solid"
            size="md"
            block
            icon="i-lucide-sparkles"
            :loading="saving"
            class="w-full justify-center bg-toast-800 hover:bg-toast-900 text-white font-bold cursor-pointer shadow-xs"
            @click="openAutoSortModal()"
          >
            Auto-Sort by Table Groups
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            block
            icon="i-lucide-arrow-down-wide-narrow"
            :loading="saving"
            class="w-full justify-center cursor-pointer font-semibold"
            @click="runAutoAssign"
          >
            Basic Auto-Seat (All Tables)
          </UButton>
          <UButton
            :icon="gathering?.seatSelectionLocked ? 'i-lucide-lock' : 'i-lucide-unlock'"
            color="neutral"
            variant="outline"
            size="sm"
            block
            class="w-full justify-center cursor-pointer font-semibold"
            @click="toggleSeatSelectionLock"
          >
            Guest Seat Picking: {{ gathering?.seatSelectionLocked ? 'Locked' : 'Unlocked' }}
          </UButton>
          <UButton
            icon="i-lucide-plus"
            color="emerald"
            variant="soft"
            size="sm"
            block
            class="w-full justify-center cursor-pointer font-semibold"
            @click="addNewTable()"
          >
            Add Table ({{ newTableSeats }} seats)
          </UButton>
          <div class="p-2.5 bg-toast-50 border border-bread-200/60 rounded-xl flex items-center justify-between text-xs">
            <span class="text-muted">Unseated Attending:</span>
            <UBadge color="neutral" variant="subtle" size="xs" class="font-bold">
              {{ unseatedGuests.length }} guests
            </UBadge>
          </div>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- Main Workspace Container: 2-Division Split Layout -->
    <div
      class="grid grid-cols-1 lg:grid-cols-4 lg:overflow-hidden min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] w-full bg-toast-50/20"
    >
      <!-- ================= LEFT DIVISION (col-span-1): Overview & Unassigned Pool (Hidden on Mobile) ================= -->
      <aside
        class="hidden lg:flex lg:col-span-1 border-r border-bread-200/80 bg-white/80 backdrop-blur p-4 sm:p-5 flex-col justify-between overflow-y-auto lg:h-[calc(100vh-64px)] space-y-4"
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

          <!-- Table Groups Allotment Card -->
          <div class="bg-toast-50/70 border border-bread-200/70 rounded-xl p-3 space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-xs text-toast-900 font-sans">Table Groups</span>
                <UBadge color="neutral" variant="subtle" size="xs">
                  {{ tableGroups.length }}
                </UBadge>
              </div>
              <button
                type="button"
                class="text-[11px] font-semibold text-toast-700 hover:text-toast-900 flex items-center gap-1 cursor-pointer"
                @click="openCreateGroupModal"
              >
                <UIcon name="i-lucide-plus" class="size-3" />
                <span>New</span>
              </button>
            </div>

            <!-- Empty state when no groups exist -->
            <div
              v-if="tableGroups.length === 0"
              class="p-3 text-center text-xs text-muted border border-dashed border-bread-200/80 rounded-xl bg-white/60 space-y-1.5"
            >
              <p>No table groups created yet.</p>
              <button
                type="button"
                class="text-xs text-toast-800 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                @click="openCreateGroupModal"
              >
                <UIcon name="i-lucide-plus" class="size-3" />
                <span>Create Table Group</span>
              </button>
            </div>

            <!-- List of groups -->
            <div v-else class="space-y-1 max-h-48 overflow-y-auto pr-0.5">
              <div
                v-for="grp in tableGroups"
                :key="grp.id"
                class="w-full flex items-center justify-between p-2 rounded-lg text-left transition-all text-xs border group/item"
                :class="selectedGroupFilter === grp.id
                  ? 'bg-toast-200/80 border-toast-400 font-bold text-toast-950 shadow-2xs'
                  : 'bg-white/80 hover:bg-toast-100/70 border-bread-200/60 text-toast-800'"
              >
                <button
                  type="button"
                  class="flex items-center gap-2 min-w-0 flex-1 cursor-pointer text-left"
                  @click="selectedGroupFilter = selectedGroupFilter === grp.id ? 'all' : grp.id"
                >
                  <span
                    class="size-2.5 rounded-full shrink-0"
                    :class="getGroupTheme(grp.color).dot"
                  />
                  <span class="truncate font-medium">{{ grp.name }}</span>
                </button>
                <div class="flex items-center gap-1.5 shrink-0 text-[11px] text-muted">
                  <span class="font-mono font-medium">{{ getGroupSeatedCount(grp.id) }}/{{ getGroupCapacity(grp.id) }}</span>
                  <span class="text-[10px] text-toast-500">({{ getTablesInGroup(grp.id).length }}t)</span>
                  <button
                    type="button"
                    class="p-0.5 rounded text-muted hover:text-toast-900 opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                    title="Manage group tables"
                    @click.stop="openEditGroupModal(grp)"
                  >
                    <UIcon name="i-lucide-settings-2" class="size-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Auto-sort shortcut -->
            <UButton
              icon="i-lucide-sparkles"
              color="toast"
              variant="soft"
              size="xs"
              block
              class="w-full justify-center font-semibold cursor-pointer text-xs"
              @click="openAutoSortModal()"
            >
              Auto-Sort by Groups
            </UButton>
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
          class="bg-white/95 backdrop-blur border-b border-bread-200/80 px-4 sm:px-6 py-2.5 space-y-2.5 shrink-0 z-10 w-full"
        >
          <!-- Top Row: Search, View Mode Toggle, Auto-Sort Button, Add Table -->
          <div class="flex flex-wrap items-center justify-between gap-2.5">
            <!-- Left: Search and Filter tables -->
            <div class="flex items-center gap-2 flex-1 min-w-50 sm:min-w-65 max-w-md">
              <UInput
                v-model="tableSearchQuery"
                icon="i-lucide-search"
                type="search"
                placeholder="Filter tables, groups, or seated guests..."
                size="sm"
                class="w-full"
              />
              <span class="text-xs text-muted hidden xl:inline-block shrink-0">
                {{ filteredTables.length }} of {{ gathering?.tables?.length || 0 }} tables
              </span>
            </div>

            <!-- Right: Actions & Tools -->
            <div class="flex items-center gap-2 shrink-0 ml-auto">
              <!-- View Mode Toggle (Grouped vs Flat Grid) -->
              <div class="inline-flex items-center bg-toast-100/70 border border-bread-200/70 rounded-xl p-0.5 text-xs">
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  :class="isGroupedView ? 'bg-white text-toast-900 shadow-2xs font-semibold' : 'text-toast-600 hover:text-toast-900'"
                  @click="isGroupedView = true"
                >
                  <UIcon name="i-lucide-layers" class="size-3.5" />
                  <span class="hidden sm:inline">Grouped</span>
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  :class="!isGroupedView ? 'bg-white text-toast-900 shadow-2xs font-semibold' : 'text-toast-600 hover:text-toast-900'"
                  @click="isGroupedView = false"
                >
                  <UIcon name="i-lucide-layout-grid" class="size-3.5" />
                  <span class="hidden sm:inline">Flat Grid</span>
                </button>
              </div>

              <!-- Auto-Sort by Groups Button -->
              <UButton
                icon="i-lucide-sparkles"
                color="toast"
                variant="solid"
                size="sm"
                class="bg-toast-800 hover:bg-toast-900 text-white font-semibold cursor-pointer shadow-xs"
                :loading="saving"
                @click="openAutoSortModal()"
              >
                <span class="hidden md:inline">Auto-Sort by Groups</span>
                <span class="md:hidden">Auto-Sort</span>
              </UButton>

              <!-- On-the-fly Table Adder -->
              <div class="flex items-center gap-1 bg-toast-100/70 border border-bread-200/70 rounded-xl px-2 py-1 text-xs">
                <span class="text-muted text-[11px] font-medium hidden sm:inline">Seats:</span>
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
                @click="addNewTable()"
              >
                Add Table
              </UButton>
            </div>
          </div>

          <!-- Bottom Row: Table Group Filter Pills Bar -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar text-xs">
            <span class="text-muted text-[11px] font-medium shrink-0 mr-1">Groups:</span>
            <button
              v-if="tableGroups.length > 0"
              type="button"
              class="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer border"
              :class="selectedGroupFilter === 'all'
                ? 'bg-toast-800 text-white border-toast-800 shadow-2xs'
                : 'bg-white text-toast-700 hover:bg-toast-100/70 border-bread-200/80'"
              @click="selectedGroupFilter = 'all'"
            >
              All Tables ({{ gathering?.tables?.length || 0 }})
            </button>

            <button
              v-for="grp in tableGroups"
              :key="grp.id"
              type="button"
              class="px-2.5 py-1 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border"
              :class="selectedGroupFilter === grp.id
                ? 'bg-toast-800 text-white border-toast-800 shadow-2xs font-semibold'
                : 'bg-white text-toast-700 hover:bg-toast-100/70 border-bread-200/80'"
              @click="selectedGroupFilter = selectedGroupFilter === grp.id ? 'all' : grp.id"
            >
              <span
                class="size-2 rounded-full shrink-0"
                :class="selectedGroupFilter === grp.id ? 'bg-white' : getGroupTheme(grp.color).dot"
              />
              <span>{{ grp.name }}</span>
              <span
                class="text-[10px] px-1 py-0.2 rounded-full font-mono"
                :class="selectedGroupFilter === grp.id ? 'bg-white/20 text-white' : 'bg-toast-100 text-toast-700'"
              >
                {{ getTablesInGroup(grp.id).length }}
              </span>
            </button>

            <button
              type="button"
              class="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1 text-toast-700 hover:text-toast-900 hover:bg-toast-100/70 border border-dashed border-bread-300 transition-all cursor-pointer"
              @click="openCreateGroupModal"
            >
              <UIcon name="i-lucide-plus" class="size-3" />
              <span>{{ tableGroups.length === 0 ? 'Create Table Group' : 'New Group' }}</span>
            </button>
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
              @click="addNewTable()"
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

          <!-- Rendered Sections (Grouped or Flat) -->
          <div v-else class="space-y-8">
            <section
              v-for="section in renderedSections"
              :key="section.id"
              class="space-y-4"
            >
              <!-- Group Header Banner (Only shown in Grouped View) -->
              <div
                v-if="isGroupedView && section.group"
                class="flex flex-wrap items-center justify-between gap-3 pb-2.5 bg-toast-50/60 p-3 rounded-xl border border-bread-200/80"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <span
                    class="size-3.5 rounded-full shrink-0 shadow-2xs"
                    :class="getGroupTheme(section.group.color).dot"
                  />
                  <h3 class="font-serif font-bold text-base sm:text-lg text-toast-900 truncate">
                    {{ section.group.name }}
                  </h3>
                  <UBadge
                    :color="getBadgeColor(section.group.color)"
                    variant="subtle"
                    size="xs"
                    class="font-semibold"
                  >
                    {{ section.tables.length }} {{ section.tables.length === 1 ? 'table' : 'tables' }}
                  </UBadge>
                  <span class="text-xs text-muted font-medium hidden sm:inline">
                    {{ getGroupSeatedCount(section.group.id) }} / {{ getGroupCapacity(section.group.id) }} seats filled
                  </span>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <UButton
                    v-if="section.group.id !== '__ungrouped__'"
                    icon="i-lucide-settings-2"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    class="font-medium cursor-pointer"
                    title="Manage tables in this group"
                    @click="openEditGroupModal(section.group)"
                  >
                    Manage Tables
                  </UButton>
                  <UButton
                    v-if="section.group.id !== '__ungrouped__'"
                    icon="i-lucide-sparkles"
                    color="toast"
                    variant="soft"
                    size="xs"
                    class="font-semibold cursor-pointer"
                    @click="openAutoSortModal(section.group.id)"
                  >
                    Auto-Seat Group
                  </UButton>
                  <UButton
                    v-if="section.group.id !== '__ungrouped__'"
                    icon="i-lucide-plus"
                    color="neutral"
                    variant="outline"
                    size="xs"
                    class="font-semibold cursor-pointer"
                    @click="addNewTable(section.group.id)"
                  >
                    Add Table
                  </UButton>
                </div>
              </div>

              <!-- Empty Section Message when group has no tables -->
              <div
                v-if="section.tables.length === 0"
                class="p-6 text-center text-xs text-muted border border-dashed border-bread-200 rounded-2xl bg-white/60 space-y-2"
              >
                <p>No tables assigned to <strong>{{ section.group?.name }}</strong> yet.</p>
                <div class="flex items-center justify-center gap-2">
                  <UButton
                    icon="i-lucide-settings-2"
                    color="neutral"
                    variant="soft"
                    size="xs"
                    class="cursor-pointer"
                    @click="section.group && openEditGroupModal(section.group)"
                  >
                    Assign Existing Tables
                  </UButton>
                  <UButton
                    icon="i-lucide-plus"
                    color="neutral"
                    variant="soft"
                    size="xs"
                    class="cursor-pointer"
                    @click="addNewTable(section.group?.id)"
                  >
                    Add New Table
                  </UButton>
                </div>
              </div>

              <!-- Interactive Tables Grid for this section -->
              <div
                v-else
                class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start"
              >
                <div
                  v-for="table in section.tables"
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
                    class="px-3.5 py-2.5 bg-toast-500 text-white flex flex-wrap items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-colors rounded-t-2xl"
                    title="Drag this table onto another table to swap their positions. Guests stay with their table."
                    @dragstart="onTableDragStart($event, table)"
                    @dragend="onTableDragEnd"
                  >
                    <!-- Drag Grip & Table Label -->
                    <div class="flex items-center gap-2 min-w-0 flex-1 basis-32">
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
                      {{ nextOpenSeat(table) ? 'Drop anywhere to auto-assign to this table' : 'Table is full' }}
                    </p>
                    <!-- Seat Slots Grid. Seats keep their real numbers, because guests choose their own. -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 content-start items-start">
                      <div
                        v-for="seat in seatsOf(table)"
                        :key="seatKey(table, seat.number)"
                        class="min-h-11.5 rounded-xl transition-all"
                        data-testid="host-seat"
                        @drop="onSeatDrop($event, table)"
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
            </section>
          </div>
        </div>
      </main>
    </div>

    <!-- Create / Edit Table Group Modal -->
    <UModal v-model:open="isGroupModalOpen" :title="editingGroupId ? 'Edit Table Group' : 'Create Table Group'">
      <template #content>
        <div class="p-4 sm:p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          <div>
            <label class="block text-xs font-semibold text-toast-900 mb-1.5">
              Group Name
            </label>
            <UInput
              v-model="groupFormName"
              placeholder="e.g. VIP / Presidential, Bride's Family, Entourage"
              size="md"
              class="w-full"
              autofocus
              @keydown.enter.prevent="saveGroup"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-toast-900 mb-1.5">
              Theme Color
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(theme, colorKey) in GROUP_THEMES"
                :key="colorKey"
                type="button"
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all"
                :class="groupFormColor === colorKey
                  ? 'border-toast-600 bg-toast-100/80 font-bold ring-2 ring-toast-400'
                  : 'border-bread-200 bg-white hover:bg-toast-50'"
                @click="groupFormColor = colorKey as TableGroupMeta['color']"
              >
                <span class="size-2.5 rounded-full" :class="theme.dot" />
                <span class="capitalize">{{ colorKey }}</span>
              </button>
            </div>
          </div>

          <!-- Select Tables to Include in this Group -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-semibold text-toast-900">
                Include Tables in this Group
              </label>
              <span class="text-[11px] text-muted">
                {{ groupFormSelectedTableIds.length }} selected
              </span>
            </div>

            <div v-if="!gathering?.tables?.length" class="text-xs text-muted italic p-3 bg-toast-50/50 rounded-xl border border-bread-200/60">
              No tables created yet. Add tables after creating this group.
            </div>

            <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
              <button
                v-for="t in gathering.tables"
                :key="t._id"
                type="button"
                class="flex items-center justify-between p-2 rounded-xl border text-xs transition-all text-left cursor-pointer"
                :class="groupFormSelectedTableIds.includes(t._id)
                  ? 'bg-toast-100/90 border-toast-500 font-bold text-toast-950 shadow-2xs'
                  : 'bg-white border-bread-200/80 hover:bg-toast-50 text-toast-800'"
                @click="toggleTableInGroupForm(t._id)"
              >
                <div class="min-w-0 pr-1">
                  <p class="truncate font-medium">{{ t.label }}</p>
                  <p class="text-[10px] text-muted">{{ t.capacity }} seats</p>
                </div>
                <UIcon
                  :name="groupFormSelectedTableIds.includes(t._id) ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
                  class="size-4 shrink-0"
                  :class="groupFormSelectedTableIds.includes(t._id) ? 'text-toast-800' : 'text-bread-300'"
                />
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-bread-200/60">
            <UButton
              v-if="editingGroupId"
              color="error"
              variant="ghost"
              size="sm"
              class="cursor-pointer"
              @click="deleteGroup(editingGroupId)"
            >
              Delete Group
            </UButton>
            <div class="flex items-center gap-2 ml-auto">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                class="cursor-pointer"
                @click="isGroupModalOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                color="toast"
                variant="solid"
                size="sm"
                class="bg-toast-800 hover:bg-toast-900 text-white font-bold cursor-pointer"
                :disabled="!groupFormName.trim()"
                @click="saveGroup"
              >
                {{ editingGroupId ? 'Save Changes' : 'Create Group' }}
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Auto-Sort by Table Groups Modal -->
    <UModal
      v-model:open="isAutoSortModalOpen"
      title="Auto-Sort Guests by Table Groups"
      :ui="{ content: 'sm:max-w-3xl' }"
    >
      <template #content>
        <div class="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <!-- Description & Context -->
          <div class="bg-toast-50/80 border border-bread-200/80 rounded-xl p-3.5 space-y-1.5 text-xs text-toast-800">
            <div class="flex items-center justify-between">
              <span class="font-bold text-sm text-toast-900">Guest Segregation & Table Allotment</span>
              <UBadge color="neutral" variant="subtle" size="xs">
                {{ unseatedGuests.length }} unseated guests
              </UBadge>
            </div>
            <p class="text-muted leading-relaxed">
              Assign unseated parties to table groups below. When you execute auto-sort, guests are cleanly seated only into their allotted group's tables, keeping party members seated together and segregated from other groups.
            </p>
          </div>

          <!-- Target Filter & Quick Actions -->
          <div class="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-bread-200/60">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-toast-900">Target:</span>
              <select
                v-model="autoSortTargetGroupId"
                class="text-xs font-medium bg-white border border-bread-300 rounded-lg px-2.5 py-1 text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500 cursor-pointer"
              >
                <option :value="null">All Table Groups</option>
                <option v-for="grp in tableGroups" :key="grp.id" :value="grp.id">
                  {{ grp.name }}
                </option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <UButton
                icon="i-lucide-sparkles"
                color="toast"
                variant="soft"
                size="xs"
                class="font-semibold cursor-pointer"
                @click="autoDetectAllotments"
              >
                Auto-Detect Parties
              </UButton>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                class="cursor-pointer"
                @click="clearAllotments"
              >
                Clear All
              </UButton>
            </div>
          </div>

          <!-- Unseated Parties Not Yet Allotted Warning / Section -->
          <div v-if="unallottedParties.length > 0" class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-amber-800 flex items-center gap-1.5">
                <UIcon name="i-lucide-info" class="size-3.5 text-amber-600" />
                Unassigned Parties ({{ unallottedParties.length }}):
              </span>
              <span class="text-[11px] text-muted">Click a party to assign to {{ autoSortTargetGroupId ? (getTableGroup(autoSortTargetGroupId)?.name || 'selected group') : (tableGroups[0]?.name || 'group') }}</span>
            </div>
            <div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-amber-50/50 border border-amber-200/60 rounded-xl">
              <button
                v-for="p in unallottedParties"
                :key="p.partyName"
                type="button"
                class="px-2.5 py-1 bg-white hover:bg-amber-100/70 border border-amber-200 text-amber-900 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5"
                @click="togglePartyInGroup(autoSortTargetGroupId || (tableGroups[0]?.id || ''), p.partyName)"
              >
                <span>{{ p.partyName }}</span>
                <span class="bg-amber-100 text-amber-800 text-[10px] px-1 rounded-full font-mono">{{ p.count }}</span>
                <UIcon name="i-lucide-plus" class="size-3 text-amber-600" />
              </button>
            </div>
          </div>

          <!-- Group Cards Allotment Matrix -->
          <div class="space-y-3">
            <div
              v-for="grp in (autoSortTargetGroupId ? tableGroups.filter(g => g.id === autoSortTargetGroupId) : tableGroups)"
              :key="grp.id"
              class="border border-bread-200/90 bg-white rounded-xl p-3.5 space-y-2.5 shadow-2xs"
            >
              <!-- Group Header -->
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="size-3 rounded-full shrink-0" :class="getGroupTheme(grp.color).dot" />
                  <span class="font-bold text-xs sm:text-sm text-toast-900">{{ grp.name }}</span>
                  <UBadge
                    :color="getBadgeColor(grp.color)"
                    variant="subtle"
                    size="xs"
                    class="font-semibold text-[10px]"
                  >
                    {{ getTablesInGroup(grp.id).length }} {{ getTablesInGroup(grp.id).length === 1 ? 'table' : 'tables' }}
                  </UBadge>
                </div>

                <div class="flex items-center gap-2 text-xs">
                  <span class="font-medium text-muted">
                    Open Seats: <strong class="text-toast-900">{{ getGroupOpenSeatsCount(grp.id) }}</strong>
                  </span>
                  <span class="text-bread-300">·</span>
                  <span class="font-medium">
                    Allotted:
                    <strong
                      :class="getAllottedGuestsCount(grp.id) > getGroupOpenSeatsCount(grp.id) ? 'text-rose-600' : 'text-emerald-700'"
                    >
                      {{ getAllottedGuestsCount(grp.id) }}
                    </strong>
                  </span>
                  <UBadge
                    v-if="getAllottedGuestsCount(grp.id) > getGroupOpenSeatsCount(grp.id)"
                    color="rose"
                    variant="subtle"
                    size="xs"
                    class="text-[10px]"
                  >
                    +{{ getAllottedGuestsCount(grp.id) - getGroupOpenSeatsCount(grp.id) }} over
                  </UBadge>
                </div>
              </div>

              <!-- Allotted Parties Chips -->
              <div class="flex flex-wrap items-center gap-1.5 min-h-8 p-2 bg-toast-50/50 border border-bread-200/50 rounded-lg">
                <span
                  v-if="!groupAllotments[grp.id]?.length"
                  class="text-[11px] text-muted italic px-1"
                >
                  No parties allotted to this group yet.
                </span>

                <div
                  v-for="partyName in (groupAllotments[grp.id] || [])"
                  :key="partyName"
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-bread-300 rounded-md text-xs font-medium text-toast-900 shadow-2xs"
                >
                  <span>{{ partyName }}</span>
                  <span class="bg-toast-100 text-toast-800 text-[10px] px-1 rounded-full font-mono">
                    {{ unseatedPartiesList.find(p => p.partyName === partyName)?.count || 0 }}
                  </span>
                  <button
                    type="button"
                    class="text-muted hover:text-rose-600 transition-colors cursor-pointer"
                    title="Remove from group"
                    @click="togglePartyInGroup(grp.id, partyName)"
                  >
                    <UIcon name="i-lucide-x" class="size-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Actions Footer -->
          <div class="flex items-center justify-between pt-3 border-t border-bread-200/60">
            <span class="text-xs text-muted">
              Auto-sort fills only tables belonging to each group.
            </span>
            <div class="flex items-center gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                class="cursor-pointer"
                @click="isAutoSortModalOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                color="toast"
                variant="solid"
                size="sm"
                icon="i-lucide-sparkles"
                class="bg-toast-800 hover:bg-toast-900 text-white font-bold cursor-pointer"
                :loading="saving"
                @click="executeGroupAutoSort"
              >
                Execute Auto-Sort
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

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
