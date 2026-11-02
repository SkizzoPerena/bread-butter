<script setup lang="ts">
import type { GatheringRecord, JamUpgradeOptions } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'

definePageMeta({
  layout: 'jam-sub-navbar',
  middleware: 'seating-enabled',
  title: 'Jam Settings & Plan',
  bgClass: 'bg-slate-50',
})

const route = useRoute()
const toast = useToast()
const { isUiOnlyMode } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const seating = useSeating()

const gatheringId = computed(() => String(route.params.gatheringId || route.query.gatheringId || ''))
const gathering = ref<GatheringRecord | null>(null)
const guests = ref<any[]>([])
const upgradeOptions = ref<JamUpgradeOptions | null>(null)
const loading = ref(true)
const saving = ref(false)

const form = reactive({
  name: '',
  venue: '',
  eventDate: '',
  passcode: '',
  seatSelectionLocked: false,
  maxCompanionsPerGuest: 0,
})

const emailCreditsRemaining = computed(() => {
  if (!gathering.value) return 0
  return Math.max(gathering.value.maxGuests - guests.value.length, 0)
})

async function load() {
  if (!gatheringId.value) return
  loading.value = true
  try {
    const [gatheringData, guestsData, upgradeData] = await Promise.all([
      seating.getGathering(gatheringId.value),
      seating.listGuests(gatheringId.value),
      seating.getUpgradeOptions(gatheringId.value).catch(() => null),
    ])
    gathering.value = gatheringData
    guests.value = guestsData.guests
    upgradeOptions.value = upgradeData

    form.name = gatheringData.name || ''
    form.venue = gatheringData.venue || ''
    form.eventDate = gatheringData.eventDate ? gatheringData.eventDate.slice(0, 10) : ''
    form.passcode = gatheringData.passcode || ''
    form.seatSelectionLocked = Boolean(gatheringData.seatSelectionLocked)
    form.maxCompanionsPerGuest = gatheringData.maxCompanionsPerGuest ?? 0

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
    toast.add({ title: 'Could not load settings', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function saveAllSettings() {
  if (!gatheringId.value) return
  if (!form.name.trim()) {
    toast.add({ title: 'Event title is required', color: 'warning' })
    return
  }

  saving.value = true
  try {
    // 1. Update gathering details
    await seating.updateGathering(gatheringId.value, {
      name: form.name.trim(),
      venue: form.venue.trim(),
      eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : undefined,
    }).catch(() => {})

    // 2. Save passcode & seat selection lock
    const updated = await seating.saveInvitation(gatheringId.value, {
      passcode: form.passcode.trim(),
      seatSelectionLocked: form.seatSelectionLocked,
      maxCompanionsPerGuest: form.maxCompanionsPerGuest,
    })

    gathering.value = updated
    toast.add({ title: 'Jam settings and plan saved successfully', color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: 'Could not save settings', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="jam-subpage-root min-h-screen bg-toast-50/20 pb-16">
    <!-- Subpage Top Banner -->
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div class="flex items-center gap-2">
          <UButton
            :to="`/user/jam-upgrade/${gatheringId}`"
            color="primary"
            variant="solid"
            size="xs"
            icon="i-lucide-sparkles"
            class="cursor-pointer"
          >
            Upgrade Plan
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <div v-if="loading" class="p-12 max-w-4xl mx-auto text-center space-y-3">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-toast-600 mx-auto" />
      <p class="font-serif text-lg font-bold text-toast-800">Loading settings & plan details...</p>
    </div>

    <div v-else-if="gathering" class="max-w-4xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
      <!-- 1. Plan Details & Capacity Breakdown -->
      <div class="white-bread-container p-4 sm:p-5 space-y-4 shadow-xs">
        <div class="flex items-center justify-between border-b border-bread-200/60 pb-2">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-credit-card" class="size-4 text-toast-600" />
            <h3 class="font-serif font-bold text-base text-toast-900">Plan & Package Details</h3>
          </div>
          <UBadge color="warning" variant="solid" size="sm" class="text-black font-semibold">
            {{ gathering.packageName }} Tier
          </UBadge>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="bg-toast-50/50 p-3 rounded-xl border border-bread-200/60">
            <span class="text-[11px] text-muted uppercase font-semibold block">Max Guest Limit</span>
            <span class="text-xl font-bold font-serif text-toast-900">{{ gathering.maxGuests }} Guests</span>
          </div>
          <div class="bg-toast-50/50 p-3 rounded-xl border border-bread-200/60">
            <span class="text-[11px] text-muted uppercase font-semibold block">Registered Guests</span>
            <span class="text-xl font-bold font-serif text-toast-900">{{ guests.length }}</span>
          </div>
          <div class="bg-toast-50/50 p-3 rounded-xl border border-bread-200/60">
            <span class="text-[11px] text-muted uppercase font-semibold block">Status</span>
            <span class="text-xl font-bold font-serif text-emerald-600">{{ gathering.status }}</span>
          </div>
        </div>

        <!-- Email Credits Row -->
        <div class="bg-toast-50/40 p-4 rounded-xl border border-bread-200/60 flex flex-wrap items-center justify-between gap-4">
          <div class="space-y-1">
            <span class="text-xs text-muted block font-semibold uppercase">Email Invitation Credits</span>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-bold font-serif text-toast-900">{{ emailCreditsRemaining }}</span>
              <span class="text-xs text-muted">credits remaining of {{ gathering.maxGuests }} total capacity</span>
            </div>
            <UProgress
              :model-value="gathering.maxGuests ? (emailCreditsRemaining / gathering.maxGuests) * 100 : 0"
              color="warning"
              size="xs"
              class="w-64 max-w-full"
            />
          </div>

          <UButton
            :to="`/user/jam-upgrade/${gatheringId}`"
            color="primary"
            variant="solid"
            size="sm"
            icon="i-lucide-arrow-up-circle"
            class="cursor-pointer"
          >
            Upgrade Plan & Credits
          </UButton>
        </div>

        <!-- Available Upgrade Options Preview -->
        <div v-if="upgradeOptions && upgradeOptions.options.length > 0" class="space-y-2 pt-2 border-t border-bread-200/60">
          <span class="text-xs font-bold text-toast-800 block">Available Higher Tiers:</span>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="opt in upgradeOptions.options"
              :key="opt._id"
              class="bg-white p-3 rounded-xl border border-bread-200/80 shadow-2xs flex items-center justify-between"
            >
              <div>
                <span class="font-bold text-toast-900 block text-sm">{{ opt.name }}</span>
                <span class="text-xs text-muted">Up to {{ opt.maxGuests }} Guests (+{{ opt.additionalGuests }})</span>
              </div>
              <div class="text-right">
                <span class="font-serif font-bold text-sm text-toast-900 block">₱{{ opt.priceDifferencePhp.toLocaleString() }}</span>
                <span class="text-[10px] text-muted">Difference</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Gathering Information Form -->
      <div class="white-bread-container p-4 sm:p-5 space-y-4 shadow-xs">
        <div class="flex items-center gap-2 border-b border-bread-200/60 pb-2">
          <UIcon name="i-lucide-calendar" class="size-4 text-toast-600" />
          <h3 class="font-serif font-bold text-base text-toast-900">Event Details</h3>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-toast-900 mb-1">Event / Gathering Title *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="e.g. Sarah & David's Wedding Reception"
              class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-toast-900 mb-1">Venue / Location</label>
              <input
                v-model="form.venue"
                type="text"
                placeholder="e.g. The Grand Ballroom, Manila"
                class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-toast-900 mb-1">Event Date</label>
              <input
                v-model="form.eventDate"
                type="date"
                class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 focus:outline-none focus:ring-1 focus:ring-toast-500"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Security, Passcode & Seating Preferences -->
      <div class="white-bread-container p-4 sm:p-5 space-y-4 shadow-xs">
        <div class="flex items-center gap-2 border-b border-bread-200/60 pb-2">
          <UIcon name="i-lucide-lock" class="size-4 text-toast-600" />
          <h3 class="font-serif font-bold text-base text-toast-900">Access & Seating Permissions</h3>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-toast-900 mb-1">Invitation Passcode</label>
            <input
              v-model="form.passcode"
              type="text"
              placeholder="e.g. CELEBRATE2026"
              class="w-full bg-toast-50/50 border border-bread-200/90 rounded-lg px-3 py-1.5 text-xs text-toast-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-toast-500"
            />
            <p class="text-[11px] text-muted mt-1">
              Leave blank if you do not want to require guests to enter a passcode to view the invitation.
            </p>
          </div>

          <div class="flex items-start gap-2.5 pt-2 border-t border-bread-200/60">
            <input
              id="lockSeatSelection"
              v-model="form.seatSelectionLocked"
              type="checkbox"
              class="size-4 text-toast-600 rounded cursor-pointer mt-0.5"
            />
            <label for="lockSeatSelection" class="text-xs text-toast-900 cursor-pointer">
              <strong class="block font-semibold">Lock Guest Seat Selection</strong>
              <span class="text-muted block text-[11px]">
                When locked, guests cannot pick or change their own seats from their personal passes; only the host can arrange seats.
              </span>
            </label>
          </div>

          <div class="flex items-center justify-between gap-3 pt-2 border-t border-bread-200/60">
            <div class="text-xs text-toast-900">
              <strong class="block font-semibold">Companions each guest can bring</strong>
              <span class="text-muted block text-[11px]">
                Guests who reply that they're coming can add this many companions, who count toward your guest limit. Set to 0 to turn this off.
              </span>
            </div>
            <div class="flex items-center gap-1.5 bg-white border border-toast-300/80 rounded-lg p-0.5 shadow-2xs shrink-0">
              <button
                type="button"
                aria-label="Allow fewer companions"
                class="size-6 rounded flex items-center justify-center font-bold text-toast-800 hover:bg-toast-100 cursor-pointer disabled:opacity-30"
                :disabled="form.maxCompanionsPerGuest <= 0"
                @click="form.maxCompanionsPerGuest -= 1"
              >
                -
              </button>
              <span data-testid="max-companions" class="w-6 text-center font-bold font-mono text-xs text-toast-900">{{ form.maxCompanionsPerGuest }}</span>
              <button
                type="button"
                aria-label="Allow more companions"
                class="size-6 rounded flex items-center justify-center font-bold text-toast-800 hover:bg-toast-100 cursor-pointer disabled:opacity-30"
                :disabled="form.maxCompanionsPerGuest >= 10"
                @click="form.maxCompanionsPerGuest += 1"
              >
                +
              </button>
            </div>
          </div>

          <div class="flex justify-end pt-3 border-t border-bread-200/60">
            <UButton
              color="toast"
              variant="solid"
              size="sm"
              class="bg-toast-800 hover:bg-toast-900 text-white font-bold"
              :loading="saving"
              @click="saveAllSettings"
            >
              Save Jam Settings
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
