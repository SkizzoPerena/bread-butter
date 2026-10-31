<script setup lang="ts">
import type { GatheringRecord, SeatingGuestRecord, CheckInResult } from '~/types/seating'
import { guestDisplayName } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import { attendanceTokenFromScan, currentOriginPath } from '~/utils/seatingQr'
import SeatingQrImage from '~/components/SeatingQrImage.vue'
import SeatingCheckInScanner from '~/components/SeatingCheckInScanner.vue'

definePageMeta({ layout: false, middleware: 'seating-enabled' })

const route = useRoute()
const toast = useToast()
const { isUiOnlyMode } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const seating = useSeating()

const gatheringId = computed(() => String(route.params.gatheringId || ''))
const gathering = ref<GatheringRecord | null>(null)
const guests = ref<SeatingGuestRecord[]>([])
const loading = ref(true)
const lastScan = ref('')
const lastScannedGuest = ref<CheckInResult | null>(null)

const isRosterOpen = ref(false)
const rosterSearch = ref('')
const rosterFilter = ref<'ALL' | 'IN_ATTENDANCE' | 'NOT_CONFIRMED'>('ALL')

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

const attendingGuests = computed(() => guests.value.filter((guest) => guest.isAttending || guest.rsvpStatus === 'GOING'))
const inAttendanceGuests = computed(() => attendingGuests.value.filter((guest) => Boolean(guest.checkedInAt)))
const notConfirmedGuests = computed(() => attendingGuests.value.filter((guest) => !guest.checkedInAt))

const checkedInCount = computed(() => inAttendanceGuests.value.length)
const notCheckedInCount = computed(() => notConfirmedGuests.value.length)

const displayedInAttendance = computed(() => {
  const q = rosterSearch.value.trim().toLowerCase()
  return inAttendanceGuests.value.filter((g) => {
    if (!q) return true
    const name = `${g.firstName} ${g.lastName}`.toLowerCase()
    const party = (g.partyName || '').toLowerCase()
    const email = (g.email || '').toLowerCase()
    return name.includes(q) || party.includes(q) || email.includes(q)
  })
})

const displayedNotConfirmed = computed(() => {
  const q = rosterSearch.value.trim().toLowerCase()
  return notConfirmedGuests.value.filter((g) => {
    if (!q) return true
    const name = `${g.firstName} ${g.lastName}`.toLowerCase()
    const party = (g.partyName || '').toLowerCase()
    const email = (g.email || '').toLowerCase()
    return name.includes(q) || party.includes(q) || email.includes(q)
  })
})

useHead({ title: computed(() => (gathering.value ? `Check-in · ${gathering.value.name} | Jam` : 'Check-in | Jam')) })

onMounted(load)

async function load() {
  loading.value = true
  try {
    gathering.value = await seating.getGathering(gatheringId.value)
    if (gathering.value) {
      setActiveEvent({
        _id: gathering.value._id,
        eventName: gathering.value.name,
      })
      if (gathering.value.status === 'ACTIVE') {
        const listed = await seating.listGuests(gatheringId.value)
        guests.value = listed.guests
      }
    }
  } catch (error) {
    toast.add({ title: 'Could not load gathering', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
}

async function checkIn(guest: SeatingGuestRecord) {
  try {
    await seating.checkInGuest(gatheringId.value, guest._id)
    toast.add({ title: `${guestDisplayName(guest)} checked in`, color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: 'Could not check in', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function undo(guest: SeatingGuestRecord) {
  try {
    await seating.undoCheckIn(gatheringId.value, guest._id)
    toast.add({ title: `Check-in undone for ${guestDisplayName(guest)}`, color: 'warning' })
    await load()
  } catch (error) {
    toast.add({ title: 'Could not undo check-in', description: getApiErrorMessage(error), color: 'error' })
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

async function onScan(value: string) {
  const token = attendanceTokenFromScan(value)
  if (!token || token === lastScan.value) return
  lastScan.value = token
  try {
    const guest = await seating.checkInByToken(gatheringId.value, token)
    lastScannedGuest.value = guest
    toast.add({
      title: `${guest.name} checked in!`,
      description: guest.tableLabel ? `${guest.tableLabel}, Seat ${guest.seatNumber}` : 'Seat assigned',
      color: 'success',
    })
    await load()
  } catch (error) {
    toast.add({ title: 'Pass not recognized', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    setTimeout(() => {
      if (lastScan.value === token) lastScan.value = ''
    }, 2500)
  }
}

function tableFor(guest: SeatingGuestRecord) {
  return gathering.value?.tables.find((table) => table._id === guest.tableId)
}

async function downloadGuests() {
  try {
    const blob = await seating.exportGuests(gatheringId.value)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'jam-guests.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast.add({ title: 'Attendance list downloaded', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not download attendance list', description: getApiErrorMessage(error), color: 'error' })
  }
}
</script>

<template>
  <div class="bg-toast-700 min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 text-toast-900 select-none relative">
    <div class="w-full max-w-4xl space-y-2 my-auto">
      <!-- Minimal Organizer Back Navigation -->
      <div class="flex items-center justify-between px-1">
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          label="Back to Workspace"
          class="text-bread-200 hover:text-white cursor-pointer font-semibold -ml-2"
          :to="`/seating/${gatheringId}`"
        />
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="white-bread-container p-8 text-center space-y-3 shadow-xl">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-toast-600 mx-auto" />
        <p class="font-serif text-lg font-bold text-toast-800">Loading check-in station...</p>
      </div>

      <!-- Inactive Gathering Warning -->
      <div
        v-else-if="gathering && gathering.status !== 'ACTIVE'"
        class="white-bread-container p-8 text-center space-y-4 max-w-lg mx-auto shadow-xl"
      >
        <div class="size-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-lock" class="size-7" />
        </div>
        <div class="space-y-1">
          <h2 class="text-2xl font-serif font-bold text-toast-900">Check-in Unavailable</h2>
          <p class="text-xs sm:text-sm text-toast-700">
            Payment for this Jam plan is pending. Complete payment to activate guest passes and live QR check-in.
          </p>
        </div>
        <UButton
          color="primary"
          size="md"
          label="Complete Payment"
          :to="{ path: '/user/seating-payment', query: { gatheringId: gathering._id } }"
        />
      </div>

      <!-- GUEST-FACING MAIN CARD: Simplified, Highlighted Event Header -->
      <div
        v-else-if="gathering"
        class="white-bread-container rounded-2xl shadow-2xl border border-toast-600/20 overflow-hidden"
      >
        <!-- Card Title Header with Distinct Colored Background -->
        <div class="bg-bread-400 text-toast-900 p-5 sm:p-6 text-center border-b border-toast-600/15">
          <h1 class="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-toast-950">
            {{ gathering.name }}
          </h1>
          <p class="text-xs sm:text-sm text-toast-800 font-medium mt-1">
            {{ gathering.venue }} <span v-if="gathering.venue && gatheringDateFormatted">·</span> {{ gatheringDateFormatted }}
          </p>
        </div>

        <!-- Card Body: 2 Clean Guest Actions (QR Seat Finder & Pass Scanner) -->
        <div class="p-5 sm:p-7 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch bg-white/95">
          <!-- Left Column: Gathering Seat Finder QR -->
          <div class="bg-toast-50/70 p-4 sm:p-5 rounded-xl border border-bread-200/90 flex flex-col items-center justify-between text-center space-y-3.5">
            <div class="space-y-1">
              <div class="flex items-center justify-center gap-1.5 text-toast-900 font-bold text-base font-serif">
                <UIcon name="i-lucide-qr-code" class="size-5 text-toast-600" />
                <span>Find Your Table & Seat</span>
              </div>
              <p class="text-xs text-toast-700">
                Scan this QR code with your phone camera to look up your assigned table and seat number.
              </p>
            </div>

            <!-- Crisp QR code frame -->
            <div class="p-3 bg-white rounded-2xl shadow-xs border border-bread-200 flex items-center justify-center">
              <SeatingQrImage :value="lookupUrl" :size="150" alt="Gathering Seat Finder QR" class="rounded-lg" />
            </div>

            <!-- Simple Caption -->
            <p class="text-[11px] text-muted italic">
              Point your phone camera to open your seat pass.
            </p>
          </div>

          <!-- Right Column: Guest Pass Scanner -->
          <div class="bg-toast-50/70 p-4 sm:p-5 rounded-xl border border-bread-200/90 flex flex-col items-center justify-between text-center space-y-3.5">
            <div class="space-y-1">
              <div class="flex items-center justify-center gap-1.5 text-toast-900 font-bold text-base font-serif">
                <UIcon name="i-lucide-scan" class="size-5 text-toast-600" />
                <span>Scan Attendance Pass</span>
              </div>
              <p class="text-xs text-toast-700">
                Present your personal QR pass to the camera or upload an image to check in.
              </p>
            </div>

            <!-- Camera Scanner Component -->
            <div class="w-full max-w-[240px] flex flex-col justify-center items-center">
              <ClientOnly>
                <SeatingCheckInScanner @scan="onScan" />
              </ClientOnly>
            </div>

            <!-- Last Scan Arrival Notification -->
            <div class="w-full">
              <div
                v-if="lastScannedGuest"
                class="w-full p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-left flex items-center gap-2 text-xs text-emerald-900 shadow-2xs"
              >
                <div class="size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <UIcon name="i-lucide-check" class="size-3.5" />
                </div>
                <div class="min-w-0 flex-1 text-[11px]">
                  <p class="font-bold truncate">Welcome, {{ lastScannedGuest.name }}!</p>
                  <p class="text-emerald-800 truncate">
                    {{ lastScannedGuest.tableLabel ? `${lastScannedGuest.tableLabel}, Seat ${lastScannedGuest.seatNumber}` : 'Seat assigned' }}
                  </p>
                </div>
              </div>
              <div v-else class="text-[11px] text-muted italic">
                Camera is ready for arrival passes.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FLOATING COMPONENT: View Attendance Roster (Bottom Right) -->
    <div v-if="gathering && gathering.status === 'ACTIVE'" class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30">
      <UButton
        size="md"
        color="primary"
        variant="solid"
        icon="i-lucide-clipboard-check"
        class="shadow-2xl rounded-full px-4 py-2.5 font-bold cursor-pointer"
        @click="isRosterOpen = true"
      >
        <span>Attendance Roster</span>
        <UBadge color="neutral" variant="subtle" size="xs" class="ml-1 font-mono">
          {{ checkedInCount }}/{{ attendingGuests.length }}
        </UBadge>
      </UButton>
    </div>

    <!-- ATTENDANCE ROSTER MODAL: Pulls up complete list arranged by In Attendance vs Not Confirmed -->
    <UModal
      v-model:open="isRosterOpen"
      :ui="{
        content: 'max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl bg-white',
      }"
    >
      <template #content>
        <div class="flex flex-col max-h-[85vh] text-toast-900 bg-white">
          <!-- Modal Header -->
          <div class="p-5 sm:p-6 border-b border-toast-200/80 space-y-3 bg-toast-50/40 shrink-0">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-clipboard-check" class="size-6 text-toast-600" />
                <h3 class="text-xl sm:text-2xl font-serif font-bold text-toast-900">
                  Guest Attendance Roster
                </h3>
              </div>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                size="sm"
                @click="isRosterOpen = false"
              />
            </div>

            <p class="text-xs text-muted">
              Live status for {{ attendingGuests.length }} registered attendees. Grouped by arrival status below.
            </p>

            <!-- Search & Filter Controls -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <UInput
                v-model="rosterSearch"
                icon="i-lucide-search"
                placeholder="Search attendees by name, email, or party..."
                size="sm"
                class="flex-1 max-w-sm"
              />

              <div class="flex items-center gap-1.5 overflow-x-auto">
                <UButton
                  size="xs"
                  :variant="rosterFilter === 'ALL' ? 'solid' : 'outline'"
                  :color="rosterFilter === 'ALL' ? 'primary' : 'neutral'"
                  :label="`All (${attendingGuests.length})`"
                  @click="rosterFilter = 'ALL'"
                />
                <UButton
                  size="xs"
                  :variant="rosterFilter === 'IN_ATTENDANCE' ? 'solid' : 'outline'"
                  :color="rosterFilter === 'IN_ATTENDANCE' ? 'primary' : 'neutral'"
                  :label="`In Attendance (${inAttendanceGuests.length})`"
                  @click="rosterFilter = 'IN_ATTENDANCE'"
                />
                <UButton
                  size="xs"
                  :variant="rosterFilter === 'NOT_CONFIRMED' ? 'solid' : 'outline'"
                  :color="rosterFilter === 'NOT_CONFIRMED' ? 'primary' : 'neutral'"
                  :label="`Not Confirmed (${notConfirmedGuests.length})`"
                  @click="rosterFilter = 'NOT_CONFIRMED'"
                />
              </div>
            </div>
          </div>

          <!-- Modal Scrollable Content -->
          <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            <!-- GROUP 1: In Attendance -->
            <div v-if="rosterFilter === 'ALL' || rosterFilter === 'IN_ATTENDANCE'" class="space-y-3">
              <div class="flex items-center justify-between pb-1.5 border-b border-emerald-200">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-check-circle-2" class="size-4 text-emerald-600" />
                  <span class="font-serif font-bold text-sm text-emerald-900 uppercase tracking-wider">
                    In Attendance
                  </span>
                  <UBadge color="success" variant="solid" size="xs" class="font-bold">
                    {{ displayedInAttendance.length }}
                  </UBadge>
                </div>
                <span class="text-[11px] text-muted">Checked in</span>
              </div>

              <div v-if="displayedInAttendance.length === 0" class="py-4 text-center text-xs text-muted italic">
                No guests in this view are checked in yet.
              </div>

              <div v-else class="divide-y divide-emerald-100 border border-emerald-100 rounded-xl overflow-hidden bg-emerald-50/20">
                <div
                  v-for="guest in displayedInAttendance"
                  :key="guest._id"
                  class="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-emerald-50/50 transition-colors"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="size-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-xs">
                      <UIcon name="i-lucide-check" class="size-4" />
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-sm text-toast-900 truncate">{{ guestDisplayName(guest) }}</span>
                        <UBadge v-if="guest.partyName" color="neutral" variant="subtle" size="xs" class="text-[10px]">
                          {{ guest.partyName }}
                        </UBadge>
                      </div>
                      <p class="text-xs text-emerald-800">
                        {{ tableFor(guest)?.label || 'Table pending' }}<span v-if="guest.seatNumber">, Seat {{ guest.seatNumber }}</span>
                        ·
                        <span class="text-muted">
                          Checked in at {{ new Date(guest.checkedInAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="outline"
                      label="Undo Check-in"
                      @click="undo(guest)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- GROUP 2: Not Confirmed Yet -->
            <div v-if="rosterFilter === 'ALL' || rosterFilter === 'NOT_CONFIRMED'" class="space-y-3">
              <div class="flex items-center justify-between pb-1.5 border-b border-amber-200">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-clock" class="size-4 text-amber-600" />
                  <span class="font-serif font-bold text-sm text-amber-900 uppercase tracking-wider">
                    Not Confirmed Yet
                  </span>
                  <UBadge color="warning" variant="solid" size="xs" class="font-bold text-black">
                    {{ displayedNotConfirmed.length }}
                  </UBadge>
                </div>
                <span class="text-[11px] text-muted">Awaiting arrival</span>
              </div>

              <div v-if="displayedNotConfirmed.length === 0" class="py-4 text-center text-xs text-muted italic">
                All registered attendees are checked in!
              </div>

              <div v-else class="divide-y divide-bread-200/60 border border-bread-200/60 rounded-xl overflow-hidden bg-white/70">
                <div
                  v-for="guest in displayedNotConfirmed"
                  :key="guest._id"
                  class="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-toast-50/50 transition-colors"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="size-8 rounded-full bg-toast-100 text-toast-600 font-bold flex items-center justify-center shrink-0 text-xs">
                      {{ (guest.firstName?.[0] || 'G').toUpperCase() }}{{ (guest.lastName?.[0] || '').toUpperCase() }}
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-sm text-toast-900 truncate">{{ guestDisplayName(guest) }}</span>
                        <UBadge v-if="guest.partyName" color="neutral" variant="subtle" size="xs" class="text-[10px]">
                          {{ guest.partyName }}
                        </UBadge>
                      </div>
                      <p class="text-xs text-muted truncate">
                        {{ tableFor(guest)?.label || 'Unassigned table' }}<span v-if="guest.seatNumber">, Seat {{ guest.seatNumber }}</span>
                        · {{ guest.email }}
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <UButton
                      size="xs"
                      color="primary"
                      variant="solid"
                      label="Check In"
                      @click="checkIn(guest)"
                    />
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="soft"
                      icon="i-lucide-mail"
                      label="Email Pass"
                      :disabled="!guest.seatNumber"
                      title="Send seat pass email"
                      @click="resend(guest)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="p-4 border-t border-toast-200/80 flex items-center justify-between bg-toast-50/30 shrink-0">
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              icon="i-lucide-download"
              label="Download CSV"
              @click="downloadGuests"
            />
            <UButton
              size="sm"
              color="primary"
              variant="solid"
              label="Done"
              class="px-5"
              @click="isRosterOpen = false"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
