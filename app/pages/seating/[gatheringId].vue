<script setup lang="ts">
import type { GatheringRecord, RsvpStatus, SeatingGuestRecord, SeatingSeat, SeatingTable } from '~/types/seating'
import { guestDisplayName } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import { attendanceTokenFromScan, currentOriginPath } from '~/utils/seatingQr'
import SeatingQrImage from '~/components/SeatingQrImage.vue'
import SeatingCheckInScanner from '~/components/SeatingCheckInScanner.vue'
import EventQuestionsModal from '~/components/EventQuestionsModal.vue'
import type { EventQuestion } from '~/types/event'
import { formatRsvpAnswerNotes, formatRsvpAnswerValue } from '~/utils/rsvpDisplay'

definePageMeta({ layout: 'event-navbar', middleware: 'seating-enabled' })

const route = useRoute()
const toast = useToast()
const { isUiOnlyMode } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const seating = useSeating()

const gatheringId = computed(() => String(route.params.gatheringId || ''))
const gathering = ref<GatheringRecord | null>(null)
const guests = ref<SeatingGuestRecord[]>([])
const loading = ref(true)
const saving = ref(false)
const section = ref<'guests' | 'tables' | 'checkin' | 'invite'>('guests')
const activeMobileTab = ref<'launcher' | 'overview'>('overview')
const layoutRows = ref<LayoutRow[]>([])
const quickTableCount = ref(1)
const quickSeatCount = ref(8)
const lastScan = ref('')
const searchQuery = ref('')
const statusFilter = ref<'ALL' | 'GOING' | 'PENDING' | 'NOT_GOING'>('ALL')

const isQuestionsOpen = ref(false)
const isCopiedPasscode = ref(false)
const isCopiedLookupUrl = ref(false)
const isCopiedOpenInvite = ref(false)

const guestForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  partyName: '',
})
const inviteForm = reactive({
  passcode: '',
  invitationSubject: '',
  invitationMessage: '',
})

const active = computed(() => gathering.value?.status === 'ACTIVE')
const lookupUrl = computed(() => (gathering.value ? currentOriginPath(`/seat/${gathering.value.publicToken}`) : ''))
const openInviteUrl = computed(() => {
  const openInvite = gathering.value?.openInvite
  return openInvite?.enabled && openInvite.token ? currentOriginPath(`/jam/open/${openInvite.token}`) : ''
})

const daysRemaining = computed(() => {
  if (gathering.value?.eventDate) {
    const diff = new Date(gathering.value.eventDate).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }
  return 0
})

const gatheringDateFormatted = computed(() => {
  if (gathering.value?.eventDate) {
    return new Date(gathering.value.eventDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  return ''
})

const goingCount = computed(() => guests.value.filter((guest) => guest.rsvpStatus === 'GOING').length)
const notGoingCount = computed(() => guests.value.filter((guest) => guest.rsvpStatus === 'NOT_GOING').length)
const pendingCount = computed(() => guests.value.filter((guest) => guest.rsvpStatus !== 'GOING' && guest.rsvpStatus !== 'NOT_GOING').length)

const rsvpResponseRate = computed(() => {
  if (guests.value.length === 0) return 0
  const replied = goingCount.value + notGoingCount.value
  return Math.round((replied / guests.value.length) * 100)
})

const attendingGuests = computed(() => guests.value.filter((guest) => guest.isAttending || guest.rsvpStatus === 'GOING'))
const seatedCount = computed(() => attendingGuests.value.filter((guest) => guest.seatNumber != null).length)
const seatedPercent = computed(() => {
  if (attendingGuests.value.length === 0) return 0
  return Math.round((seatedCount.value / attendingGuests.value.length) * 100)
})

const layoutSeatTotal = computed(() => layoutRows.value.reduce((total, row) => total + (Number(row.capacity) || 0), 0))

const totalSeatsCapacity = computed(() => {
  return (gathering.value?.tables || []).reduce((acc, t) => acc + (t.capacity || 0), 0)
})

const checkedInCount = computed(() => guests.value.filter((guest) => Boolean(guest.checkedInAt)).length)
const checkInPercent = computed(() => {
  if (attendingGuests.value.length === 0) return 0
  return Math.round((checkedInCount.value / attendingGuests.value.length) * 100)
})

const filteredGuests = computed(() => {
  return guests.value.filter((guest) => {
    const fullName = `${guest.firstName} ${guest.lastName}`.toLowerCase()
    const email = (guest.email || '').toLowerCase()
    const party = (guest.partyName || '').toLowerCase()
    const q = searchQuery.value.trim().toLowerCase()
    const matchesQuery = !q || fullName.includes(q) || email.includes(q) || party.includes(q)

    if (!matchesQuery) return false

    if (statusFilter.value === 'ALL') return true
    if (statusFilter.value === 'GOING') return guest.rsvpStatus === 'GOING'
    if (statusFilter.value === 'NOT_GOING') return guest.rsvpStatus === 'NOT_GOING'
    if (statusFilter.value === 'PENDING') return guest.rsvpStatus !== 'GOING' && guest.rsvpStatus !== 'NOT_GOING'
    return true
  })
})

interface LayoutRow {
  key: string
  _id?: string
  label: string
  capacity: number
}

let nextRowKey = 0

function layoutRow(fields: Omit<LayoutRow, 'key'>): LayoutRow {
  nextRowKey += 1
  return { key: `row-${nextRowKey}`, ...fields }
}

interface QuickNavItem {
  id: 'guests' | 'invite' | 'tables' | 'checkin' | 'view_pass' | 'export_csv'
  label: string
  icon: string
  bgClass: string
  badge?: string
}

const QUICK_NAV_ITEMS = computed<QuickNavItem[]>(() => [
  {
    id: 'guests',
    label: 'Guest List',
    icon: 'i-lucide-users',
    bgClass: 'bg-rose-500',
    badge: guests.value.length ? String(guests.value.length) : undefined,
  },
  {
    id: 'invite',
    label: 'Invitation',
    icon: 'i-lucide-mail',
    bgClass: 'bg-blue-500',
    badge: pendingCount.value ? `${pendingCount.value} pend` : undefined,
  },
  {
    id: 'tables',
    label: 'Tables & Seats',
    icon: 'i-lucide-layout-grid',
    bgClass: 'bg-emerald-500',
    badge: gathering.value?.tables?.length ? `${gathering.value.tables.length} tbls` : undefined,
  },
  {
    id: 'checkin',
    label: 'Check-in & QR',
    icon: 'i-lucide-qr-code',
    bgClass: 'bg-purple-500',
    badge: checkedInCount.value ? `${checkedInCount.value} in` : undefined,
  },
  {
    id: 'view_pass',
    label: 'Guest View',
    icon: 'i-lucide-external-link',
    bgClass: 'bg-amber-500',
  },
  {
    id: 'export_csv',
    label: 'Export Seat Plan',
    icon: 'i-lucide-download',
    bgClass: 'bg-toast-600',
  },
])

function onQuickNavItemClick(item: QuickNavItem) {
  if (item.id === 'checkin') {
    navigateTo(`/seating/checkin/${gatheringId.value}`)
    return
  }
  if (item.id === 'view_pass') {
    if (lookupUrl.value) {
      window.open(lookupUrl.value, '_blank')
    }
    return
  }
  if (item.id === 'export_csv') {
    downloadGuests()
    return
  }
  section.value = item.id
  activeMobileTab.value = 'overview'
}

useHead({ title: computed(() => (gathering.value ? `${gathering.value.name} Seating | Jam` : 'Jam Seating Dashboard')) })

onMounted(() => load())

function layoutHasUnsavedEdits() {
  const saved = gathering.value?.tables ?? []
  return layoutRows.value.length !== saved.length || layoutRows.value.some((row, index) => {
    const table = saved[index]
    return row._id !== table?._id
      || row.label !== (table?.customLabel || '')
      || Number(row.capacity) !== table?.capacity
  })
}

async function load({ keepLayoutEdits = true } = {}) {
  loading.value = true
  // Other actions reload the page data, and must not throw away a layout still being edited.
  const syncLayout = !keepLayoutEdits || !layoutHasUnsavedEdits()
  try {
    gathering.value = await seating.getGathering(gatheringId.value)
    if (gathering.value) {
      setActiveEvent({
        _id: gathering.value._id,
        eventName: gathering.value.name,
      })
      inviteForm.passcode = gathering.value.passcode || ''
      inviteForm.invitationSubject = gathering.value.invitationSubject || ''
      inviteForm.invitationMessage = gathering.value.invitationMessage || ''
      if (syncLayout) {
        layoutRows.value = gathering.value.tables.map((table) => layoutRow({
          _id: table._id,
          label: table.customLabel || '',
          capacity: table.capacity,
        }))
      }
      if (gathering.value.status === 'ACTIVE') {
        const listed = await seating.listGuests(gatheringId.value)
        guests.value = listed.guests
      }
    }
  } catch (error) {
    toast.add({ title: 'Could not load seating plan', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
}

async function addGuest() {
  saving.value = true
  try {
    await seating.createGuest(gatheringId.value, { ...guestForm })
    guestForm.firstName = ''
    guestForm.lastName = ''
    guestForm.email = ''
    guestForm.partyName = ''
    toast.add({ title: 'Guest added successfully', color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: 'Could not add guest', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function setResponse(guest: SeatingGuestRecord, rsvpStatus: RsvpStatus) {
  try {
    await seating.updateGuest(gatheringId.value, guest._id, { rsvpStatus })
    await load()
  } catch (error) {
    toast.add({ title: 'Could not update guest', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function downloadGuests() {
  try {
    const blob = await seating.exportGuests(gatheringId.value)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'jam-seat-plan.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast.add({ title: 'Seat plan downloaded', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not download seat plan', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function saveInvitation() {
  saving.value = true
  try {
    gathering.value = await seating.saveInvitation(gatheringId.value, { ...inviteForm })
    toast.add({ title: 'Invitation saved successfully', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not save invitation', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function saveQuestions(questions: EventQuestion[]) {
  gathering.value = await seating.saveInvitation(gatheringId.value, { questions })
}

function answerSummary(answer: NonNullable<SeatingGuestRecord['answers']>[number]) {
  const notes = formatRsvpAnswerNotes(answer.notes)
  const value = formatRsvpAnswerValue(answer.answer)
  return `${answer.question}: ${value}${notes ? ` (${notes})` : ''}`
}

async function sendInvitation() {
  saving.value = true
  try {
    const result = await seating.sendInvites(gatheringId.value)
    toast.add({ title: result.message, color: result.sent ? 'success' : 'warning' })
    await load()
  } catch (error) {
    toast.add({ title: 'Could not send invitations', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function removeGuest(guest: SeatingGuestRecord) {
  if (!confirm(`Are you sure you want to remove ${guestDisplayName(guest)}?`)) return
  try {
    await seating.deleteGuest(gatheringId.value, guest._id)
    toast.add({ title: 'Guest removed', color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: 'Could not remove guest', description: getApiErrorMessage(error), color: 'error' })
  }
}

function addLayoutRows() {
  const count = Math.max(Math.floor(Number(quickTableCount.value)) || 0, 0)
  const capacity = Math.max(Math.floor(Number(quickSeatCount.value)) || 0, 1)
  for (let index = 0; index < count; index += 1) {
    layoutRows.value.push(layoutRow({ label: '', capacity }))
  }
}

function removeLayoutRow(key: string) {
  layoutRows.value = layoutRows.value.filter((row) => row.key !== key)
}

async function saveLayout(confirmClear = false): Promise<void> {
  const tables = layoutRows.value.map(({ _id, label, capacity }) => ({ _id, label, capacity: Number(capacity) }))
  gathering.value = await seating.replaceTables(gatheringId.value, tables, confirmClear)
}

async function applyTables() {
  if (!gathering.value) return
  saving.value = true
  try {
    try {
      await saveLayout()
    } catch (error) {
      const message = getApiErrorMessage(error)
      if (!message.includes('Confirm to continue') || !window.confirm(message)) throw error
      await saveLayout(true)
    }
    await load({ keepLayoutEdits: false })
    toast.add({ title: 'Table layout updated', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not update tables', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function runAutoAssign() {
  saving.value = true
  try {
    const result = await seating.autoAssign(gatheringId.value)
    guests.value = result.guests
    gathering.value = result.gathering
    toast.add({
      title: result.splitParties.length ? 'Some parties were split' : 'Seats assigned',
      description: result.splitParties.length ? result.splitParties.join(', ') : result.message,
      color: result.splitParties.length ? 'warning' : 'success',
    })
  } catch (error) {
    toast.add({ title: 'Could not assign seats', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

function seatValue(guest: SeatingGuestRecord) {
  return guest.tableId && guest.seatNumber ? `${guest.tableId}:${guest.seatNumber}` : ''
}

async function onSeatChange(guest: SeatingGuestRecord, value: string) {
  try {
    if (!value) {
      await seating.moveSeat(gatheringId.value, guest._id, null, null)
    } else {
      const [tableId, seatNumber] = value.split(':')
      await seating.moveSeat(gatheringId.value, guest._id, tableId || null, Number(seatNumber))
    }
    await load()
  } catch (error) {
    toast.add({ title: 'Could not move seat', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function resend(guest: SeatingGuestRecord) {
  if (isUiOnlyMode.value) {
    toast.add({ title: 'Preview only', description: 'Seat pass emails send when the API is connected.', color: 'warning' })
    return
  }
  try {
    await seating.resendPass(gatheringId.value, guest._id)
    toast.add({ title: 'Seat pass sent', description: guest.email, color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not send pass', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function checkIn(guest: SeatingGuestRecord) {
  try {
    await seating.checkInGuest(gatheringId.value, guest._id)
    await load()
  } catch (error) {
    toast.add({ title: 'Could not check in', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function undo(guest: SeatingGuestRecord) {
  try {
    await seating.undoCheckIn(gatheringId.value, guest._id)
    await load()
  } catch (error) {
    toast.add({ title: 'Could not undo check-in', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function onScan(value: string) {
  const token = attendanceTokenFromScan(value)
  if (!token || token === lastScan.value) return
  lastScan.value = token
  try {
    const guest = await seating.checkInByToken(gatheringId.value, token)
    toast.add({
      title: `${guest.name} checked in`,
      description: guest.tableLabel ? `${guest.tableLabel}, seat ${guest.seatNumber}` : 'No seat assigned yet',
      color: 'success',
    })
    await load()
  } catch (error) {
    toast.add({ title: 'Pass not recognized', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    setTimeout(() => {
      if (lastScan.value === token) lastScan.value = ''
    }, 2000)
  }
}

function seatsOf(table: SeatingTable): SeatingSeat[] {
  return table.seats ?? Array.from({ length: table.capacity }, (_, index) => ({
    number: index + 1,
    unavailable: false,
    guest: null,
  }))
}

function guestInSeat(table: SeatingTable, seatNumber: number) {
  return guests.value.find((guest) => guest.tableId === table._id && guest.seatNumber === seatNumber)
}

async function toggleSeatSelectionLock() {
  if (!gathering.value) return
  try {
    gathering.value = await seating.saveInvitation(gatheringId.value, {
      seatSelectionLocked: !gathering.value.seatSelectionLocked,
    })
  } catch (error) {
    toast.add({ title: 'Could not change seat selection', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function toggleSeat(table: SeatingTable, seat: SeatingSeat) {
  try {
    gathering.value = await seating.setSeatUnavailable(gatheringId.value, table._id, seat.number, !seat.unavailable)
  } catch (error) {
    toast.add({ title: 'Could not change seat', description: getApiErrorMessage(error), color: 'error' })
    await load()
  }
}

function tableFor(guest: SeatingGuestRecord) {
  return gathering.value?.tables.find((table) => table._id === guest.tableId)
}

async function copyPasscode() {
  if (!inviteForm.passcode) return
  try {
    await navigator.clipboard.writeText(inviteForm.passcode)
    isCopiedPasscode.value = true
    toast.add({ title: 'Passcode copied to clipboard', color: 'success' })
    setTimeout(() => {
      isCopiedPasscode.value = false
    }, 2000)
  } catch {
    toast.add({ title: 'Could not copy passcode', color: 'warning' })
  }
}

async function updateOpenInvite(body: { enabled?: boolean, regenerate?: boolean }) {
  try {
    gathering.value = await seating.setOpenInvite(gatheringId.value, body)
  } catch (error) {
    toast.add({ title: 'Could not update the open invite', description: getApiErrorMessage(error), color: 'error' })
  }
}

function replaceOpenInvite() {
  if (window.confirm('Replace this link? The old link will stop working for anyone who has it.')) {
    updateOpenInvite({ regenerate: true })
  }
}

async function copyOpenInvite() {
  try {
    await navigator.clipboard.writeText(openInviteUrl.value)
    isCopiedOpenInvite.value = true
    toast.add({ title: 'Open invite link copied', color: 'success' })
    setTimeout(() => {
      isCopiedOpenInvite.value = false
    }, 2000)
  } catch {
    toast.add({ title: 'Could not copy link', color: 'warning' })
  }
}

async function copyLookupUrl() {
  if (!lookupUrl.value) return
  try {
    await navigator.clipboard.writeText(lookupUrl.value)
    isCopiedLookupUrl.value = true
    toast.add({ title: 'Guest lookup link copied', color: 'success' })
    setTimeout(() => {
      isCopiedLookupUrl.value = false
    }, 2000)
  } catch {
    toast.add({ title: 'Could not copy link', color: 'warning' })
  }
}
</script>

<template>
  <div class="jam-dashboard-root bg-bread-400 h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
    <!-- Navbar Actions Teleport -->
    <ClientOnly>
      <Teleport to="#event-navbar-actions">
        <div v-if="gathering" class="flex items-center gap-2">
          <UButton
            v-if="lookupUrl && active"
            :to="lookupUrl"
            target="_blank"
            icon="i-lucide-external-link"
            color="neutral"
            variant="ghost"
            size="sm"
            class="text-white hover:bg-white/10 hidden sm:inline-flex text-xs font-semibold"
          >
            Guest Pass
          </UButton>
          <UBadge color="warning" variant="solid" size="xl" class="text-black rounded-full shadow-sm font-medium">
            {{ gathering.packageName }}
          </UBadge>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- ================= MOBILE SUB-NAV (< md / < 768px): Inherited from Event Dashboard ================= -->
    <div class="md:hidden px-4 pt-3 pb-1 flex items-center justify-between shrink-0 bg-bread-400">
      <div
        class="flex items-center gap-1.5 p-1 bg-white/70 backdrop-blur-xs rounded-xl w-full max-w-xs mx-auto border border-bread-300/40 shadow-xs"
      >
        <button
          type="button"
          class="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer"
          :class="activeMobileTab === 'launcher' ? 'bg-toast-500 text-white shadow-xs' : 'text-toast-800 hover:text-toast-950'"
          @click="activeMobileTab = 'launcher'"
        >
          Quick Launch
        </button>
        <button
          type="button"
          class="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer"
          :class="activeMobileTab === 'overview' ? 'bg-toast-500 text-white shadow-xs' : 'text-toast-800 hover:text-toast-950'"
          @click="activeMobileTab = 'overview'"
        >
          Workspace
        </button>
      </div>
    </div>

    <!-- ================= MOBILE LAUNCHER (< md when tab is launcher) ================= -->
    <div
      v-if="activeMobileTab === 'launcher'"
      class="md:hidden white-bread-container h-full flex flex-col flex-1 overflow-hidden m-3 mt-1.5 shadow-sm p-4"
      style="border-radius: 1.25rem;"
    >
      <div class="flex flex-1 items-center justify-center min-h-0 py-4 px-3 w-full">
        <div class="grid grid-cols-3 gap-x-5 gap-y-6 max-w-[280px] mx-auto w-full items-center justify-items-center">
          <div
            v-for="item in QUICK_NAV_ITEMS"
            :key="item.id"
            role="button"
            :tabindex="0"
            class="group flex flex-col items-center justify-center mx-auto w-full p-1 rounded-xl focus-visible:outline-none text-center cursor-pointer select-none"
            @click="onQuickNavItemClick(item)"
          >
            <div class="relative flex items-center justify-center w-fit mx-auto">
              <div
                class="size-12 flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105 group-active:scale-95 shadow-sm text-white"
                :class="item.bgClass"
              >
                <UIcon :name="item.icon" class="size-6 text-white shrink-0" />
              </div>
              <span
                v-if="item.badge"
                class="absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-toast-900 text-white shadow-xs"
              >
                {{ item.badge }}
              </span>
            </div>
            <div class="font-medium mt-1.5 text-center text-xs text-toast-900 leading-tight max-w-20 truncate">
              {{ item.label }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton / Card -->
    <div v-if="loading" class="p-6 max-w-4xl mx-auto w-full">
      <div class="white-bread-container p-8 text-center space-y-3">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-toast-600 mx-auto" />
        <p class="font-serif text-lg font-bold text-toast-800">Loading Jam seating plan...</p>
      </div>
    </div>

    <!-- Main UPageGrid Layout: 3:1 column split matching EventDashboard v2 -->
    <UPageGrid
      v-else-if="gathering"
      class="grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-0 w-full flex-1 h-full min-h-0 overflow-hidden items-stretch"
      :class="activeMobileTab === 'launcher' ? 'hidden md:grid' : 'grid'"
    >
      <!-- ================= LEFT DIVISION: col-span-1 Quick Navigation ================= -->
      <UDashboardPanel
        class="hidden md:flex md:col-span-1 lg:col-span-1 w-full bg-white border-b md:border-b-0 md:border-r border-bread-200/90 shadow-sm flex-col z-20 shrink-0 h-full min-h-0 overflow-hidden p-3 sm:p-4"
        :ui="{ root: 'h-full min-h-0 flex flex-col justify-between overflow-hidden p-3 sm:p-4' }"
      >
        <div class="flex flex-col items-center justify-start w-full">
          <!-- Panel Header -->
          <div class="pb-3 sm:pb-4 flex items-center gap-2 shrink-0 text-center justify-center max-w-full min-w-0 border-b border-bread-200/70 w-full">
            <UIcon name="i-lucide-compass" class="size-4 sm:size-5 text-toast-600 shrink-0" />
            <h2 class="font-serif text-toast-500 font-bold leading-tight truncate text-base sm:text-lg">
              Quick Navigation
            </h2>
          </div>

          <!-- Circular Launcher Grid -->
          <div class="grid grid-cols-2 gap-3 sm:gap-3.5 py-4 w-full">
            <div
              v-for="item in QUICK_NAV_ITEMS"
              :key="item.id"
              role="button"
              :tabindex="0"
              class="group flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer select-none text-center"
              :class="section === item.id ? 'bg-toast-50 ring-2 ring-toast-500 shadow-xs' : 'hover:bg-toast-50/60'"
              @click="onQuickNavItemClick(item)"
            >
              <div class="relative flex items-center justify-center">
                <div
                  class="size-11 sm:size-12 flex items-center justify-center rounded-full text-white shadow-sm transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
                  :class="item.bgClass"
                >
                  <UIcon :name="item.icon" class="size-5 sm:size-6 text-white shrink-0" />
                </div>
                <span
                  v-if="item.badge"
                  class="absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-toast-900 text-white shadow-xs"
                >
                  {{ item.badge }}
                </span>
              </div>
              <div class="font-medium mt-1.5 text-xs text-toast-900 leading-tight">
                {{ item.label }}
              </div>
            </div>
          </div>
        </div>

        <!-- Guidance & Plan Summary Bottom Card -->
        <div class="mt-auto pt-3 border-t border-bread-200/60 w-full space-y-2 text-xs">
          <!-- Package pill -->
          <div class="bg-toast-50/70 p-2.5 rounded-xl border border-bread-200/60 space-y-1">
            <div class="flex items-center justify-between text-toast-700">
              <span class="font-semibold uppercase tracking-wider text-[10px]">Package Tier</span>
              <UBadge color="warning" variant="solid" size="xs" class="text-black font-semibold">
                {{ gathering.packageName }}
              </UBadge>
            </div>
            <div class="flex items-center justify-between text-muted text-[11px]">
              <span>Max Guests</span>
              <span class="font-bold text-toast-900">{{ gathering.maxGuests }}</span>
            </div>
          </div>

          <!-- Passcode Copy Pill -->
          <div class="bg-toast-50/70 p-2.5 rounded-xl border border-bread-200/60 flex items-center justify-between">
            <div class="min-w-0">
              <span class="font-semibold uppercase tracking-wider text-[10px] text-toast-600 block">Passcode</span>
              <span class="font-mono font-bold text-toast-900 text-xs truncate block">
                {{ inviteForm.passcode || 'Not set' }}
              </span>
            </div>
            <UButton
              size="2xs"
              color="toast"
              variant="soft"
              icon="i-lucide-copy"
              class="cursor-pointer shrink-0 ml-1"
              @click="copyPasscode"
            >
              {{ isCopiedPasscode ? 'Copied' : 'Copy' }}
            </UButton>
          </div>
        </div>
      </UDashboardPanel>

      <!-- ================= RIGHT DIVISION: col-span-3 (Guidance Metrics & Workspace) ================= -->
      <section
        class="md:col-span-3 lg:col-span-3 p-3 sm:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 bg-toast-50/20 h-full min-h-0 overflow-y-auto justify-start"
      >
        <!-- 1. Topmost Container: 3 Metric Groups (Days, Confirmed Guests, Seating Assignment col-span-2) -->
        <div class="white-bread-container p-3 sm:p-3.5 lg:p-4 shadow-sm shrink-0">
          <div
            class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-bread-200/60"
          >
            <!-- Column 1: Days to Gathering -->
            <div class="space-y-1 pt-1 sm:pt-0 sm:pr-3 min-w-0">
              <div class="dash-item-header flex items-center gap-1 text-muted font-medium min-w-0">
                <span class="truncate">Days to Gathering</span>
                <UIcon name="i-lucide-calendar-heart" class="size-3.5 text-red-500 shrink-0" />
              </div>
              <div class="dash-top-value font-bold font-serif text-highlighted tracking-tight truncate">
                {{ daysRemaining }} Days
              </div>
              <div class="dash-desc-text text-muted truncate">
                {{ gatheringDateFormatted || 'Date pending' }} · {{ gathering.venue || 'Venue pending' }}
              </div>
            </div>

            <!-- Column 2: Confirmed Guests -->
            <div class="space-y-1 pt-1 sm:pt-0 sm:px-3 min-w-0">
              <div class="dash-item-header flex items-center gap-1 text-muted font-medium min-w-0">
                <span class="truncate">Confirmed Guests</span>
                <UIcon name="i-lucide-users" class="size-3.5 text-teal-500 shrink-0" />
              </div>
              <div class="dash-top-value font-bold font-serif text-highlighted tracking-tight truncate">
                {{ goingCount }}
              </div>
              <div class="dash-desc-text text-muted truncate">
                {{ guests.length }} / {{ gathering.maxGuests }} registered · {{ rsvpResponseRate }}% RSVP
              </div>
            </div>

            <!-- Column 3: Seating Completion (col-span-2, enlarged UProgress, numbers below) -->
            <div class="space-y-1.5 pt-1 sm:pt-0 sm:pl-3 col-span-2 flex flex-col justify-between min-w-0">
              <div class="dash-item-header flex items-center gap-1 text-muted font-medium min-w-0">
                <span class="truncate">Seats Assigned</span>
                <UIcon name="i-lucide-layout-grid" class="size-3.5 text-green-500 shrink-0" />
              </div>
              <div class="w-full py-0.5">
                <UProgress :model-value="seatedPercent" color="success" size="sm" class="w-full" />
              </div>
              <div class="flex items-center justify-between min-w-0 gap-2">
                <span class="dash-top-value font-bold font-serif text-highlighted tracking-tight shrink-0">
                  {{ seatedPercent }}%
                </span>
                <span class="dash-desc-text text-muted font-medium truncate">
                  {{ seatedCount }}/{{ attendingGuests.length }} Attending Seated · {{ totalSeatsCapacity }} Total Table Seats
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Inactive Plan Notice if not yet paid -->
        <div
          v-if="!active"
          class="white-bread-container p-6 text-center space-y-4 max-w-lg mx-auto my-6 shadow-sm border border-amber-200/80 bg-amber-50/40"
        >
          <div class="size-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <UIcon name="i-lucide-lock" class="size-7" />
          </div>
          <div class="space-y-1.5">
            <h2 class="text-2xl font-serif font-bold text-toast-900">Seating Workspace Locked</h2>
            <p class="text-xs sm:text-sm text-toast-700 leading-relaxed">
              Complete payment for your <strong>{{ gathering.packageName }}</strong> plan to unlock guests, tables, auto-seating, and digital check-in.
            </p>
          </div>
          <UButton
            color="primary"
            size="md"
            icon="i-lucide-credit-card"
            variant="solid"
            :to="{ path: '/user/seating-payment', query: { gatheringId: gathering._id } }"
          >
            Complete Payment Now
          </UButton>
        </div>

        <!-- 2. Section Navigation Tabs Bar (Direct switcher on workspace) -->
        <div v-if="active" class="flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div class="flex flex-wrap gap-1.5 p-1 bg-white/80 rounded-xl border border-bread-200 shadow-2xs">
            <UButton
              size="xs"
              :color="section === 'guests' ? 'primary' : 'neutral'"
              :variant="section === 'guests' ? 'solid' : 'ghost'"
              icon="i-lucide-users"
              class="font-semibold cursor-pointer"
              @click="section = 'guests'"
            >
              Guests ({{ guests.length }})
            </UButton>
            <UButton
              size="xs"
              :color="section === 'invite' ? 'primary' : 'neutral'"
              :variant="section === 'invite' ? 'solid' : 'ghost'"
              icon="i-lucide-mail"
              class="font-semibold cursor-pointer"
              @click="section = 'invite'"
            >
              Invitation & Passcode
            </UButton>
            <UButton
              size="xs"
              :color="section === 'tables' ? 'primary' : 'neutral'"
              :variant="section === 'tables' ? 'solid' : 'ghost'"
              icon="i-lucide-layout-grid"
              class="font-semibold cursor-pointer"
              @click="section = 'tables'"
            >
              Tables & Seats ({{ gathering.tables?.length || 0 }})
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-qr-code"
              class="font-semibold cursor-pointer"
              :to="`/seating/checkin/${gatheringId}`"
            >
              Check-in & QR
            </UButton>
          </div>

          <div class="hidden sm:flex items-center gap-2">
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              icon="i-lucide-download"
              class="font-semibold cursor-pointer"
              @click="downloadGuests"
            >
              Export Seat Plan
            </UButton>
          </div>
        </div>

        <!-- ================= WORKSPACE MODULE: GUESTS ================= -->
        <div v-if="active && section === 'guests'" class="space-y-4">
          <!-- Add Guest Card -->
          <div class="white-bread-container p-4 sm:p-5 space-y-3 shadow-xs">
            <div class="flex items-center justify-between border-b border-bread-200/60 pb-2">
              <div class="flex items-center gap-1.5">
                <UIcon name="i-lucide-user-plus" class="size-4 text-toast-600" />
                <h3 class="font-serif font-bold text-base text-toast-900">Add New Guest</h3>
              </div>
              <span class="text-xs text-muted">
                {{ guests.length }} of {{ gathering.maxGuests }} max guests
              </span>
            </div>

            <form class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end" @submit.prevent="addGuest">
              <div>
                <label class="block text-[11px] font-semibold text-toast-800 mb-1">First Name</label>
                <UInput v-model="guestForm.firstName" placeholder="First name" required size="sm" class="w-full" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-toast-800 mb-1">Last Name</label>
                <UInput v-model="guestForm.lastName" placeholder="Last name" required size="sm" class="w-full" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-toast-800 mb-1">Email</label>
                <UInput v-model="guestForm.email" type="email" placeholder="guest@example.com" required size="sm" class="w-full" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-toast-800 mb-1">Party / Group (Optional)</label>
                <UInput v-model="guestForm.partyName" placeholder="e.g. VIP, Dela Cruz Family" size="sm" class="w-full" />
              </div>
              <div>
                <UButton
                  type="submit"
                  block
                  color="primary"
                  size="sm"
                  icon="i-lucide-plus"
                  :loading="saving"
                  variant="solid"
                >
                  Add Guest
                </UButton>
              </div>
            </form>
          </div>

          <!-- Guest List & Filter Card -->
          <div class="white-bread-container p-4 sm:p-5 space-y-4 shadow-xs">
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <!-- Search bar -->
              <div class="relative flex-1 max-w-sm">
                <UInput
                  v-model="searchQuery"
                  icon="i-lucide-search"
                  placeholder="Search guests by name or email..."
                  size="sm"
                  class="w-full"
                />
              </div>

              <!-- Status Filter Tabs -->
              <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <UButton
                  size="2xs"
                  :variant="statusFilter === 'ALL' ? 'solid' : 'ghost'"
                  :color="statusFilter === 'ALL' ? 'toast' : 'neutral'"
                  class="cursor-pointer"
                  @click="statusFilter = 'ALL'"
                >
                  All ({{ guests.length }})
                </UButton>
                <UButton
                  size="2xs"
                  :variant="statusFilter === 'GOING' ? 'solid' : 'ghost'"
                  :color="statusFilter === 'GOING' ? 'success' : 'neutral'"
                  class="cursor-pointer"
                  @click="statusFilter = 'GOING'"
                >
                  Attending ({{ goingCount }})
                </UButton>
                <UButton
                  size="2xs"
                  :variant="statusFilter === 'PENDING' ? 'solid' : 'ghost'"
                  :color="statusFilter === 'PENDING' ? 'warning' : 'neutral'"
                  class="cursor-pointer"
                  @click="statusFilter = 'PENDING'"
                >
                  Pending ({{ pendingCount }})
                </UButton>
                <UButton
                  size="2xs"
                  :variant="statusFilter === 'NOT_GOING' ? 'solid' : 'ghost'"
                  :color="statusFilter === 'NOT_GOING' ? 'error' : 'neutral'"
                  class="cursor-pointer"
                  @click="statusFilter = 'NOT_GOING'"
                >
                  Declined ({{ notGoingCount }})
                </UButton>
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="filteredGuests.length === 0" class="py-10 text-center space-y-2">
              <UIcon name="i-lucide-users" class="size-8 text-toast-400 mx-auto" />
              <p class="font-medium text-sm text-toast-700">No guests match the current filter.</p>
            </div>

            <!-- Guest Roster List -->
            <div v-else class="divide-y divide-bread-200/60 border border-bread-200/60 rounded-xl overflow-hidden bg-white/70">
              <div
                v-for="guest in filteredGuests"
                :key="guest._id"
                class="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-toast-50/40 transition-colors"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="size-9 rounded-full bg-toast-100 text-toast-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    {{ (guest.firstName?.[0] || 'G').toUpperCase() }}{{ (guest.lastName?.[0] || '').toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-sm text-toast-900 truncate">{{ guestDisplayName(guest) }}</span>
                      <UBadge
                        v-if="guest.partyName"
                        color="neutral"
                        variant="subtle"
                        size="xs"
                        class="text-[10px] truncate"
                      >
                        {{ guest.partyName }}
                      </UBadge>
                    </div>
                    <div class="text-xs text-muted truncate">
                      {{ guest.email }}
                    </div>
                    <details
                      v-if="guest.answers?.length"
                      class="mt-1 text-xs text-toast-800"
                    >
                      <summary class="cursor-pointer font-medium">
                        Answers ({{ guest.answers.length }})
                      </summary>
                      <p
                        v-for="answer in guest.answers"
                        :key="answer.question"
                        class="mt-0.5 whitespace-pre-line"
                      >
                        {{ answerSummary(answer) }}
                      </p>
                    </details>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <!-- Seated pill -->
                  <UBadge
                    v-if="guest.isAttending || guest.rsvpStatus === 'GOING'"
                    :color="guest.seatNumber != null ? 'success' : 'neutral'"
                    variant="subtle"
                    size="xs"
                    class="text-[10px]"
                  >
                    {{ guest.seatNumber != null ? `${tableFor(guest)?.label || 'Table'}, Seat ${guest.seatNumber}` : 'No seat' }}
                  </UBadge>

                  <!-- RSVP Selector -->
                  <select
                    class="text-xs rounded-lg border border-toast-300 bg-white px-2 py-1 font-medium text-toast-900 focus:ring-1 focus:ring-toast-500 cursor-pointer"
                    :value="guest.rsvpStatus || 'PENDING'"
                    @change="setResponse(guest, ($event.target as HTMLSelectElement).value as RsvpStatus)"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="GOING">Attending</option>
                    <option value="NOT_GOING">Declined</option>
                  </select>

                  <!-- Remove Action -->
                  <UButton
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    class="cursor-pointer"
                    title="Remove guest"
                    @click="removeGuest(guest)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ================= WORKSPACE MODULE: INVITATION ================= -->
        <div v-if="active && section === 'invite'" class="space-y-4">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <!-- Left: Passcode & Invite Details -->
            <div class="lg:col-span-2 white-bread-container p-4 sm:p-5 space-y-4 shadow-xs">
              <div class="flex items-center justify-between border-b border-bread-200/60 pb-2">
                <div class="flex items-center gap-1.5">
                  <UIcon name="i-lucide-mail" class="size-4 text-toast-600" />
                  <h3 class="font-serif font-bold text-base text-toast-900">Custom Invitation Message</h3>
                </div>
                <UBadge color="toast" variant="subtle" size="xs">
                  {{ pendingCount }} Pending Recipients
                </UBadge>
              </div>

              <form class="space-y-3.5" @submit.prevent="saveInvitation">
                <UFormField label="Email Subject" description="Title of the invitation email sent to guests">
                  <UInput v-model="inviteForm.invitationSubject" placeholder="You are warmly invited to celebrate with us!" size="sm" class="w-full" />
                </UFormField>

                <UFormField label="Invitation Message" description="Warm message displayed on the Jam invitation screen">
                  <textarea
                    v-model="inviteForm.invitationMessage"
                    rows="4"
                    placeholder="We cannot wait to celebrate together! Please find your event details and RSVP below."
                    class="w-full text-xs sm:text-sm rounded-lg border border-toast-300 bg-white p-2.5 text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500 shadow-2xs"
                  />
                </UFormField>

                <UFormField label="Passcode (optional)" description="If you set one, guests must enter it to open the invitation and reply. Without one, anyone with a link can open the invitation, and anyone with a guest's personal link can reply as them.">
                  <div class="flex items-center gap-2">
                    <UInput v-model="inviteForm.passcode" placeholder="No passcode" size="sm" class="flex-1 font-mono font-bold" />
                    <UButton
                      type="button"
                      size="sm"
                      color="toast"
                      variant="soft"
                      icon="i-lucide-copy"
                      class="cursor-pointer shrink-0"
                      @click="copyPasscode"
                    >
                      {{ isCopiedPasscode ? 'Copied' : 'Copy' }}
                    </UButton>
                  </div>
                </UFormField>

                <div class="flex flex-wrap items-center gap-2.5 pt-2">
                  <UButton
                    type="submit"
                    color="primary"
                    size="sm"
                    icon="i-lucide-save"
                    :loading="saving"
                    variant="solid"
                  >
                    Save Invitation
                  </UButton>
                  <UButton
                    type="button"
                    color="toast"
                    variant="soft"
                    size="sm"
                    icon="i-lucide-list-checks"
                    class="font-semibold cursor-pointer"
                    @click="isQuestionsOpen = true"
                  >
                    RSVP Questions ({{ gathering.questions?.length || 0 }})
                  </UButton>
                  <UButton
                    type="button"
                    color="toast"
                    variant="outline"
                    size="sm"
                    icon="i-lucide-send"
                    :loading="saving"
                    class="font-semibold cursor-pointer"
                    @click="sendInvitation"
                  >
                    Send to Pending Guests ({{ pendingCount }})
                  </UButton>
                </div>
              </form>
            </div>

            <!-- Right: Link Preview Card -->
            <div class="white-bread-container p-4 sm:p-5 space-y-3 shadow-xs flex flex-col justify-between">
              <div class="space-y-2">
                <div class="flex items-center gap-1.5 border-b border-bread-200/60 pb-2">
                  <UIcon name="i-lucide-link" class="size-4 text-toast-600" />
                  <h3 class="font-serif font-bold text-base text-toast-900">Guest Invitation Link</h3>
                </div>
                <p class="text-xs text-muted">
                  Guests use this link, along with your passcode if you set one, to read your invitation and RSVP:
                </p>
                <div class="bg-toast-50 p-2.5 rounded-lg border border-bread-200 text-xs font-mono break-all text-toast-900">
                  {{ lookupUrl || 'Generating link...' }}
                </div>
              </div>

              <div class="space-y-2 pt-2">
                <UButton
                  block
                  color="toast"
                  variant="outline"
                  size="sm"
                  icon="i-lucide-copy"
                  class="cursor-pointer"
                  @click="copyLookupUrl"
                >
                  {{ isCopiedLookupUrl ? 'Link Copied' : 'Copy Link' }}
                </UButton>
                <UButton
                  v-if="lookupUrl"
                  :to="lookupUrl"
                  target="_blank"
                  block
                  color="primary"
                  variant="solid"
                  size="sm"
                  icon="i-lucide-external-link"
                  
                >
                  Preview Guest Page
                </UButton>
              </div>
            </div>
          </div>
        </div>

        <!-- ================= WORKSPACE MODULE: OPEN INVITE ================= -->
        <div v-if="active && section === 'invite'" class="white-bread-container p-4 sm:p-5 space-y-3 shadow-xs">
          <div class="flex items-center gap-1.5 border-b border-bread-200/60 pb-2">
            <UIcon name="i-lucide-share-2" class="size-4 text-toast-600" />
            <h3 class="font-serif font-bold text-base text-toast-900">Open Invite Link</h3>
          </div>
          <p class="text-xs text-muted">
            Anyone with this link can add themselves as a guest who is coming, up to your plan's limit of {{ gathering.maxGuests }}. Their email isn't checked, so turn it off if it spreads further than you want.
          </p>
          <div
            v-if="openInviteUrl"
            class="bg-toast-50 p-2.5 rounded-lg border border-bread-200 text-xs font-mono break-all text-toast-900"
            data-testid="open-invite-link"
          >
            {{ openInviteUrl }}
          </div>
          <div class="flex flex-wrap gap-2">
            <template v-if="openInviteUrl">
              <UButton
                size="sm"
                color="primary"
                variant="solid"
                icon="i-lucide-copy"
                class="cursor-pointer"
                @click="copyOpenInvite"
              >
                {{ isCopiedOpenInvite ? 'Link Copied' : 'Copy Link' }}
              </UButton>
              <UButton
                size="sm"
                color="toast"
                variant="outline"
                icon="i-lucide-refresh-cw"
                class="cursor-pointer"
                @click="replaceOpenInvite"
              >
                Replace Link
              </UButton>
              <UButton
                size="sm"
                color="error"
                variant="ghost"
                class="cursor-pointer"
                @click="updateOpenInvite({ enabled: false })"
              >
                Turn Off Open Invite
              </UButton>
            </template>
            <UButton
              v-else
              size="sm"
              color="primary"
              variant="solid"
              icon="i-lucide-link"
              class="cursor-pointer"
              @click="updateOpenInvite({ enabled: true })"
            >
              Turn On Open Invite
            </UButton>
          </div>
        </div>

        <!-- ================= WORKSPACE MODULE: TABLES & SEATS ================= -->
        <div v-if="active && section === 'tables'" class="space-y-4">
          <!-- Table Layout Controls -->
          <div class="white-bread-container p-4 sm:p-5 space-y-3 shadow-xs">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-bread-200/60 pb-2 gap-2">
              <div class="flex items-center gap-1.5">
                <UIcon name="i-lucide-layout-grid" class="size-4 text-toast-600" />
                <h3 class="font-serif font-bold text-base text-toast-900">Table & Seating Layout</h3>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <span class="text-muted">Total Seats:</span>
                <span class="font-bold text-toast-900 font-mono">{{ layoutSeatTotal }}</span>
              </div>
            </div>

            <div v-if="layoutRows.length" class="space-y-2">
              <div
                v-for="(row, index) in layoutRows"
                :key="row.key"
                class="grid grid-cols-[1fr_5rem_auto] items-end gap-2"
                data-testid="layout-row"
              >
                <UFormField :label="`Table ${index + 1} label (optional)`">
                  <UInput v-model="row.label" maxlength="40" :placeholder="`Table ${index + 1}`" size="sm" class="w-full" />
                </UFormField>
                <UFormField label="Seats">
                  <UInput v-model.number="row.capacity" type="number" min="1" size="sm" class="w-full" />
                </UFormField>
                <UButton
                  size="sm"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  class="cursor-pointer"
                  :aria-label="`Remove table ${index + 1}`"
                  @click="removeLayoutRow(row.key)"
                />
              </div>
            </div>
            <p v-else class="py-2 text-xs text-muted">
              No tables yet. Add as many as your venue has.
            </p>

            <div class="flex flex-wrap items-end gap-2 border-t border-bread-200/60 pt-3">
              <UFormField label="Tables to add">
                <UInput v-model.number="quickTableCount" type="number" min="1" size="sm" class="w-24" />
              </UFormField>
              <UFormField label="Seats each">
                <UInput v-model.number="quickSeatCount" type="number" min="1" size="sm" class="w-24" />
              </UFormField>
              <UButton
                color="toast"
                variant="soft"
                size="sm"
                icon="i-lucide-plus"
                class="cursor-pointer"
                @click="addLayoutRows"
              >
                Add Tables
              </UButton>
              <div class="ml-auto flex items-center gap-2">
                <UButton
                  color="primary"
                  size="sm"
                  :loading="saving"
                  :disabled="layoutRows.length === 0"
                  variant="solid"
                  @click="applyTables"
                >
                  Save Layout
                </UButton>
                <UButton
                  color="toast"
                  variant="outline"
                  size="sm"
                  icon="i-lucide-sparkles"
                  :loading="saving"
                  class="font-semibold cursor-pointer"
                  @click="runAutoAssign"
                >
                  Auto-Assign Seats
                </UButton>
              </div>
            </div>
            <p class="text-[11px] text-muted italic">
              You can have more seats than guests, up to 500, so guests have a choice. Auto-assign only fills guests with no seat, and groups guests who share the same Party/Group at the same table whenever space allows.
            </p>
            <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-toast-50/70 p-2.5 text-xs">
              <span>
                {{ gathering.seatSelectionLocked
                  ? 'Seat selection is locked. Guests can see their seats, but only you can change them.'
                  : 'Guests who are coming can choose and change their own seats.' }}
              </span>
              <UButton
                size="xs"
                color="toast"
                variant="outline"
                class="cursor-pointer"
                @click="toggleSeatSelectionLock"
              >
                {{ gathering.seatSelectionLocked ? 'Unlock seat selection' : 'Lock seat selection' }}
              </UButton>
            </div>
          </div>

          <!-- Per-Guest Seat Allocation Card -->
          <div class="white-bread-container p-4 sm:p-5 space-y-3 shadow-xs">
            <h4 class="font-serif font-bold text-sm text-toast-900 border-b border-bread-200/60 pb-1.5">
              Attending Guests Seat Allocation ({{ seatedCount }}/{{ attendingGuests.length }} Seated)
            </h4>

            <div v-if="attendingGuests.length === 0" class="py-6 text-center text-xs text-muted">
              No guests have RSVP'd as Attending yet. Mark guests as Attending in the Guest List module to assign them seats.
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto p-1">
              <div
                v-for="guest in attendingGuests"
                :key="guest._id"
                class="p-2.5 rounded-lg border border-bread-200 bg-white flex items-center justify-between gap-2 shadow-2xs"
              >
                <div class="min-w-0">
                  <p class="font-semibold text-xs text-toast-900 truncate">{{ guestDisplayName(guest) }}</p>
                  <p class="text-[10px] text-muted truncate">
                    {{ tableFor(guest)?.label || 'Unassigned' }}<span v-if="guest.seatNumber">, Seat {{ guest.seatNumber }}</span>
                    <span v-if="guest.partyName"> · {{ guest.partyName }}</span>
                  </p>
                </div>

                <select
                  class="text-xs rounded-md border border-toast-300 bg-white px-2 py-1 font-medium text-toast-900 focus:ring-1 focus:ring-toast-500 cursor-pointer"
                  :value="seatValue(guest)"
                  @change="onSeatChange(guest, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">Unassigned</option>
                  <optgroup
                    v-for="table in gathering.tables"
                    :key="table._id"
                    :label="table.label"
                  >
                    <option
                      v-for="seat in seatsOf(table)"
                      :key="`${table._id}-${seat.number}`"
                      :value="`${table._id}:${seat.number}`"
                      :disabled="seat.unavailable"
                    >
                      {{ table.label }} · Seat {{ seat.number }}{{ seat.unavailable ? ' (unavailable)' : '' }}
                    </option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          <!-- Visual Table Layout Grid -->
          <div class="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="table in gathering.tables"
              :key="table._id"
              class="white-bread-container p-3.5 space-y-2.5 shadow-xs flex flex-col justify-between"
            >
              <div class="flex items-center justify-between border-b border-bread-200/60 pb-1.5">
                <span class="font-serif font-bold text-sm text-toast-900">{{ table.label }}</span>
                <span class="text-xs text-toast-700">{{ table.capacity }} seats</span>
              </div>

              <!-- Seat List -->
              <div class="space-y-1 text-xs">
                <div
                  v-for="seat in seatsOf(table)"
                  :key="seat.number"
                  class="flex items-center justify-between gap-2 p-1 rounded-md bg-toast-50/50 text-[11px]"
                  data-testid="host-seat"
                >
                  <span class="font-mono text-muted shrink-0">Seat {{ seat.number }}</span>
                  <span
                    class="flex-1 font-medium truncate"
                    :class="guestInSeat(table, seat.number) ? 'text-toast-900 font-semibold' : 'text-gray-400 italic'"
                  >
                    {{
                      guestInSeat(table, seat.number)
                        ? guestDisplayName(guestInSeat(table, seat.number)!)
                        : seat.unavailable ? 'Unavailable' : 'Empty'
                    }}
                  </span>
                  <UButton
                    v-if="!guestInSeat(table, seat.number)"
                    size="2xs"
                    color="neutral"
                    variant="ghost"
                    class="cursor-pointer shrink-0"
                    :aria-label="`${seat.unavailable ? 'Make available' : 'Make unavailable'}: ${table.label}, seat ${seat.number}`"
                    @click="toggleSeat(table, seat)"
                  >
                    {{ seat.unavailable ? 'Make available' : 'Make unavailable' }}
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ================= WORKSPACE MODULE: CHECK-IN & QR ================= -->
        <div v-if="active && section === 'checkin'" class="white-bread-container p-8 text-center space-y-4 shadow-sm border border-toast-600/20">
          <div class="size-16 rounded-full bg-toast-100 text-toast-700 flex items-center justify-center mx-auto shadow-xs">
            <UIcon name="i-lucide-scan-line" class="size-8" />
          </div>
          <div class="space-y-1.5 max-w-md mx-auto">
            <h3 class="text-xl sm:text-2xl font-serif font-bold text-toast-900">Dedicated Check-In & QR Station</h3>
            <p class="text-xs sm:text-sm text-toast-700">
              Live guest attendance, camera pass scanning, and the venue gathering seat finder QR code are available on the dedicated arrival station page.
            </p>
          </div>
          <div class="pt-2">
            <UButton
              :to="`/seating/checkin/${gatheringId}`"
              color="primary"
              size="lg"
              icon="i-lucide-external-link"
              variant="solid"
            >
              Open Live Check-In Station
            </UButton>
          </div>
        </div>
      </section>
    </UPageGrid>

    <EventQuestionsModal
      v-if="gathering"
      v-model:open="isQuestionsOpen"
      :initial-questions="gathering.questions ?? []"
      :save="saveQuestions"
    />
  </div>
</template>

<style scoped>
/* Responsive Font Sizing Clamp Variables (Inherited from EventDashboard v2) */
.jam-dashboard-root {
  --dash-font-container-header: clamp(1.15rem, 1rem + 0.6vw, 1.625rem);
  --dash-font-item-header: clamp(0.6875rem, 0.625rem + 0.25vw, 0.875rem);
  --dash-font-desc: clamp(0.5625rem, 0.5rem + 0.2vw, 0.75rem);
  --dash-font-top-value: clamp(1.35rem, 1.15rem + 0.9vw, 2.25rem);
}

.dash-container-header {
  font-size: var(--dash-font-container-header);
  line-height: 1.2;
}

.dash-item-header {
  font-size: var(--dash-font-item-header);
  line-height: 1.2;
}

.dash-desc-text {
  font-size: var(--dash-font-desc);
  line-height: 1.25;
}

.dash-top-value {
  font-size: var(--dash-font-top-value);
  line-height: 1.1;
}
</style>
