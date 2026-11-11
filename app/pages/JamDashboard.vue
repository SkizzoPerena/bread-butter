<script setup lang="ts">
import type { GatheringRecord, RsvpStatus, SeatingGuestRecord } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import { currentOriginPath } from '~/utils/seatingQr'
import JamBulkInvite from '~/components/JamBulkInvite.vue'

definePageMeta({ layout: 'event-navbar', middleware: 'seating-enabled' })

const route = useRoute()
const toast = useToast()
const { isUiOnlyMode } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { startPageTransition, followLink, finishPageTransition } = usePageTransition()
const seating = useSeating()

const gatheringId = computed(() => String(route.params.gatheringId || route.query.gatheringId || ''))
const gathering = ref<GatheringRecord | null>(null)
const guests = ref<SeatingGuestRecord[]>([])
const loading = ref(true)
const saving = ref(false)
const exportingCsv = ref(false)

const isCopiedPasscode = ref(false)
const isAddGuestModalOpen = ref(false)
const isBulkInviteModalOpen = ref(false)

// Add Guest Form inside modal
const guestForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  partyName: '',
  phone: '',
  rsvpStatus: 'PENDING' as RsvpStatus,
})

const active = computed(() => gathering.value?.status === 'ACTIVE' || isUiOnlyMode.value)
const upgradePath = computed(() => `/user/jam-upgrade/${gatheringId.value}`)
const lookupUrl = computed(() => (gathering.value ? currentOriginPath(`/seat/${gathering.value.publicToken}`) : ''))

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

const daysRemaining = computed(() => {
  if (!gathering.value?.eventDate) return 0
  const eventTime = new Date(gathering.value.eventDate).getTime()
  const now = new Date().getTime()
  const diffTime = eventTime - now
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
})

const goingCount = computed(() => guests.value.filter((guest) => guest.rsvpStatus === 'GOING').length)
const notGoingCount = computed(() => guests.value.filter((guest) => guest.rsvpStatus === 'NOT_GOING').length)
const pendingCount = computed(() => guests.value.filter((guest) => !guest.rsvpStatus || guest.rsvpStatus === 'PENDING').length)
const attendingGuests = computed(() => guests.value.filter((guest) => guest.isAttending || guest.rsvpStatus === 'GOING'))
const seatedGuests = computed(() => attendingGuests.value.filter((guest) => guest.tableId && guest.seatNumber))
const seatedCount = computed(() => seatedGuests.value.length)
const unseatedGuestsCount = computed(() => Math.max(0, attendingGuests.value.length - seatedCount.value))

const totalSeatsCapacity = computed(() => {
  if (!gathering.value?.tables) return 0
  return gathering.value.tables.reduce((acc, t) => acc + (t.capacity || 0), 0)
})

const seatedPercent = computed(() => {
  if (!attendingGuests.value.length) return 0
  return Math.min(100, Math.round((seatedCount.value / attendingGuests.value.length) * 100))
})

const rsvpResponseRate = computed(() => {
  if (!guests.value.length) return 0
  const responded = guests.value.filter((g) => g.rsvpStatus && g.rsvpStatus !== 'PENDING').length
  return Math.round((responded / guests.value.length) * 100)
})

const invitationsSentCount = computed(() => {
  return guests.value.filter((g) => Boolean(g.inviteSentAt)).length
})

const hasInvitation = computed(() => {
  const d = gathering.value?.invitationDesign
  if (!d) return false
  if (d.mode === 'IMAGE') return Boolean(d.imageUrl)
  return Boolean(d.headline || d.requestLine || d.imageUrl || gathering.value?.invitationMessage)
})

const repliedGuests = computed(() => {
  return guests.value.filter((g) => g.rsvpStatus === 'GOING' || g.rsvpStatus === 'NOT_GOING')
})

const hasRsvpQuestions = computed(() => {
  return Boolean(gathering.value?.questions && gathering.value.questions.length > 0)
})

const invitationStatusText = computed(() => {
  return hasInvitation.value ? 'Invitation is live' : 'No saved invitation yet'
})

const rsvpQuestionsStatusText = computed(() => {
  return hasRsvpQuestions.value ? 'RSVP questions live' : 'No saved RSVP questions yet'
})


const hasTables = computed(() => {
  return Boolean(gathering.value?.tables && gathering.value.tables.length > 0)
})

const emailCreditsRemaining = computed(() => {
  if (!gathering.value) return 0
  return Math.max(gathering.value.maxGuests - guests.value.length, 0)
})

interface QuickNavItem {
  id: 'guests' | 'invite' | 'rsvp' | 'tables' | 'checkin' | 'settings' | 'view_pass' | 'export_csv' | 'upgrade'
  label: string
  icon: string
  bgClass: string
  hoverClass: string
  ringClass: string
  textClass: string
  badge?: string
}

// Quick navigation styling matching EventDashboard v2 exact palette
const QUICK_NAV_ITEMS = computed<QuickNavItem[]>(() => [
  {
    id: 'guests',
    label: 'Guest List',
    icon: 'i-lucide-users',
    bgClass: 'bg-red-500/10',
    hoverClass: 'hover:bg-red-500/20',
    ringClass: 'ring-1 ring-inset ring-red-500/25',
    textClass: 'text-red-600',
    badge: guests.value.length ? String(guests.value.length) : undefined,
  },
  {
    id: 'invite',
    label: 'Invitation',
    icon: 'i-lucide-mail',
    bgClass: 'bg-blue-500/10',
    hoverClass: 'hover:bg-blue-500/20',
    ringClass: 'ring-1 ring-inset ring-blue-500/25',
    textClass: 'text-blue-600',
    badge: pendingCount.value ? `${pendingCount.value} pend` : undefined,
  },
  {
    id: 'rsvp',
    label: 'RSVP',
    icon: 'i-lucide-clipboard-check',
    bgClass: 'bg-yellow-500/15',
    hoverClass: 'hover:bg-yellow-500/25',
    ringClass: 'ring-1 ring-inset ring-yellow-500/30',
    textClass: 'text-yellow-700',
    badge: goingCount.value ? `${goingCount.value} going` : undefined,
  },
  {
    id: 'tables',
    label: 'Tables & Seats',
    icon: 'i-lucide-layout-grid',
    bgClass: 'bg-emerald-500/10',
    hoverClass: 'hover:bg-emerald-500/20',
    ringClass: 'ring-1 ring-inset ring-emerald-500/25',
    textClass: 'text-emerald-600',
    badge: gathering.value?.tables?.length ? `${gathering.value.tables.length} tbls` : undefined,
  },
  {
    id: 'checkin',
    label: 'Check-in & QR',
    icon: 'i-lucide-qr-code',
    bgClass: 'bg-purple-500/10',
    hoverClass: 'hover:bg-purple-500/20',
    ringClass: 'ring-1 ring-inset ring-purple-500/25',
    textClass: 'text-purple-600',
    badge: gathering.value?.checkedInCount ? `${gathering.value.checkedInCount} in` : undefined,
  },
  {
    id: 'settings',
    label: 'Jam Settings & Plan',
    icon: 'i-lucide-settings',
    bgClass: 'bg-orange-500/10',
    hoverClass: 'hover:bg-orange-500/20',
    ringClass: 'ring-1 ring-inset ring-orange-500/25',
    textClass: 'text-orange-600',
    badge: gathering.value?.packageName,
  },
  {
    id: 'view_pass',
    label: 'Guest View',
    icon: 'i-lucide-external-link',
    bgClass: 'bg-teal-500/10',
    hoverClass: 'hover:bg-teal-500/20',
    ringClass: 'ring-1 ring-inset ring-teal-500/25',
    textClass: 'text-teal-600',
  },
  {
    id: 'export_csv',
    label: 'Export Seat Plan',
    icon: 'i-lucide-download',
    bgClass: 'bg-amber-500/10',
    hoverClass: 'hover:bg-amber-500/20',
    ringClass: 'ring-1 ring-inset ring-amber-500/25',
    textClass: 'text-amber-700',
  },
])

const DESKTOP_ONLY_ITEMS = ['tables', 'invite']
const isDesktopOnlyModalOpen = ref(false)
const selectedDesktopOnlyFeature = ref<QuickNavItem | null>(null)

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
}

function navigateToFeature(id: string) {
  if (id === 'guests') {
    startPageTransition(`/jam/guests/${gatheringId.value}`)
  } else if (id === 'invite') {
    startPageTransition(`/jam/invitation/${gatheringId.value}`)
  } else if (id === 'rsvp') {
    startPageTransition(`/jam/rsvps/${gatheringId.value}`)
  } else if (id === 'tables') {
    startPageTransition(`/jam/tables/${gatheringId.value}`)
  } else if (id === 'checkin') {
    startPageTransition(`/jam/checkin/${gatheringId.value}`)
  } else if (id === 'settings') {
    startPageTransition(`/jam/settings/${gatheringId.value}`)
  } else if (id === 'view_pass') {
    if (lookupUrl.value) {
      window.open(lookupUrl.value, '_blank')
    }
  } else if (id === 'export_csv') {
    downloadGuests()
  }
}

function handleFeatureAccess(id: 'tables' | 'invite') {
  if (isMobileViewport()) {
    const item = QUICK_NAV_ITEMS.value.find((i) => i.id === id) || ({
      id,
      label: id === 'tables' ? 'Tables & Seats' : 'Invitation',
      icon: id === 'tables' ? 'i-lucide-layout-grid' : 'i-lucide-mail',
      bgClass: '',
      hoverClass: '',
      ringClass: '',
      textClass: '',
    } as QuickNavItem)
    selectedDesktopOnlyFeature.value = item
    isDesktopOnlyModalOpen.value = true
    return
  }
  navigateToFeature(id)
}

function onQuickNavItemClick(item: QuickNavItem) {
  if (isMobileViewport() && DESKTOP_ONLY_ITEMS.includes(item.id)) {
    selectedDesktopOnlyFeature.value = item
    isDesktopOnlyModalOpen.value = true
    return
  }

  navigateToFeature(item.id)
}

function navigateFromModal(item: QuickNavItem | null) {
  if (!item) return
  navigateToFeature(item.id)
}

// Mobile View Switcher Tab (Quick Launch vs Jam Overview, matching EventDashboard v2)
const activeMobileTab = ref<'launcher' | 'overview'>('launcher')

function getQuickNavSolidBgClass(item: QuickNavItem): string {
  const map: Record<string, string> = {
    'Guest List': 'bg-red-500',
    Invitation: 'bg-blue-500',
    Invitations: 'bg-blue-500',
    RSVP: 'bg-yellow-500',
    'RSVP & Questions': 'bg-yellow-500',
    'Tables & Seats': 'bg-emerald-500',
    'Check-in & QR': 'bg-purple-500',
    'Jam Settings & Plan': 'bg-orange-500',
    'Guest View': 'bg-teal-500',
    'Export Seat Plan': 'bg-amber-600',
  }
  return map[item.label] || 'bg-jam-600'
}

async function load() {
  if (!gatheringId.value) {
    loading.value = false
    finishPageTransition()
    return
  }
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
    toast.add({ title: 'Could not load seating plan', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
    finishPageTransition()
  }
}

onMounted(load)

async function copyPasscode() {
  if (!gathering.value?.passcode) return
  try {
    await navigator.clipboard.writeText(gathering.value.passcode)
    isCopiedPasscode.value = true
    toast.add({ title: 'Passcode copied to clipboard', color: 'success' })
    setTimeout(() => {
      isCopiedPasscode.value = false
    }, 2000)
  } catch {
    toast.add({ title: 'Could not copy passcode', color: 'warning' })
  }
}

async function addGuest() {
  if (!gatheringId.value) return
  saving.value = true
  try {
    await seating.createGuest(gatheringId.value, {
      firstName: guestForm.firstName.trim(),
      lastName: guestForm.lastName.trim(),
      email: guestForm.email.trim(),
      partyName: guestForm.partyName.trim() || undefined,
    })
    toast.add({ title: 'Guest added', color: 'success' })
    guestForm.firstName = ''
    guestForm.lastName = ''
    guestForm.email = ''
    guestForm.partyName = ''
    guestForm.phone = ''
    guestForm.rsvpStatus = 'PENDING'
    isAddGuestModalOpen.value = false
    await load()
  } catch (error) {
    toast.add({ title: 'Could not add guest', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

// The server builds the CSV, so this matches every other export: table number and name, seat,
// question answers, and cells that can't start a spreadsheet formula.
async function downloadGuests() {
  if (!gatheringId.value || exportingCsv.value) return
  exportingCsv.value = true
  try {
    const blob = await seating.exportGuests(gatheringId.value)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `jam-seat-plan-${gathering.value?.name || 'jam'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.add({ title: 'Seat plan downloaded', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not export seat plan', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    exportingCsv.value = false
  }
}
</script>

<template>
  <div class="jam-dashboard-root h-[calc(100vh-64px)] flex flex-col w-full max-w-full overflow-x-hidden bg-bread-100 overflow-y-auto lg:overflow-hidden select-none">
    <!-- Top Teleport Header in Event Navbar -->
    <ClientOnly>
      <Teleport to="#event-navbar-center">
        <div v-if="gathering" class="flex items-center gap-2 max-w-full min-w-0">
          <span class="font-serif font-bold text-jam-900 text-sm sm:text-base truncate max-w-40 sm:max-w-64">
            {{ gathering.name }}
          </span>
          <UBadge color="warning" variant="solid" size="xs" class="text-black font-semibold shrink-0">
            {{ gathering.packageName }}
          </UBadge>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- Loading Skeleton / Card -->
    <div v-if="loading" class="p-6 max-w-4xl mx-auto w-full my-auto">
      <div class="white-bread-container p-8 text-center space-y-3">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-jam-600 mx-auto" />
        <p class="font-serif text-lg font-bold text-jam-800">Loading Jam dashboard...</p>
      </div>
    </div>

    <template v-else-if="gathering">
      <!-- ================= MOBILE SUB-NAV (< md / < 768px): Modeled after Event Dashboard v2 ================= -->
      <div class="md:hidden px-4 pt-3 pb-1 flex items-center justify-between shrink-0 bg-bread-400">
        <div
          class="flex items-center gap-1.5 p-1 bg-white/70 backdrop-blur-xs rounded-xl w-full max-w-xs mx-auto border border-bread-300/40 shadow-xs"
        >
          <button
            type="button"
            class="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer"
            :class="activeMobileTab === 'launcher' ? 'bg-jam-500 text-white shadow-xs' : 'text-jam-800 hover:text-jam-950'"
            @click="activeMobileTab = 'launcher'"
          >
            Quick Launch
          </button>
          <button
            type="button"
            class="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer"
            :class="activeMobileTab === 'overview' ? 'bg-jam-500 text-white shadow-xs' : 'text-jam-800 hover:text-jam-950'"
            @click="activeMobileTab = 'overview'"
          >
            Jam Overview
          </button>
        </div>
      </div>

      <!-- ================= MOBILE LAUNCHER (< md when tab is launcher): Circular Icon Grid ================= -->
      <div
        v-if="activeMobileTab === 'launcher'"
        class="md:hidden white-bread-container h-full flex flex-col flex-1 overflow-hidden m-3 mt-1.5 shadow-sm"
        style="border-radius: 1.25rem;"
      >
        <div class="flex flex-1 items-center justify-center min-h-0 py-6 px-4 w-full">
          <div
            class="grid grid-cols-3 gap-x-6 sm:gap-x-8 gap-y-7 sm:gap-y-8 max-w-76 sm:max-w-88 mx-auto w-full items-center justify-items-center"
          >
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
                  class="size-15 sm:size-17 flex items-center justify-center rounded-full transition-all duration-200 group-focus-visible:ring-2 aspect-square shrink-0 shadow-md group-hover:scale-105 group-active:scale-95"
                  :class="getQuickNavSolidBgClass(item)"
                >
                  <UIcon :name="item.icon" class="size-7.5 sm:size-8.5 text-white shrink-0" />
                </div>
              </div>
              <div class="font-semibold mt-2 text-center text-xs sm:text-sm text-jam-900 leading-tight max-w-24 sm:max-w-28 truncate">
                {{ item.label }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Page Grid Layout: 3:1 split matching EventDashboard v2 (Workspace on LEFT, Quick Nav on RIGHT) -->
      <UPageGrid
        class="grid-cols-1 lg:grid-cols-4 gap-0 w-full max-w-full min-w-0 flex-1 lg:h-full lg:overflow-hidden items-stretch"
        :class="activeMobileTab === 'launcher' ? 'hidden md:grid' : 'grid'"
      >
      <!-- ================= LEFT DIVISION: col-span-3 (Workspace Area: Overview & 2x2 Grid) ================= -->
      <section
        class="lg:col-span-3 p-2.5 sm:p-3 lg:p-3.5 pb-8 sm:pb-6 lg:pb-3.5 flex flex-col gap-2.5 sm:gap-3 bg-jam-50/20 w-full max-w-full min-w-0 h-full overflow-y-auto lg:overflow-hidden lg:justify-between"
      >
        <!-- 1. Topmost Container: 3 Metric Groups (Days, Confirmed Guests, Seating Assignment) -->
        <div class="white-bread-container p-2.5 sm:p-3 shadow-xs rounded-xl shrink-0 w-full max-w-full min-w-0 overflow-hidden">
          <div
            class="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 sm:divide-x divide-bread-200/60 w-full min-w-0"
          >
            <!-- Column 1: Days to Gathering -->
            <div class="space-y-0.5 pt-1 sm:pt-0 sm:pr-2.5 min-w-0 overflow-hidden">
              <div class="dash-item-header flex items-center gap-1.5 text-jam-700 font-semibold min-w-0">
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
            <div class="space-y-0.5 pt-1 sm:pt-0 pl-2 sm:pl-0 sm:px-2.5 border-l sm:border-l-0 border-bread-200/60 min-w-0 overflow-hidden">
              <div class="dash-item-header flex items-center gap-1.5 text-jam-700 font-semibold min-w-0">
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

            <!-- Column 3: Seating Completion (col-span-2) -->
            <div class="space-y-0.5 pt-2 sm:pt-0 sm:pl-2.5 col-span-2 border-t sm:border-t-0 border-bread-200/60 flex flex-col justify-between min-w-0 overflow-hidden">
              <div class="dash-item-header flex items-center gap-1.5 text-jam-700 font-semibold min-w-0">
                <span class="truncate">Seats Assigned</span>
                <UIcon name="i-lucide-layout-grid" class="size-3.5 text-green-500 shrink-0" />
              </div>
              <div class="w-full py-0">
                <UProgress :model-value="seatedPercent" color="success" size="xs" class="w-full" />
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
          class="white-bread-container p-5 text-center space-y-3 w-full max-w-lg mx-auto my-auto shadow-sm border border-amber-200/80 bg-amber-50/40 shrink-0 rounded-xl overflow-hidden"
        >
          <div class="size-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <UIcon name="i-lucide-lock" class="size-6" />
          </div>
          <div class="space-y-1">
            <h2 class="text-xl font-serif font-bold text-jam-900">Seating Workspace Locked</h2>
            <p class="text-xs text-jam-700 leading-relaxed">
              Complete payment for your <strong>{{ gathering.packageName }}</strong> plan to unlock guests, tables, auto-seating, and digital check-in.
            </p>
          </div>
          <UButton
            :to="{ path: '/user/seating-payment', query: { gatheringId: gathering._id } }"
            color="jam"
            size="sm"
            icon="i-lucide-credit-card"
            variant="solid"
            class="bg-jam-800 hover:bg-jam-900 text-white font-bold py-2 px-4 rounded-lg shadow-sm cursor-pointer"
            @click="followLink($event, { path: '/user/seating-payment', query: { gatheringId: gathering._id } })"
          >
            Complete Payment Now
          </UButton>
        </div>

                <!-- ================= 3-COLUMN WORKSPACE GRID (ROW 1: GUESTS (COLSPAN 2), ROW 2: TABLES (COLSPAN 2), COL 3: INVITE & SETTINGS) ================= -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-2 gap-2.5 sm:gap-3 w-full max-w-full min-w-0 lg:flex-1 lg:min-h-0 items-stretch">
          <!-- ---------------- ROW 1, COL 1-2: GUEST LIST (COLSPAN 2) ---------------- -->
          <div class="white-bread-container p-3 sm:p-3.5 flex flex-col justify-between shadow-xs border border-bread-200/90 rounded-2xl col-span-1 lg:col-span-2 lg:row-start-1 w-full max-w-full min-w-0 overflow-hidden h-auto lg:h-full lg:min-h-0">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-bread-200/60 pb-2 mb-2.5 shrink-0 min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <div class="size-7.5 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center shadow-2xs shrink-0">
                  <UIcon name="i-lucide-users" class="size-4" />
                </div>
                <div class="min-w-0">
                  <h3 class="font-serif font-bold text-sm sm:text-base text-jam-900 leading-tight truncate">Guest List</h3>
                  <p class="text-[10.5px] text-muted truncate">Attendance & headcount</p>
                </div>
              </div>
              <UBadge color="primary" variant="subtle" size="xs" class="font-semibold px-2 py-0.5 shrink-0">
                {{ guests.length }} / {{ gathering.maxGuests }}
              </UBadge>
            </div>

            <!-- 2-Column Content: Col 1 = 4 Statuses & Buttons, Col 2 = Recent Guest Replies -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 lg:min-h-0 items-stretch w-full min-w-0">
              <!-- COLUMN 1: 4 Guest Statuses (2x2 Grid) & Container Buttons -->
              <div class="flex flex-col justify-between h-auto lg:h-full lg:min-h-0 space-y-2 w-full min-w-0">
                <!-- 4 Guest Statuses (2x2 Grid) -->
                <div class="grid grid-cols-2 gap-1.5 text-xs w-full min-w-0">
                  <div class="bg-jam-50/80 p-2 rounded-xl border border-bread-200/60 min-w-0 overflow-hidden">
                    <span class="text-[9.5px] text-muted block uppercase font-semibold truncate">Attending / Going</span>
                    <span class="font-bold font-serif text-base text-emerald-600 truncate block">{{ goingCount }}</span>
                  </div>
                  <div class="bg-jam-50/80 p-2 rounded-xl border border-bread-200/60 min-w-0 overflow-hidden">
                    <span class="text-[9.5px] text-muted block uppercase font-semibold truncate">Awaiting RSVP</span>
                    <span class="font-bold font-serif text-base text-amber-600 truncate block">{{ pendingCount }}</span>
                  </div>
                  <div class="bg-jam-50/80 p-2 rounded-xl border border-bread-200/60 min-w-0 overflow-hidden">
                    <span class="text-[9.5px] text-muted block uppercase font-semibold truncate">Declined</span>
                    <span class="font-bold font-serif text-base text-rose-600 truncate block">{{ notGoingCount }}</span>
                  </div>
                  <div class="bg-jam-50/80 p-2 rounded-xl border border-bread-200/60 min-w-0 overflow-hidden">
                    <span class="text-[9.5px] text-muted block uppercase font-semibold truncate">Seats Assigned</span>
                    <span class="font-bold font-serif text-base text-blue-600 truncate block">{{ seatedCount }}</span>
                  </div>
                </div>

                <!-- Column 1 Buttons: Base Nuxt UI UButton with toast color & variants -->
                <div class="space-y-1.5 pt-1 border-t border-bread-200/60 shrink-0 w-full min-w-0">
                  <div class="grid grid-cols-2 gap-1.5 w-full min-w-0">
                    <UButton
                      color="jam"
                      variant="soft"
                      size="xs"
                      icon="i-lucide-user-plus"
                      block
                      @click="isAddGuestModalOpen = true"
                    >
                      Add Guest
                    </UButton>
                    <UButton
                      color="jam"
                      variant="outline"
                      size="xs"
                      icon="i-lucide-mail"
                      block
                      @click="isBulkInviteModalOpen = true"
                    >
                      Bulk Invite
                    </UButton>
                  </div>
                  <UButton
                    :to="`/jam/invitation/${gatheringId}`"
                    color="jam"
                    variant="solid"
                    size="xs"
                    icon="i-lucide-arrow-right"
                    trailing
                    block
                    @click.prevent="startPageTransition(`/jam/guests/${gatheringId}`)"
                  >
                    Open Guest List
                  </UButton>
                </div>
              </div>

              <!-- COLUMN 2: Recent Guest Replies Only -->
              <div class="flex flex-col justify-between h-auto lg:h-full lg:min-h-0 bg-jam-50/40 p-2 sm:p-2.5 rounded-xl border border-bread-200/60 space-y-2 w-full min-w-0 overflow-hidden">
                <div class="flex items-center justify-between text-[11px] font-semibold text-jam-700 pb-0.5 border-b border-bread-200/50 shrink-0 min-w-0">
                  <span class="flex items-center gap-1.5 min-w-0 truncate">
                    <UIcon name="i-lucide-message-square-check" class="size-3.5 text-emerald-600 shrink-0" />
                    <span class="truncate">Recent Guest Replies</span>
                  </span>
                  <span class="text-[10px] text-muted font-normal shrink-0 pl-1">
                    {{ repliedGuests.length }} of {{ guests.length }} ({{ rsvpResponseRate }}%)
                  </span>
                </div>

                <!-- Replied Guests Display (Without ScrollArea - fits container) -->
                <div v-if="repliedGuests.length" class="flex flex-col gap-1.5 flex-1 lg:min-h-0 justify-around w-full min-w-0">
                  <div
                    v-for="guest in repliedGuests.slice(0, 2)"
                    :key="guest._id"
                    class="p-2 bg-white/90 hover:bg-white rounded-lg border border-bread-200/70 flex flex-col justify-between shadow-2xs transition-colors w-full min-w-0 overflow-hidden"
                  >
                    <div class="flex items-center justify-between gap-1 mb-0.5 min-w-0">
                      <span class="font-bold text-xs text-jam-900 truncate flex-1 min-w-0">
                        {{ guest.firstName }} {{ guest.lastName }}
                      </span>
                      <UBadge
                        :color="guest.rsvpStatus === 'GOING' ? 'success' : 'error'"
                        variant="subtle"
                        size="xs"
                        class="font-semibold text-[9.5px] uppercase shrink-0 px-1.5 py-0.2"
                      >
                        {{ guest.rsvpStatus === 'GOING' ? 'Going' : 'Declined' }}
                      </UBadge>
                    </div>
                    <div class="flex items-center justify-between text-[10px] text-muted pt-0.5 border-t border-bread-100 min-w-0 gap-1">
                      <span class="truncate pr-1 flex-1 min-w-0">{{ guest.partyName || guest.email || 'Guest' }}</span>
                      <span v-if="(guest as any).tableLabel" class="font-mono text-jam-800 font-semibold shrink-0">
                        {{ (guest as any).tableLabel }}
                      </span>
                      <span v-else-if="guest.rsvpStatus === 'GOING'" class="text-amber-600 font-medium shrink-0">
                        Unassigned
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Empty State -->
                <div v-else class="flex-1 flex flex-col items-center justify-center p-3 text-center bg-white/50 rounded-lg border border-dashed border-bread-200/60 w-full min-w-0">
                  <UIcon name="i-lucide-inbox" class="size-4 text-jam-400 mb-1 shrink-0" />
                  <span class="text-xs text-jam-700 font-medium truncate block w-full">No guest RSVP replies yet</span>
                  <span class="text-[10px] text-muted truncate block w-full">Replies will appear here once guests confirm</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ---------------- ROW 2, COL 1-2: TABLES & SEATS (COLSPAN 2) ---------------- -->
          <div class="white-bread-container p-3 sm:p-3.5 flex flex-col justify-between shadow-xs border border-bread-200/90 rounded-2xl col-span-1 lg:col-span-2 lg:row-start-2 w-full max-w-full min-w-0 overflow-hidden h-auto lg:h-full lg:min-h-0">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-bread-200/60 pb-2 mb-2.5 shrink-0 min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <div class="size-7.5 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-2xs shrink-0">
                  <UIcon name="i-lucide-layout-grid" class="size-4" />
                </div>
                <div class="min-w-0">
                  <h3 class="font-serif font-bold text-sm sm:text-base text-jam-900 leading-tight truncate">Tables & Seats</h3>
                  <p class="text-[10.5px] text-muted truncate">Seating layout & placement</p>
                </div>
              </div>
              <UBadge
                :color="hasTables ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
                class="font-semibold px-2 py-0.5 shrink-0"
              >
                {{ hasTables ? `${gathering.tables.length} tables` : 'No tables' }}
              </UBadge>
            </div>

            <!-- 2-Column Content: Col 1 = All Details & Buttons, Col 2 = Table Layout Overview -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 lg:min-h-0 items-stretch w-full min-w-0">
              <!-- COLUMN 1: All Details (Capacity, Seating Progress, Buttons) -->
              <div class="flex flex-col justify-between h-auto lg:h-full lg:min-h-0 space-y-2 w-full min-w-0">
                <!-- Seating Metrics (2x2 Grid) -->
                <div class="space-y-1.5 w-full min-w-0">
                  <div class="grid grid-cols-2 gap-1.5 text-xs w-full min-w-0">
                    <div class="bg-jam-50/80 p-2 rounded-xl border border-bread-200/60 min-w-0 overflow-hidden">
                      <span class="text-[9.5px] text-muted block uppercase font-semibold truncate">Configured Tables</span>
                      <span class="font-bold font-serif text-base text-jam-900 truncate block">{{ gathering.tables?.length || 0 }}</span>
                    </div>
                    <div class="bg-jam-50/80 p-2 rounded-xl border border-bread-200/60 min-w-0 overflow-hidden">
                      <span class="text-[9.5px] text-muted block uppercase font-semibold truncate">Total Capacity</span>
                      <span class="font-bold font-serif text-base text-jam-900 truncate block">{{ totalSeatsCapacity }} Seats</span>
                    </div>
                  </div>

                  <!-- Seating Completion Progress -->
                  <div class="bg-jam-50/80 p-2 rounded-xl border border-bread-200/60 space-y-1 w-full min-w-0 overflow-hidden">
                    <div class="flex items-center justify-between text-xs min-w-0 gap-1">
                      <span class="text-[9.5px] text-muted uppercase font-semibold truncate">Seated Attendance</span>
                      <span class="font-mono font-bold text-[11px] text-jam-900 shrink-0">
                        {{ seatedCount }} / {{ attendingGuests.length }} ({{ seatedPercent }}%)
                      </span>
                    </div>
                    <UProgress :model-value="seatedPercent" color="success" size="xs" class="w-full" />
                  </div>
                </div>

                <!-- Column 1 Button: Base Nuxt UI UButton with toast color & variants -->
                <div class="pt-1 border-t border-bread-200/60 shrink-0 w-full min-w-0">
                  <UButton
                    :to="`/jam/invitation/${gatheringId}`"
                    color="jam"
                    variant="solid"
                    size="xs"
                    icon="i-lucide-arrow-right"
                    trailing
                    block
                    @click.prevent="handleFeatureAccess('tables')"
                  >
                    {{ hasTables ? 'Open Table & Seat Manager' : 'Setup Tables & Seats' }}
                  </UButton>
                </div>
              </div>

              <!-- COLUMN 2: Table Layout Overview Only -->
              <div class="flex flex-col justify-between h-auto lg:h-full lg:min-h-0 bg-jam-50/40 p-2 sm:p-2.5 rounded-xl border border-bread-200/60 space-y-2 w-full min-w-0 overflow-hidden">
                <div class="flex items-center justify-between text-[11px] font-semibold text-jam-700 pb-0.5 border-b border-bread-200/50 shrink-0 min-w-0">
                  <span class="flex items-center gap-1.5 min-w-0 truncate">
                    <UIcon name="i-lucide-armchair" class="size-3.5 text-jam-600 shrink-0" />
                    <span class="truncate">Table Layout Overview</span>
                  </span>
                  <span class="text-[10px] text-muted font-normal shrink-0 pl-1">
                    {{ gathering.tables?.length || 0 }} {{ (gathering.tables?.length === 1) ? 'table' : 'tables' }}
                  </span>
                </div>

                <!-- Existing Tables Grid (Without ScrollArea - fits container) -->
                <div v-if="hasTables" class="grid grid-cols-2 gap-1.5 flex-1 lg:min-h-0 content-start w-full min-w-0">
                  <div
                    v-for="table in gathering.tables.slice(0, 4)"
                    :key="table._id"
                    class="p-2 bg-white/90 hover:bg-white rounded-lg border border-bread-200/70 flex flex-col justify-between shadow-2xs transition-colors w-full min-w-0 overflow-hidden"
                  >
                    <div class="flex items-center justify-between gap-1 mb-0.5 min-w-0">
                      <div class="flex items-center gap-1.5 min-w-0 flex-1">
                        <UIcon
                          name="i-lucide-circle"
                          class="size-3 text-jam-500 shrink-0"
                        />
                        <span class="font-bold text-xs text-jam-900 truncate flex-1 min-w-0">
                          {{ table.label || `Table ${table.sortOrder + 1}` }}
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center justify-between text-[10px] text-muted pt-0.5 border-t border-bread-100 min-w-0 gap-1">
                      <span class="truncate">Occupancy</span>
                      <span class="font-mono text-jam-800 font-bold shrink-0">
                        {{ (table.seats || []).filter(s => s.guest).length }} / {{ table.capacity }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Empty State -->
                <div v-else class="flex-1 flex flex-col items-center justify-center p-3 text-center bg-white/50 rounded-lg border border-dashed border-bread-200/60 w-full min-w-0">
                  <UIcon name="i-lucide-layout-grid" class="size-4 text-jam-400 mb-1 shrink-0" />
                  <span class="text-xs text-jam-700 font-medium truncate block w-full">No tables arranged yet</span>
                  <span class="text-[10px] text-muted truncate block w-full">Configure table shapes and capacities for seating</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ---------------- COLUMN 3: INVITATIONS + JAM SETTINGS & PLAN (SHARED COLUMN) ---------------- -->
          <div class="col-span-1 lg:col-start-3 lg:row-start-1 lg:row-span-2 flex flex-col gap-2.5 sm:gap-3 w-full max-w-full min-w-0 h-auto lg:h-full lg:min-h-0 lg:justify-between">
            <!-- 3A: INVITATION CONTAINER -->
            <div class="white-bread-container p-3 sm:p-3.5 flex flex-col justify-between shadow-xs border border-bread-200/90 rounded-2xl w-full max-w-full min-w-0 overflow-hidden h-auto lg:h-full lg:flex-1 lg:min-h-0">
              <div class="space-y-2 lg:min-h-0 flex-1 flex flex-col justify-between w-full min-w-0">
                <!-- Header -->
                <div class="flex items-center justify-between border-b border-bread-200/60 pb-1.5 min-w-0">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="size-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-2xs shrink-0">
                      <UIcon name="i-lucide-mail" class="size-4" />
                    </div>
                    <div class="min-w-0">
                      <h3 class="font-serif font-bold text-sm sm:text-base text-jam-900 leading-tight truncate">Invitation</h3>
                      <p class="text-[10px] text-muted truncate">Stationery & RSVP</p>
                    </div>
                  </div>
                  <UBadge
                    :color="hasInvitation ? 'success' : 'neutral'"
                    variant="subtle"
                    size="xs"
                    class="font-semibold px-2 py-0.5 shrink-0"
                  >
                    {{ hasInvitation ? 'Live' : 'Draft' }}
                  </UBadge>
                </div>

                <!-- Metrics: Invitation Status & RSVP Questions Status & Sent -->
                <div class="space-y-1.5 w-full min-w-0">
                  <!-- 1. Invitation Status -->
                  <div class="p-2 rounded-xl border border-bread-200/60 bg-jam-50/80 flex items-center justify-between text-xs min-w-0 gap-1 overflow-hidden">
                    <span class="text-[10px] text-muted uppercase font-semibold truncate">Invitation</span>
                    <div class="flex items-center gap-1.5 font-bold text-[11px] shrink-0" :class="hasInvitation ? 'text-emerald-700' : 'text-amber-700'">
                      <UIcon :name="hasInvitation ? 'i-lucide-check-circle' : 'i-lucide-clock'" class="size-3.5 shrink-0" />
                      <span class="truncate">{{ invitationStatusText }}</span>
                    </div>
                  </div>

                  <!-- 2. RSVP Questions Status -->
                  <div class="p-2 rounded-xl border border-bread-200/60 bg-jam-50/80 flex items-center justify-between text-xs min-w-0 gap-1 overflow-hidden">
                    <span class="text-[10px] text-muted uppercase font-semibold truncate">RSVP Questions</span>
                    <div class="flex items-center gap-1.5 font-bold text-[11px] shrink-0" :class="hasRsvpQuestions ? 'text-emerald-700' : 'text-amber-700'">
                      <UIcon :name="hasRsvpQuestions ? 'i-lucide-check-circle' : 'i-lucide-help-circle'" class="size-3.5 shrink-0" />
                      <span class="truncate">{{ rsvpQuestionsStatusText }}</span>
                    </div>
                  </div>

                  <!-- 3. Sent Progress Bar -->
                  <div class="p-2 rounded-xl border border-bread-200/60 bg-jam-50/80 space-y-1 w-full min-w-0 overflow-hidden">
                    <div class="flex items-center justify-between text-xs min-w-0 gap-1">
                      <span class="text-[10px] text-muted uppercase font-semibold truncate">Sent to Guests</span>
                      <span class="font-bold text-jam-900 font-mono text-[11px] shrink-0">
                        {{ invitationsSentCount }} / {{ guests.length }}
                      </span>
                    </div>
                    <UProgress
                      :model-value="guests.length ? (invitationsSentCount / guests.length) * 100 : 0"
                      color="primary"
                      size="xs"
                      class="w-full"
                    />
                  </div>
                </div>

                <!-- Action Buttons: Base Nuxt UI UButton with toast color & variants -->
                <div class="space-y-1.5 pt-1.5 border-t border-bread-200/60 shrink-0 w-full min-w-0">
                  <UButton
                    color="jam"
                    variant="solid"
                    size="xs"
                    icon="i-lucide-clipboard-check"
                    block
                    @click.prevent="startPageTransition(`/jam/rsvps/${gatheringId}`)"
                  >
                    Check Responses
                  </UButton>
                  <div class="grid grid-cols-2 gap-1.5 w-full min-w-0">
                    <UButton
                      color="jam"
                      variant="soft"
                      size="xs"
                      icon="i-lucide-pencil"
                      block
                      @click.prevent="handleFeatureAccess('invite')"
                    >
                      {{ hasInvitation ? 'Edit Design' : 'Create Design' }}
                    </UButton>
                    <UButton
                      color="jam"
                      variant="outline"
                      size="xs"
                      icon="i-lucide-send"
                      block
                      @click="isBulkInviteModalOpen = true"
                    >
                      Mass Invite
                    </UButton>
                  </div>
                </div>
              </div>
            </div>

            <!-- 3B: JAM SETTINGS & PLAN CONTAINER -->
            <div class="white-bread-container p-3 sm:p-3.5 flex flex-col justify-between shadow-xs border border-bread-200/90 rounded-2xl w-full max-w-full min-w-0 overflow-hidden h-auto lg:h-full lg:flex-1 lg:min-h-0">
              <div class="space-y-2 lg:min-h-0 flex-1 flex flex-col justify-between w-full min-w-0">
                <!-- Header -->
                <div class="flex items-center justify-between border-b border-bread-200/60 pb-1.5 min-w-0">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="size-7 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shadow-2xs shrink-0">
                      <UIcon name="i-lucide-settings" class="size-4" />
                    </div>
                    <div class="min-w-0">
                      <h3 class="font-serif font-bold text-sm sm:text-base text-jam-900 leading-tight truncate">Jam Settings & Plan</h3>
                      <p class="text-[10px] text-muted truncate">Passcode, capacity & plan</p>
                    </div>
                  </div>
                  <UBadge color="warning" variant="solid" size="xs" class="text-black font-semibold px-2 py-0.5 shrink-0">
                    {{ gathering.packageName }}
                  </UBadge>
                </div>

                <!-- Seating Capacity, Passcode & Email Credits -->
                <div class="space-y-1.5 w-full min-w-0">
                  <!-- Seating Capacity & Passcode in 2 columns -->
                  <div class="grid grid-cols-2 gap-1.5 text-xs w-full min-w-0">
                    <!-- 1. Seating Capacity -->
                    <div class="bg-jam-50/80 p-2 rounded-xl border border-bread-200/60 space-y-0.5 min-w-0 overflow-hidden">
                      <span class="text-[9px] text-muted block uppercase font-semibold truncate">Seating Capacity</span>
                      <div class="flex items-baseline justify-between min-w-0 gap-1">
                        <span class="font-serif font-bold text-sm text-jam-900 truncate">
                          {{ totalSeatsCapacity }} Seats
                        </span>
                        <span class="text-[9.5px] text-jam-600 font-medium font-mono shrink-0">
                          {{ gathering.tables?.length || 0 }} tbls
                        </span>
                      </div>
                    </div>

                    <!-- 2. Passcode with Copy -->
                    <div class="bg-jam-50/80 p-2 rounded-xl border border-bread-200/60 flex items-center justify-between gap-1 min-w-0 overflow-hidden">
                      <div class="min-w-0 flex-1">
                        <span class="text-[9px] text-muted block uppercase font-semibold truncate">Passcode</span>
                        <span class="font-mono font-bold text-xs text-jam-900 truncate block">
                          {{ gathering.passcode || 'Not set' }}
                        </span>
                      </div>
                      <UButton
                        size="xs"
                        color="jam"
                        variant="outline"
                        :icon="isCopiedPasscode ? 'i-lucide-check' : 'i-lucide-copy'"
                        class="shrink-0 text-[10px] px-1.5 py-0.5"
                        :title="isCopiedPasscode ? 'Copied' : 'Copy passcode'"
                        @click="copyPasscode"
                      >
                        {{ isCopiedPasscode ? 'Copied' : 'Copy' }}
                      </UButton>
                    </div>
                  </div>

                  <!-- 3. Email Credits Meter -->
                  <div class="bg-jam-50/80 p-2 rounded-xl border border-bread-200/60 space-y-0.5 w-full min-w-0 overflow-hidden">
                    <div class="flex items-center justify-between text-xs min-w-0 gap-1">
                      <span class="text-[9px] text-muted uppercase font-semibold truncate">Email Credits</span>
                      <span class="font-mono font-bold text-[11px] text-jam-900 shrink-0">
                        {{ emailCreditsRemaining }} / {{ gathering.maxGuests }} Left
                      </span>
                    </div>
                    <UProgress
                      :model-value="gathering.maxGuests ? (emailCreditsRemaining / gathering.maxGuests) * 100 : 0"
                      color="warning"
                      size="xs"
                      class="w-full"
                    />
                  </div>
                </div>

                <!-- Actions: Base Nuxt UI UButton with toast color & variants -->
                <div class="pt-1.5 border-t border-bread-200/60 shrink-0 w-full min-w-0">
                  <div class="grid grid-cols-2 gap-1.5 w-full min-w-0">
                    <UButton
                      color="jam"
                      variant="solid"
                      size="xs"
                      icon="i-lucide-settings"
                      block
                      @click.prevent="startPageTransition(`/jam/settings/${gatheringId}`)"
                    >
                      Settings
                    </UButton>
                    <UButton
                      color="jam"
                      variant="soft"
                      size="xs"
                      icon="i-lucide-arrow-up-circle"
                      block
                      @click.prevent="startPageTransition(`/user/jam-upgrade/${gatheringId}`)"
                    >
                      Upgrade
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================= RIGHT DIVISION: col-span-1 Quick Navigation ================= -->
      <UDashboardPanel
        class="hidden md:flex lg:col-span-1 w-full bg-white border-t lg:border-t-0 lg:border-l border-bread-200/90 shadow-sm flex-col z-20 shrink-0 h-full max-h-[calc(100vh-64px)] min-h-0 overflow-hidden overscroll-none p-3 sm:p-3.5 lg:p-4 select-none"
        :ui="{ root: 'h-full min-h-0 max-h-full flex flex-col justify-center overflow-hidden overscroll-none p-3 sm:p-3.5 lg:p-4' }"
      >
        <div class="my-auto flex flex-col items-center justify-center w-full px-1 sm:px-2">
          <!-- Panel Header matching Event Dashboard v2 -->
          <div class="pb-3 sm:pb-4 flex items-center gap-1.5 shrink-0 text-center justify-center max-w-full min-w-0 border-b border-bread-200/70 w-full">
            <UIcon name="i-lucide-compass" class="size-4 sm:size-5 text-jam-500 shrink-0" />
            <h2 class="dash-container-header font-serif text-jam-500 font-bold leading-tight truncate">
              Quick Navigation
            </h2>
          </div>

          <!-- 2-Column App Launcher Grid Styled after Event Dashboard -->
          <div class="grid grid-cols-2 gap-2.5 sm:gap-3.5 py-3 w-full max-w-60 sm:max-w-68 mx-auto">
            <UButton
              v-for="item in QUICK_NAV_ITEMS"
              :key="item.id"
              variant="ghost"
              class="group relative flex flex-col items-center justify-center w-full aspect-square p-2.5 sm:p-3 rounded-xl shadow-xs transition-all duration-200 active:scale-95 cursor-pointer select-none hover:shadow-sm hover:-translate-y-0.5"
              :class="[item.bgClass, item.ringClass, item.hoverClass, item.textClass]"
              @click="onQuickNavItemClick(item)"
            >
              <span
                v-if="item.badge"
                class="absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-jam-900 text-white shadow-xs z-10 transition-colors"
              >
                {{ item.badge }}
              </span>
              <UIcon
                :name="item.icon"
                class="size-6 sm:size-6.5 shrink-0 mb-1 transition-transform duration-200 group-hover:scale-110"
              />
              <span
                class="text-[11px] sm:text-xs font-semibold leading-tight text-center wrap-break-word line-clamp-2 px-0.5 tracking-tight"
              >
                {{ item.label }}
              </span>
            </UButton>
          </div>
        </div>
      </UDashboardPanel>
    </UPageGrid>
    </template>

    <!-- Quick Add Guest Modal -->
    <UModal v-model:open="isAddGuestModalOpen" title="Add New Guest">
      <template #content>
        <div class="p-5 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-jam-900 mb-1">First Name</label>
              <input
                v-model="guestForm.firstName"
                type="text"
                placeholder="First name"
                class="w-full bg-jam-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-jam-900 focus:outline-none focus:ring-1 focus:ring-jam-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-jam-900 mb-1">Last Name</label>
              <input
                v-model="guestForm.lastName"
                type="text"
                placeholder="Last name"
                class="w-full bg-jam-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-jam-900 focus:outline-none focus:ring-1 focus:ring-jam-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-jam-900 mb-1">Email</label>
            <input
              v-model="guestForm.email"
              type="email"
              placeholder="guest@example.com"
              class="w-full bg-jam-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-jam-900 focus:outline-none focus:ring-1 focus:ring-jam-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-jam-900 mb-1">Party / Group Name</label>
              <input
                v-model="guestForm.partyName"
                type="text"
                placeholder="e.g. Smith Family"
                class="w-full bg-jam-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-jam-900 focus:outline-none focus:ring-1 focus:ring-jam-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-jam-900 mb-1">RSVP Status</label>
              <select
                v-model="guestForm.rsvpStatus"
                class="w-full bg-jam-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-jam-900 focus:outline-none focus:ring-1 focus:ring-jam-500"
              >
                <option value="PENDING">Pending</option>
                <option value="GOING">Going</option>
                <option value="NOT_GOING">Not Going</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-bread-200/60">
            <UButton color="jam" variant="ghost" size="sm" @click="isAddGuestModalOpen = false">
              Cancel
            </UButton>
            <UButton color="jam" variant="solid" size="sm" class="bg-jam-800 hover:bg-jam-900 text-white font-bold" :loading="saving" @click="addGuest">
              Add Guest
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Bulk / Mass Invite Modal -->
    <UModal v-model:open="isBulkInviteModalOpen" title="Send Email Invitations">
      <template #content>
        <div class="p-4 sm:p-5">
          <JamBulkInvite
            :gathering-id="gatheringId"
            @sent="load()"
          />
        </div>
      </template>
    </UModal>

    <!-- Desktop Only Feature Notice Modal (Mobile View - Inherited from EventDashboard v2.vue) -->
    <UModal
      v-model:open="isDesktopOnlyModalOpen"
      :ui="{
        content: 'bread-container max-w-md p-6 space-y-5',
        overlay: 'bg-jam-950/40 backdrop-blur-xs',
      }"
    >
      <template #content>
        <div class="space-y-5 text-jam-900">
          <!-- Header -->
          <div class="space-y-3 text-center">
            <div class="flex justify-between items-start">
              <div class="w-8" />
              <div
                class="w-14 h-14 rounded-full bg-jam-600/10 text-jam-700 flex items-center justify-center mx-auto shadow-xs"
              >
                <UIcon name="i-lucide-monitor" class="size-7 text-jam-700" />
              </div>
              <div class="w-8 flex justify-end">
                <UButton
                  icon="i-lucide-x"
                  variant="link"
                  color="neutral"
                  class="cursor-pointer"
                  @click="isDesktopOnlyModalOpen = false"
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <h3 class="text-xl font-bold font-serif text-jam-900">
                Desktop View Required
              </h3>
              <p class="text-xs sm:text-sm text-jam-800/80 max-w-xs mx-auto leading-relaxed">
                The <span class="font-bold text-jam-900">{{ selectedDesktopOnlyFeature?.label }}</span> feature
                requires a desktop or laptop display due to extensive layouts, design canvases, and data tables that
                cannot be comfortably navigated on mobile screens.
              </p>
            </div>
          </div>

          <!-- Feature Highlight Card -->
          <div class="bg-white/80 border border-jam-300/40 rounded-xl p-3.5 flex items-center gap-3">
            <div
              class="size-10 rounded-full flex items-center justify-center shrink-0 shadow-xs"
              :class="getQuickNavSolidBgClass(selectedDesktopOnlyFeature || { label: '' } as any)"
            >
              <UIcon :name="selectedDesktopOnlyFeature?.icon || 'i-lucide-sparkles'" class="size-5 text-white" />
            </div>
            <div class="text-left flex-1 min-w-0">
              <div class="font-semibold text-sm text-jam-900 truncate">{{ selectedDesktopOnlyFeature?.label }}</div>
              <div class="text-xs text-jam-700/80 leading-tight mt-0.5">
                {{
                  selectedDesktopOnlyFeature?.id === 'invite'
                    ? 'Card layout designer, typography controls & preview'
                    : 'Comprehensive table arrangement, drag-and-drop floor plans & seating matrix'
                }}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="pt-1">
            <UButton
              block
              color="primary"
              size="md"
              class="font-bold shadow-sm bg-jam-600 hover:bg-jam-700 text-white cursor-pointer"
              @click="isDesktopOnlyModalOpen = false"
            >
              Understood
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.jam-dashboard-root {
  height: calc(100vh - 64px);
  overscroll-behavior: none;
}

@media (min-width: 1024px) {
  .jam-dashboard-root {
    max-height: calc(100vh - 64px);
    overflow: hidden;
  }
}

.jam-dashboard-root {
  --dash-font-container-header: clamp(1.1rem, 0.95rem + 0.5vw, 1.55rem);
  --dash-font-item-header: clamp(0.65rem, 0.58rem + 0.2vw, 0.85rem);
  --dash-font-top-value: clamp(1.05rem, 0.95rem + 0.45vw, 1.45rem);
  --dash-font-desc-text: clamp(0.62rem, 0.55rem + 0.16vw, 0.78rem);
}

.dash-container-header {
  font-size: var(--dash-font-container-header);
}

.dash-item-header {
  font-size: var(--dash-font-item-header);
}

.dash-top-value {
  font-size: var(--dash-font-top-value);
}

.dash-desc-text {
  font-size: var(--dash-font-desc-text);
}
</style>
