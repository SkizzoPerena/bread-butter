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
const { startPageTransition, finishPageTransition } = usePageTransition()
const seating = useSeating()

const gatheringId = computed(() => String(route.params.gatheringId || route.query.gatheringId || ''))
const gathering = ref<GatheringRecord | null>(null)
const guests = ref<SeatingGuestRecord[]>([])
const loading = ref(true)
const saving = ref(false)

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

const hasTables = computed(() => {
  return Boolean(gathering.value?.tables && gathering.value.tables.length > 0)
})

const emailCreditsRemaining = computed(() => {
  if (!gathering.value) return 0
  return Math.max(gathering.value.maxGuests - guests.value.length, 0)
})

interface QuickNavItem {
  id: 'guests' | 'invite' | 'tables' | 'checkin' | 'settings' | 'view_pass' | 'export_csv' | 'upgrade'
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
    bgClass: 'bg-orange-500/10',
    hoverClass: 'hover:bg-orange-500/20',
    ringClass: 'ring-1 ring-inset ring-orange-500/25',
    textClass: 'text-orange-600',
    badge: guests.value.length ? String(guests.value.length) : undefined,
  },
  {
    id: 'invite',
    label: 'Invitation',
    icon: 'i-lucide-mail',
    bgClass: 'bg-violet-500/10',
    hoverClass: 'hover:bg-violet-500/20',
    ringClass: 'ring-1 ring-inset ring-violet-500/25',
    textClass: 'text-violet-600',
    badge: pendingCount.value ? `${pendingCount.value} pend` : undefined,
  },
  {
    id: 'rsvp',
    label: 'RSVP',
    icon: 'i-lucide-clipboard-check',
    bgClass: 'bg-teal-500/10',
    hoverClass: 'hover:bg-teal-500/20',
    ringClass: 'ring-1 ring-inset ring-teal-500/25',
    textClass: 'text-teal-600',
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
    bgClass: 'bg-slate-500/10',
    hoverClass: 'hover:bg-slate-500/20',
    ringClass: 'ring-1 ring-inset ring-slate-500/25',
    textClass: 'text-slate-600',
    badge: gathering.value?.packageName,
  },
  {
    id: 'view_pass',
    label: 'Guest View',
    icon: 'i-lucide-external-link',
    bgClass: 'bg-blue-500/10',
    hoverClass: 'hover:bg-blue-500/20',
    ringClass: 'ring-1 ring-inset ring-blue-500/25',
    textClass: 'text-blue-600',
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

function onQuickNavItemClick(item: QuickNavItem) {
  if (item.id === 'guests') {
    startPageTransition(`/jam/guests/${gatheringId.value}`)
    return
  }
  if (item.id === 'invite') {
    startPageTransition(`/jam/invitation/${gatheringId.value}`)
    return
  }
  if (item.id === 'rsvp') {
    startPageTransition(`/jam/rsvps/${gatheringId.value}`)
    return
  }
  if (item.id === 'tables') {
    startPageTransition(`/jam/tables/${gatheringId.value}`)
    return
  }
  if (item.id === 'checkin') {
    startPageTransition(`/jam/checkin/${gatheringId.value}`)
    return
  }
  if (item.id === 'settings') {
    startPageTransition(`/jam/settings/${gatheringId.value}`)
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

function downloadGuests() {
  const headers = ['First Name', 'Last Name', 'Email', 'Party', 'RSVP Status', 'Table', 'Seat', 'Checked In']
  const rows = guests.value.map((g) => [
    `"${g.firstName || ''}"`,
    `"${g.lastName || ''}"`,
    `"${g.email || ''}"`,
    `"${g.partyName || ''}"`,
    `"${g.rsvpStatus || 'PENDING'}"`,
    `"${(g as any).tableLabel || ''}"`,
    `"${g.seatNumber || ''}"`,
    `"${g.checkedInAt ? 'Yes' : 'No'}"`,
  ])
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `${gathering.value?.name || 'jam'}_guests.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <div class="jam-dashboard-root h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] flex flex-col w-full bg-bread-100 overflow-hidden select-none">
    <!-- Top Teleport Header in Event Navbar -->
    <ClientOnly>
      <Teleport to="#event-navbar-center">
        <div v-if="gathering" class="flex items-center gap-2 max-w-full min-w-0">
          <span class="font-serif font-bold text-toast-900 text-sm sm:text-base truncate max-w-40 sm:max-w-64">
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
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-toast-600 mx-auto" />
        <p class="font-serif text-lg font-bold text-toast-800">Loading Jam dashboard...</p>
      </div>
    </div>

    <!-- Main Page Grid Layout: 3:1 split matching EventDashboard v2 (Workspace on LEFT, Quick Nav on RIGHT) -->
    <UPageGrid
      v-else-if="gathering"
      class="grid-cols-1 lg:grid-cols-4 gap-0 w-full flex-1 h-full max-h-[calc(100vh-64px)] min-h-0 overflow-hidden items-stretch"
    >
      <!-- ================= LEFT DIVISION: col-span-3 (Workspace Area: Overview & 2x2 Grid) ================= -->
      <section
        class="lg:col-span-3 p-2.5 sm:p-3 lg:p-3.5 flex flex-col gap-2.5 sm:gap-3 bg-toast-50/20 h-full max-h-[calc(100vh-64px)] min-h-0 overflow-y-auto lg:overflow-hidden justify-between"
      >
        <!-- 1. Topmost Container: 3 Metric Groups (Days, Confirmed Guests, Seating Assignment) -->
        <div class="white-bread-container p-2.5 sm:p-3 shadow-xs rounded-xl shrink-0">
          <div
            class="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 divide-y sm:divide-y-0 sm:divide-x divide-bread-200/60"
          >
            <!-- Column 1: Days to Gathering -->
            <div class="space-y-0.5 pt-1 sm:pt-0 sm:pr-2.5 min-w-0">
              <div class="dash-item-header flex items-center gap-1.5 text-toast-700 font-semibold min-w-0">
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
            <div class="space-y-0.5 pt-1 sm:pt-0 sm:px-2.5 min-w-0">
              <div class="dash-item-header flex items-center gap-1.5 text-toast-700 font-semibold min-w-0">
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
            <div class="space-y-0.5 pt-1 sm:pt-0 sm:pl-2.5 col-span-2 flex flex-col justify-between min-w-0">
              <div class="dash-item-header flex items-center gap-1.5 text-toast-700 font-semibold min-w-0">
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
          class="white-bread-container p-5 text-center space-y-3 max-w-lg mx-auto my-auto shadow-sm border border-amber-200/80 bg-amber-50/40 shrink-0 rounded-xl"
        >
          <div class="size-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <UIcon name="i-lucide-lock" class="size-6" />
          </div>
          <div class="space-y-1">
            <h2 class="text-xl font-serif font-bold text-toast-900">Seating Workspace Locked</h2>
            <p class="text-xs text-toast-700 leading-relaxed">
              Complete payment for your <strong>{{ gathering.packageName }}</strong> plan to unlock guests, tables, auto-seating, and digital check-in.
            </p>
          </div>
          <UButton
            color="toast"
            size="sm"
            icon="i-lucide-credit-card"
            variant="solid"
            class="bg-toast-800 hover:bg-toast-900 text-white font-bold py-2 px-4 rounded-lg shadow-sm cursor-pointer"
            @click.prevent="startPageTransition({ path: '/user/seating-payment', query: { gatheringId: gathering._id } })"
          >
            Complete Payment Now
          </UButton>
        </div>

        <!-- ================= 2x2 NAVIGATION & WORKSPACE GRID (COMPACT & FITS 100VH) ================= -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 w-full flex-1 min-h-0">
          <!-- ---------------- ROW 1 COL 1: GUEST LIST ---------------- -->
          <div class="white-bread-container p-2.5 sm:p-3 lg:p-3.5 flex flex-col justify-between shadow-xs space-y-2 border border-bread-200/90 rounded-xl h-full min-h-0">
            <!-- Header -->
            <div class="space-y-1.5 min-h-0">
              <div class="flex items-center justify-between border-b border-bread-200/60 pb-1.5">
                <div class="flex items-center gap-2">
                  <div class="size-7 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shadow-2xs">
                    <UIcon name="i-lucide-users" class="size-4" />
                  </div>
                  <h3 class="font-serif font-bold text-sm sm:text-base text-toast-900">Guest List</h3>
                </div>
                <UBadge color="primary" variant="subtle" size="xs" class="font-semibold px-2 py-0.5">
                  {{ guests.length }} / {{ gathering.maxGuests }}
                </UBadge>
              </div>

              <!-- Guest List Parameters & Stats -->
              <div class="grid grid-cols-2 gap-1.5 text-xs">
                <div class="bg-toast-50/70 p-1.5 sm:p-2 rounded-lg border border-bread-200/60">
                  <span class="text-[9.5px] text-muted block uppercase font-semibold">Attending / Going</span>
                  <span class="font-bold font-serif text-sm sm:text-base text-emerald-600">{{ goingCount }}</span>
                </div>
                <div class="bg-toast-50/70 p-1.5 sm:p-2 rounded-lg border border-bread-200/60">
                  <span class="text-[9.5px] text-muted block uppercase font-semibold">Awaiting RSVP</span>
                  <span class="font-bold font-serif text-sm sm:text-base text-amber-600">{{ pendingCount }}</span>
                </div>
                <div class="bg-toast-50/70 p-1.5 sm:p-2 rounded-lg border border-bread-200/60">
                  <span class="text-[9.5px] text-muted block uppercase font-semibold">Declined</span>
                  <span class="font-bold font-serif text-sm sm:text-base text-rose-600">{{ notGoingCount }}</span>
                </div>
                <div class="bg-toast-50/70 p-1.5 sm:p-2 rounded-lg border border-bread-200/60">
                  <span class="text-[9.5px] text-muted block uppercase font-semibold">Seats Assigned</span>
                  <span class="font-bold font-serif text-sm sm:text-base text-blue-600">{{ seatedCount }}</span>
                </div>
              </div>
            </div>

            <!-- Action Buttons: High Contrast Toast Styling -->
            <div class="space-y-1.5 pt-1.5 border-t border-bread-200/60">
              <div class="grid grid-cols-2 gap-1.5">
                <UButton
                  color="toast"
                  variant="soft"
                  size="xs"
                  icon="i-lucide-user-plus"
                  block
                  class="w-full bg-toast-100 hover:bg-toast-200 active:bg-toast-300 text-toast-950 border border-toast-300/80 font-bold py-1 px-2 text-xs rounded-lg shadow-2xs cursor-pointer justify-center transition-all"
                  @click="isAddGuestModalOpen = true"
                >
                  Add new guest
                </UButton>
                <UButton
                  color="toast"
                  variant="soft"
                  size="xs"
                  icon="i-lucide-mail"
                  block
                  class="w-full bg-toast-100 hover:bg-toast-200 active:bg-toast-300 text-toast-950 border border-toast-300/80 font-bold py-1 px-2 text-xs rounded-lg shadow-2xs cursor-pointer justify-center transition-all"
                  @click="isBulkInviteModalOpen = true"
                >
                  Bulk Invite
                </UButton>
              </div>
              <UButton
                color="toast"
                variant="solid"
                size="xs"
                icon="i-lucide-arrow-right"
                trailing
                block
                class="w-full bg-toast-800 hover:bg-toast-900 active:bg-toast-950 text-white font-bold py-1 px-3 text-xs rounded-lg shadow-sm cursor-pointer justify-center transition-all"
                @click.prevent="startPageTransition(`/jam/guests/${gatheringId}`)"
              >
                Open Guest List
              </UButton>
            </div>
          </div>

          <!-- ---------------- ROW 1 COL 2: INVITATION ---------------- -->
          <div class="white-bread-container p-2.5 sm:p-3 lg:p-3.5 flex flex-col justify-between shadow-xs space-y-2 border border-bread-200/90 rounded-xl h-full min-h-0">
            <!-- Header -->
            <div class="space-y-1.5 min-h-0">
              <div class="flex items-center justify-between border-b border-bread-200/60 pb-1.5">
                <div class="flex items-center gap-2">
                  <div class="size-7 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center shadow-2xs">
                    <UIcon name="i-lucide-mail" class="size-4" />
                  </div>
                  <h3 class="font-serif font-bold text-sm sm:text-base text-toast-900">Invitation</h3>
                </div>
                <UBadge
                  :color="hasInvitation ? 'success' : 'neutral'"
                  variant="subtle"
                  size="xs"
                  class="font-semibold px-2 py-0.5"
                >
                  {{ hasInvitation ? 'Invitation created' : 'No invitation yet' }}
                </UBadge>
              </div>

              <!-- Status Display -->
              <!-- State A: Invitation NOT created yet -->
              <div v-if="!hasInvitation" class="space-y-2 py-1">
                <p class="text-xs text-toast-700 leading-relaxed font-medium">
                  You don't have an invitation design yet. Choose how you want to create your invitation:
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <UButton
                    color="toast"
                    variant="solid"
                    size="xs"
                    icon="i-lucide-palette"
                    block
                    class="w-full bg-toast-800 hover:bg-toast-900 text-white font-bold py-1 px-2 text-xs rounded-lg shadow-sm cursor-pointer justify-center transition-all"
                    @click.prevent="startPageTransition(`/jam/invitation/${gatheringId}`)"
                  >
                    Invitation Maker
                  </UButton>
                  <UButton
                    color="toast"
                    variant="soft"
                    size="xs"
                    icon="i-lucide-upload"
                    block
                    class="w-full bg-toast-100 hover:bg-toast-200 text-toast-950 border border-toast-300/80 font-bold py-1 px-2 text-xs rounded-lg shadow-2xs cursor-pointer justify-center transition-all"
                    @click.prevent="startPageTransition(`/jam/invitation/${gatheringId}`)"
                  >
                    Upload Invitation
                  </UButton>
                </div>
              </div>

              <!-- State B: Invitation created -->
              <div v-else class="space-y-1.5 pt-0.5">
                <div class="bg-toast-50/70 p-2 sm:p-2.5 rounded-lg border border-bread-200/60 space-y-1">
                  <div class="flex items-center justify-between text-xs sm:text-sm">
                    <span class="font-bold text-toast-800">Invitations Sent</span>
                    <span class="font-bold text-toast-900 font-mono">
                      {{ invitationsSentCount }} / {{ guests.length }}
                    </span>
                  </div>
                  <UProgress
                    :model-value="guests.length ? (invitationsSentCount / guests.length) * 100 : 0"
                    color="primary"
                    size="xs"
                  />
                  <span class="text-[10.5px] text-muted block font-medium">
                    {{ invitationsSentCount }} sent to registered guests
                  </span>
                </div>
              </div>
            </div>

            <!-- Action Buttons for Created State: High Contrast Toast -->
            <div v-if="hasInvitation" class="pt-1.5 border-t border-bread-200/60">
              <div class="grid grid-cols-2 gap-1.5">
                <UButton
                  color="toast"
                  variant="soft"
                  size="xs"
                  icon="i-lucide-pencil"
                  block
                  class="w-full bg-toast-100 hover:bg-toast-200 active:bg-toast-300 text-toast-950 border border-toast-300/80 font-bold py-1 px-2 text-xs rounded-lg shadow-2xs cursor-pointer justify-center transition-all"
                  @click.prevent="startPageTransition(`/jam/invitation/${gatheringId}`)"
                >
                  Edit invitation
                </UButton>
                <UButton
                  color="toast"
                  variant="solid"
                  size="xs"
                  icon="i-lucide-send"
                  block
                  class="w-full bg-toast-800 hover:bg-toast-900 active:bg-toast-950 text-white font-bold py-1 px-2 text-xs rounded-lg shadow-sm cursor-pointer justify-center transition-all"
                  @click="isBulkInviteModalOpen = true"
                >
                  Mass invite
                </UButton>
              </div>
            </div>
          </div>

          <!-- ---------------- ROW 2 COL 1: TABLES & SEATS ---------------- -->
          <div class="white-bread-container p-2.5 sm:p-3 lg:p-3.5 flex flex-col justify-between shadow-xs space-y-2 border border-bread-200/90 rounded-xl h-full min-h-0">
            <!-- Header -->
            <div class="space-y-1.5 min-h-0">
              <div class="flex items-center justify-between border-b border-bread-200/60 pb-1.5">
                <div class="flex items-center gap-2">
                  <div class="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-2xs">
                    <UIcon name="i-lucide-layout-grid" class="size-4" />
                  </div>
                  <h3 class="font-serif font-bold text-sm sm:text-base text-toast-900">Tables & Seats</h3>
                </div>
                <UBadge
                  :color="hasTables ? 'success' : 'neutral'"
                  variant="subtle"
                  size="xs"
                  class="font-semibold px-2 py-0.5"
                >
                  {{ hasTables ? `${gathering.tables.length} tables` : 'No tables yet' }}
                </UBadge>
              </div>

              <!-- State A: No tables arranged yet -->
              <div v-if="!hasTables" class="py-1.5 text-center space-y-2">
                <p class="text-xs text-toast-700 leading-relaxed font-medium">
                  No tables or seat arrangements set up yet. Configure your venue layout to seat attending guests.
                </p>
                <UButton
                  color="toast"
                  variant="solid"
                  size="xs"
                  icon="i-lucide-plus"
                  block
                  class="w-full bg-toast-800 hover:bg-toast-900 active:bg-toast-950 text-white font-bold py-1 px-3 text-xs rounded-lg shadow-sm cursor-pointer justify-center transition-all"
                  @click.prevent="startPageTransition(`/jam/tables/${gatheringId}`)"
                >
                  Setup tables and seats
                </UButton>
              </div>

              <!-- State B: Existing tables instance -->
              <div v-else class="space-y-1.5 pt-0.5 text-xs">
                <div class="grid grid-cols-2 gap-1.5">
                  <div class="bg-toast-50/70 p-1.5 sm:p-2 rounded-lg border border-bread-200/60">
                    <span class="text-[9.5px] text-muted block uppercase font-semibold">Tables Configured</span>
                    <span class="font-bold font-serif text-sm sm:text-base text-toast-900">{{ gathering.tables.length }}</span>
                  </div>
                  <div class="bg-toast-50/70 p-1.5 sm:p-2 rounded-lg border border-bread-200/60">
                    <span class="text-[9.5px] text-muted block uppercase font-semibold">Total Capacity</span>
                    <span class="font-bold font-serif text-sm sm:text-base text-toast-900">{{ totalSeatsCapacity }} Seats</span>
                  </div>
                </div>

                <div class="bg-toast-50/70 p-1.5 sm:p-2 rounded-lg border border-bread-200/60 space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-toast-800 font-semibold">Seating Completion</span>
                    <span class="font-bold text-toast-900 font-mono">{{ seatedPercent }}%</span>
                  </div>
                  <UProgress :model-value="seatedPercent" color="success" size="xs" />
                  <span class="text-[10px] text-muted block truncate font-medium">
                    {{ seatedCount }} of {{ attendingGuests.length }} attending seated · {{ unseatedGuestsCount }} unassigned
                  </span>
                </div>
              </div>
            </div>

            <!-- Action Button: High Contrast Toast -->
            <div v-if="hasTables" class="pt-1.5 border-t border-bread-200/60">
              <UButton
                color="toast"
                variant="solid"
                size="xs"
                icon="i-lucide-arrow-right"
                trailing
                block
                class="w-full bg-toast-800 hover:bg-toast-900 active:bg-toast-950 text-white font-bold py-1 px-3 text-xs rounded-lg shadow-sm cursor-pointer justify-center transition-all"
                @click.prevent="startPageTransition(`/jam/tables/${gatheringId}`)"
              >
                Open table & seat manager
              </UButton>
            </div>
          </div>

          <!-- ---------------- ROW 2 COL 2: JAM SETTINGS ---------------- -->
          <div class="white-bread-container p-2.5 sm:p-3 lg:p-3.5 flex flex-col justify-between shadow-xs space-y-2 border border-bread-200/90 rounded-xl h-full min-h-0">
            <!-- Header & Info -->
            <div class="space-y-1.5 min-h-0">
              <div class="flex items-center justify-between border-b border-bread-200/60 pb-1.5">
                <div class="flex items-center gap-2">
                  <div class="size-7 rounded-lg bg-slate-500/10 text-slate-600 flex items-center justify-center shadow-2xs">
                    <UIcon name="i-lucide-settings" class="size-4" />
                  </div>
                  <h3 class="font-serif font-bold text-sm sm:text-base text-toast-900">Jam Settings & Plan</h3>
                </div>
                <UBadge color="warning" variant="solid" size="xs" class="text-black font-semibold px-2 py-0.5">
                  {{ gathering.packageName }}
                </UBadge>
              </div>

              <!-- Package Tier & Passcode Split -->
              <div class="grid grid-cols-2 gap-1.5 text-xs">
                <!-- Package Tier Info -->
                <div class="bg-toast-50/70 p-1.5 sm:p-2 rounded-lg border border-bread-200/60 space-y-0.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[9.5px] text-muted uppercase font-semibold">Package Tier</span>
                    <span class="text-[9.5px] text-toast-700 font-bold">{{ gathering.maxGuests }} Max</span>
                  </div>
                  <div class="font-serif font-bold text-xs sm:text-sm text-toast-900 truncate">
                    {{ gathering.packageName }}
                  </div>
                </div>

                <!-- Passcode Info with High-Contrast Copy Button -->
                <div class="bg-toast-50/70 p-1.5 sm:p-2 rounded-lg border border-bread-200/60 flex items-center justify-between gap-1">
                  <div class="min-w-0">
                    <span class="text-[9.5px] text-muted block uppercase font-semibold">Passcode</span>
                    <span class="font-mono font-bold text-xs text-toast-900 truncate block">
                      {{ gathering.passcode || 'Not set' }}
                    </span>
                  </div>
                  <UButton
                    size="xs"
                    color="toast"
                    variant="solid"
                    icon="i-lucide-copy"
                    class="bg-toast-800 hover:bg-toast-900 text-white font-bold cursor-pointer shrink-0 rounded-lg shadow-2xs py-1 px-2 text-[11px]"
                    title="Copy passcode"
                    @click="copyPasscode"
                  >
                    {{ isCopiedPasscode ? 'Copied' : 'Copy' }}
                  </UButton>
                </div>
              </div>

              <!-- Email Credits Display -->
              <div class="bg-toast-50/70 p-1.5 sm:p-2 rounded-lg border border-bread-200/60 space-y-1">
                <div class="flex items-center justify-between text-xs sm:text-sm">
                  <span class="font-bold text-toast-800 text-xs">Email Credits</span>
                  <span class="font-bold font-mono text-toast-900 text-xs">
                    {{ emailCreditsRemaining }} Left
                  </span>
                </div>
                <UProgress
                  :model-value="gathering.maxGuests ? (emailCreditsRemaining / gathering.maxGuests) * 100 : 0"
                  color="warning"
                  size="xs"
                />
                <span class="text-[10px] text-muted block truncate font-medium">
                  {{ guests.length }} used of {{ gathering.maxGuests }} plan capacity
                </span>
              </div>
            </div>

            <!-- Action Buttons: Jam settings & Plan details (High Contrast Toast) -->
            <div class="pt-1.5 border-t border-bread-200/60">
              <div class="grid grid-cols-2 gap-1.5">
                <UButton
                  color="toast"
                  variant="solid"
                  size="xs"
                  icon="i-lucide-settings"
                  block
                  class="w-full bg-toast-800 hover:bg-toast-900 active:bg-toast-950 text-white font-bold py-1 px-2 text-xs rounded-lg shadow-sm cursor-pointer justify-center transition-all"
                  @click.prevent="startPageTransition(`/jam/settings/${gatheringId}`)"
                >
                  Settings & Plan
                </UButton>
                <UButton
                  color="toast"
                  variant="soft"
                  size="xs"
                  icon="i-lucide-arrow-up-circle"
                  block
                  class="w-full bg-toast-100 hover:bg-toast-200 active:bg-toast-300 text-toast-950 border border-toast-300/80 font-bold py-1 px-2 text-xs rounded-lg shadow-2xs cursor-pointer justify-center transition-all"
                  @click.prevent="startPageTransition(`/user/jam-upgrade/${gatheringId}`)"
                >
                  Upgrade Plan
                </UButton>
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
            <UIcon name="i-lucide-compass" class="size-4 sm:size-5 text-toast-500 shrink-0" />
            <h2 class="dash-container-header font-serif text-toast-500 font-bold leading-tight truncate">
              Quick Navigation
            </h2>
          </div>

          <!-- 2-Column App Launcher Grid Styled after Event Dashboard -->
          <div class="grid grid-cols-2 gap-2.5 sm:gap-3 py-3 w-full max-w-56 sm:max-w-64 mx-auto">
            <UButton
              v-for="item in QUICK_NAV_ITEMS"
              :key="item.id"
              variant="ghost"
              class="group relative flex flex-col items-center justify-center w-full aspect-square p-2 sm:p-2.5 rounded-xl shadow-xs transition-all duration-200 active:scale-95 cursor-pointer select-none hover:shadow-sm hover:-translate-y-0.5"
              :class="[item.bgClass, item.ringClass, item.hoverClass, item.textClass]"
              @click="onQuickNavItemClick(item)"
            >
              <span
                v-if="item.badge"
                class="absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-toast-900 text-white shadow-xs z-10 transition-colors"
              >
                {{ item.badge }}
              </span>
              <UIcon
                :name="item.icon"
                class="size-5.5 sm:size-6 shrink-0 mb-1 transition-transform duration-200 group-hover:scale-110"
              />
              <span
                class="text-[10.5px] sm:text-[11.5px] font-semibold leading-tight text-center wrap-break-word line-clamp-2 px-0.5 tracking-tight"
              >
                {{ item.label }}
              </span>
            </UButton>
          </div>
        </div>
      </UDashboardPanel>
    </UPageGrid>

    <!-- Quick Add Guest Modal -->
    <UModal v-model:open="isAddGuestModalOpen" title="Add New Guest">
      <template #content>
        <div class="p-5 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-toast-900 mb-1">First Name</label>
              <input
                v-model="guestForm.firstName"
                type="text"
                placeholder="First name"
                class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-toast-900 mb-1">Last Name</label>
              <input
                v-model="guestForm.lastName"
                type="text"
                placeholder="Last name"
                class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-toast-900 mb-1">Email</label>
            <input
              v-model="guestForm.email"
              type="email"
              placeholder="guest@example.com"
              class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-toast-900 mb-1">Party / Group Name</label>
              <input
                v-model="guestForm.partyName"
                type="text"
                placeholder="e.g. Smith Family"
                class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-toast-900 mb-1">RSVP Status</label>
              <select
                v-model="guestForm.rsvpStatus"
                class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
              >
                <option value="PENDING">Pending</option>
                <option value="GOING">Going</option>
                <option value="NOT_GOING">Not Going</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-bread-200/60">
            <UButton color="toast" variant="ghost" size="sm" @click="isAddGuestModalOpen = false">
              Cancel
            </UButton>
            <UButton color="toast" variant="solid" size="sm" class="bg-toast-800 hover:bg-toast-900 text-white font-bold" :loading="saving" @click="addGuest">
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
            @sent="isBulkInviteModalOpen = false; load()"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.jam-dashboard-root {
  height: calc(100vh - 64px);
  max-height: calc(100vh - 64px);
  overflow: hidden;
  overscroll-behavior: none;
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
