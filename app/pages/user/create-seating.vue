<script setup lang="ts">
import type { JamPackageRecord } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import { EVENT_TYPE_OPTIONS } from '~/types/event'
import {
  getUiPendingSeatingPayment,
  isGatheringPendingVerification,
  isGatheringUnpaid,
  buildPendingSeatingQuery,
} from '~/utils/paymentPendingGuard'

definePageMeta({ layout: false })
useHead({ title: 'New seating plan - Bread + Butter' })

type ViewStep = 'packages' | 'details'

const route = useRoute()
const toast = useToast()
const { listPackages, getGathering, listGatherings, updateGathering } = useSeating()
const { seatingPlansEnabled, loadSeatingFeature } = useSeatingFeature()
const { startPageTransition, finishPageTransition } = usePageTransition()

const eventTypeOptions = EVENT_TYPE_OPTIONS

const packages = ref<JamPackageRecord[]>([])
const currentView = ref<ViewStep>('packages')
const selectedId = ref('')
const name = ref('')
const eventType = ref('WEDDING')
const venue = ref('')
const eventDate = ref('')
const loading = ref(true)
const saving = ref(false)

const editingId = computed(() => String(route.query.gatheringId || ''))
const selected = computed(() => packages.value.find((item) => item._id === selectedId.value) || null)

const sortedPackages = computed(() => {
  return [...packages.value].sort((a, b) => a.pricePhp - b.pricePhp)
})

function formatPlan(jamPackage: JamPackageRecord) {
  const originalPrice = jamPackage.pricePhp * 2
  return {
    id: jamPackage._id,
    title: jamPackage.name,
    maxGuests: jamPackage.maxGuests,
    price: `₱${originalPrice.toLocaleString()}`,
    discount: `₱${jamPackage.pricePhp.toLocaleString()}`,
    button: {
      label: `Select ${jamPackage.name}`,
      color: 'primary' as const,
      size: 'xs' as const,
      class: 'w-full font-bold text-white bg-jam-700 hover:bg-jam-800 active:bg-jam-900 py-1.5 px-3 text-xs rounded-xl shadow-xs cursor-pointer justify-center transition-all',
      onClick: () => choosePackage(jamPackage._id),
    },
  }
}

const lowerPlans = computed(() => {
  return sortedPackages.value.slice(0, 3).map(formatPlan)
})

const higherPlans = computed(() => {
  return sortedPackages.value.slice(3, 5).map(formatPlan)
})

const plans = computed(() => sortedPackages.value.map(formatPlan))

function toDateInput(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function switchView(view: ViewStep) {
  if (view === 'details' && !selected.value) {
    toast.add({ title: 'Select a package', description: 'Choose a jam plan before the gathering details.', color: 'warning' })
    return
  }
  currentView.value = view
}

function choosePackage(packageId: string) {
  selectedId.value = packageId
  currentView.value = 'details'
}

onMounted(async () => {
  await loadSeatingFeature()
  if (!seatingPlansEnabled.value) {
    loading.value = false
    return
  }
  try {
    packages.value = await listPackages()
    if (editingId.value) {
      const gathering = await getGathering(editingId.value)
      selectedId.value = String(gathering.jamPackage || '')
      name.value = gathering.name
      eventType.value = gathering.eventType || 'WEDDING'
      venue.value = gathering.venue
      eventDate.value = toDateInput(gathering.eventDate)
    } else {
      const uiPending = getUiPendingSeatingPayment()
      if (uiPending) {
        await navigateTo({
          path: '/user/seating-payment/pending',
          query: uiPending as Record<string, string>,
        }, { replace: true })
        return
      }
      const gatherings = await listGatherings().catch(() => [])
      const pendingGathering = gatherings.find((g) => isGatheringPendingVerification(g))
      if (pendingGathering) {
        await navigateTo({
          path: '/user/seating-payment/pending',
          query: buildPendingSeatingQuery(pendingGathering) as Record<string, string>,
        }, { replace: true })
        return
      }
      const unpaidGathering = gatherings.find((g) => isGatheringUnpaid(g))
      if (unpaidGathering && !route.query.packageId && !route.query.package && !route.query.tier) {
        await navigateTo({
          path: '/user/seating-payment',
          query: { gatheringId: unpaidGathering._id },
        }, { replace: true })
        return
      }

      if (route.query.packageId || route.query.package || route.query.tier) {
        const targetParam = String(route.query.packageId || route.query.package || route.query.tier || '').trim().toLowerCase()
        const match = packages.value.find((p) => p._id.toLowerCase() === targetParam || p.name.toLowerCase() === targetParam)
        if (match) {
          selectedId.value = match._id
          currentView.value = 'details'
        } else if (route.query.packageId) {
          selectedId.value = String(route.query.packageId)
        }
        name.value = String(route.query.name || '')
        eventType.value = String(route.query.eventType || 'WEDDING')
        venue.value = String(route.query.venue || '')
        eventDate.value = toDateInput(String(route.query.eventDate || ''))
      }
    }
  } catch (error) {
    toast.add({ title: 'Could not load packages', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
    finishPageTransition()
  }
})

async function submit() {
  if (!selected.value) {
    toast.add({ title: 'Select a package', description: 'Choose a jam plan before continuing.', color: 'warning' })
    currentView.value = 'packages'
    return
  }
  if (!name.value.trim() || !venue.value.trim() || !eventDate.value) {
    toast.add({ title: 'Add the gathering details', description: 'Name, venue, and date are required.', color: 'warning' })
    return
  }
  const eventDateIso = new Date(`${eventDate.value}T00:00:00`).toISOString()
  const details = {
    packageId: selected.value._id,
    name: name.value.trim(),
    eventType: eventType.value,
    venue: venue.value.trim(),
    eventDate: eventDateIso,
  }
  if (!editingId.value) {
    await startPageTransition({ path: '/user/seating-payment', query: details })
    return
  }
  saving.value = true
  try {
    await updateGathering(editingId.value, details)
    await startPageTransition({ path: '/user/seating-payment', query: { gatheringId: editingId.value } })
  } catch (error) {
    toast.add({ title: 'Could not save seating plan', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="bg-jam-700 h-screen max-h-screen flex flex-col justify-between py-2 sm:py-3 px-3 sm:px-6 overflow-y-auto lg:overflow-hidden select-none">
    <!-- Top Header & Navigation Bar (Compact, No Navbar) -->
    <header class="w-full max-w-6xl mx-auto flex items-center justify-between pb-1.5 border-b border-white/10 shrink-0">
      <div class="flex items-center gap-2">
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-lucide-arrow-left"
          class="text-bread-200 hover:text-white cursor-pointer font-medium text-xs px-2 py-1"
          @click.prevent="startPageTransition('/event/dashboard-butter')"
        >
          Dashboard
        </UButton>
      </div>

      <!-- Step Navigation Toggle -->
      <div class="inline-flex items-center gap-1.5 bg-jam-900/60 p-0.5 rounded-full border border-jam-600/40">
        <button
          type="button"
          class="px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer"
          :class="currentView === 'packages' ? 'bg-bread-400 text-jam-950 shadow-xs' : 'text-bread-200 hover:text-white'"
          @click="switchView('packages')"
        >
          1. Select package
        </button>
        <span class="text-bread-400/30 text-[10px]">•</span>
        <button
          type="button"
          class="px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer"
          :class="currentView === 'details' ? 'bg-bread-400 text-jam-950 shadow-xs' : 'text-bread-200 hover:text-white'"
          @click="switchView('details')"
        >
          2. Gathering details
        </button>
      </div>

      <!-- Plan Step Counter -->
      <div class="text-right">
        <span class="text-[11px] font-semibold text-bread-300 font-mono">
          Step {{ currentView === 'packages' ? '1' : '2' }}/2
        </span>
      </div>
    </header>

    <!-- Main Content Area: Centered and strictly fitting within 100vh -->
    <main class="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center min-h-0 py-1.5">
      <div
        v-if="!loading && !seatingPlansEnabled"
        class="white-bread-container p-5 text-center space-y-2 max-w-md mx-auto"
      >
        <h1 class="text-xl font-bold font-serif text-jam-900">
          Seating is not available right now
        </h1>
        <p class="text-xs text-jam-700">
          You can still create and manage your event.
        </p>
      </div>

      <template v-else>
        <!-- View 1: Packages Selection (2 Rows, 3-col & 2-col, Compact) -->
        <div
          v-if="currentView === 'packages'"
          class="w-full flex flex-col justify-center gap-2 sm:gap-2.5 my-auto"
        >
          <!-- Section Title Row (Concise & Tight) -->
          <div class="text-center space-y-0.5 shrink-0">
            <h1 class="text-xl sm:text-2xl font-bold font-serif text-bread-400 leading-tight">
              Pick a Jam Plan
            </h1>
            <p class="text-xs text-white/80 max-w-lg mx-auto line-clamp-1">
              Every plan includes seating arrangements, stationery invitations, and live RSVP check-in.
            </p>
          </div>

          <div
            v-if="loading"
            class="text-center text-white py-8"
          >
            Loading packages...
          </div>
          <div
            v-else-if="packages.length === 0"
            class="white-bread-container p-6 text-center max-w-md mx-auto"
          >
            No jam packages are available yet.
          </div>
          <div
            v-else
            class="space-y-2 sm:space-y-2.5 w-full flex-1 flex flex-col justify-center min-h-0"
          >
            <!-- Row 1: 3-column grid featuring the 3 lower value packages -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 w-full">
              <UPricingPlan
                v-for="plan in lowerPlans"
                :key="plan.id"
                v-bind="plan"
                class="text-left bread-container transition-all duration-200 flex flex-col justify-between"
                :class="selectedId === plan.id ? 'ring-2 ring-bread-400 shadow-sm' : ''"
                :ui="{
                  root: 'p-3 sm:p-3.5 gap-1.5 rounded-2xl flex flex-col justify-between shadow-xs',
                  body: 'flex flex-col min-w-0 justify-between gap-1',
                  titleWrapper: 'flex items-center justify-between gap-1',
                  title: 'font-serif font-bold text-base sm:text-lg text-jam-900 leading-tight',
                  priceWrapper: 'flex items-baseline gap-1.5 pt-1.5 border-t border-bread-200/60 mt-1',
                  discount: 'text-xs text-stone-400 line-through font-mono',
                  price: 'text-sm sm:text-base font-bold font-serif text-jam-900',
                  footer: 'mt-1.5 pt-0',
                }"
              >
                <!-- Highlighted Guest Cap (Clean Typography Hierarchy, No Pill) -->
                <template #description>
                  <div class="my-0.5 sm:my-1">
                    <span class="text-[9px] text-muted block uppercase font-bold tracking-wider">Capacity</span>
                    <p class="font-serif font-bold text-xl sm:text-2xl text-jam-900 leading-none py-0.5">
                      Up to {{ plan.maxGuests }} guests
                    </p>
                    <p class="text-[10.5px] text-jam-700/80 font-medium">
                      Seating, check-in & RSVP
                    </p>
                  </div>
                </template>
              </UPricingPlan>
            </div>

            <!-- Row 2: 2-column grid featuring the highest 2 packages -->
            <div
              v-if="higherPlans.length > 0"
              class="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-3xl mx-auto"
            >
              <UPricingPlan
                v-for="plan in higherPlans"
                :key="plan.id"
                v-bind="plan"
                class="text-left bread-container transition-all duration-200 flex flex-col justify-between"
                :class="selectedId === plan.id ? 'ring-2 ring-bread-400 shadow-sm' : ''"
                :ui="{
                  root: 'p-3 sm:p-3.5 gap-1.5 rounded-2xl flex flex-col justify-between shadow-xs',
                  body: 'flex flex-col min-w-0 justify-between gap-1',
                  titleWrapper: 'flex items-center justify-between gap-1',
                  title: 'font-serif font-bold text-base sm:text-lg text-jam-900 leading-tight',
                  priceWrapper: 'flex items-baseline gap-1.5 pt-1.5 border-t border-bread-200/60 mt-1',
                  discount: 'text-xs text-stone-400 line-through font-mono',
                  price: 'text-sm sm:text-base font-bold font-serif text-jam-900',
                  footer: 'mt-1.5 pt-0',
                }"
              >
                <!-- Highlighted Guest Cap (Clean Typography Hierarchy, No Pill) -->
                <template #description>
                  <div class="my-0.5 sm:my-1">
                    <span class="text-[9px] text-muted block uppercase font-bold tracking-wider">Capacity</span>
                    <p class="font-serif font-bold text-xl sm:text-2xl text-jam-900 leading-none py-0.5">
                      Up to {{ plan.maxGuests }} guests
                    </p>
                    <p class="text-[10.5px] text-jam-700/80 font-medium">
                      Seating, check-in & RSVP
                    </p>
                  </div>
                </template>
              </UPricingPlan>
            </div>
          </div>
        </div>

        <!-- View 2: Gathering Details Form (Compact & Fits 100vh) -->
        <div
          v-else
          class="max-w-xl w-full mx-auto my-auto"
        >
          <div class="bread-container bg-bread-400 text-jam-900 p-4 sm:p-5 rounded-2xl space-y-3.5 shadow-md">
            <div class="flex items-center justify-between bg-white/85 p-3 rounded-xl border border-jam-600/20">
              <div>
                <span class="text-[10px] text-jam-600 uppercase font-bold tracking-wider">Selected plan:</span>
                <h3 class="text-base font-bold font-serif text-jam-900">
                  {{ selected?.name }}
                </h3>
                <p class="text-xs text-jam-700">
                  Up to {{ selected?.maxGuests }} guests · ₱{{ selected?.pricePhp.toLocaleString() }}
                </p>
              </div>
              <UButton
                variant="outline"
                color="primary"
                size="xs"
                icon="i-lucide-arrow-left"
                class="cursor-pointer"
                @click="switchView('packages')"
              >
                Change package
              </UButton>
            </div>

            <form
              class="space-y-3"
              @submit.prevent="submit"
            >
              <UFormField
                label="Gathering name"
                required
              >
                <UInput
                  v-model="name"
                  placeholder="Santos reunion"
                  size="md"
                  class="w-full bg-white text-jam-900 border-jam-300 rounded-lg"
                />
              </UFormField>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <UFormField
                  label="Event Type"
                  required
                >
                  <USelect
                    v-model="eventType"
                    :items="eventTypeOptions"
                    size="md"
                    class="w-full bg-white text-jam-900 border-jam-300 rounded-lg"
                  />
                </UFormField>
                <UFormField
                  label="Date"
                  required
                >
                  <UInput
                    v-model="eventDate"
                    type="date"
                    size="md"
                    class="w-full bg-white text-jam-900 border-jam-300 rounded-lg"
                  />
                </UFormField>
              </div>
              <UFormField
                label="Venue"
                required
              >
                <UInput
                  v-model="venue"
                  placeholder="The garden hall"
                  size="md"
                  class="w-full bg-white text-jam-900 border-jam-300 rounded-lg"
                />
              </UFormField>
              <div class="pt-2 flex gap-3">
                <UButton
                  type="button"
                  variant="soft"
                  color="neutral"
                  size="md"
                  class="w-1/3 justify-center font-semibold cursor-pointer"
                  @click="switchView('packages')"
                >
                  Back
                </UButton>
                <UButton
                  type="submit"
                  color="primary"
                  size="md"
                  class="w-2/3 font-bold text-white bg-jam-700 hover:bg-jam-800 active:bg-jam-900 shadow-sm justify-center cursor-pointer"
                  :loading="saving"
                >
                  Continue to payment
                </UButton>
              </div>
            </form>
          </div>
        </div>
      </template>
    </main>

    <!-- Bottom Footer (Minimal) -->
    <footer class="w-full max-w-6xl mx-auto py-1 text-center shrink-0 border-t border-white/10">
      <p class="text-[10px] text-white/50">
        Bread + Butter Jam Planning · Guaranteed to fit your occasion
      </p>
    </footer>
  </div>
</template>