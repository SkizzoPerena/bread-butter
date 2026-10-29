<script setup lang="ts">
import type { JamPackageRecord } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'

definePageMeta({ layout: 'signed-in-navbar' })
useHead({ title: 'New seating plan - Bread + Butter' })

type ViewStep = 'packages' | 'details'

const route = useRoute()
const toast = useToast()
const { listPackages, getGathering, updateGathering } = useSeating()
const { seatingPlansEnabled, loadSeatingFeature } = useSeatingFeature()

const packages = ref<JamPackageRecord[]>([])
const currentView = ref<ViewStep>('packages')
const selectedId = ref('')
const name = ref('')
const venue = ref('')
const eventDate = ref('')
const loading = ref(true)
const saving = ref(false)

const editingId = computed(() => String(route.query.gatheringId || ''))
const selected = computed(() => packages.value.find((item) => item._id === selectedId.value) || null)

const plans = computed(() => packages.value.map((jamPackage) => ({
  id: jamPackage._id,
  title: jamPackage.name,
  description: `Up to ${jamPackage.maxGuests} guests.`,
  price: `₱${jamPackage.pricePhp.toLocaleString()}`,
  button: {
    label: `Select ${jamPackage.name}`,
    color: 'primary' as const,
    size: 'md' as const,
    class: 'font-bold text-white bg-toast-600 hover:bg-toast-700 shadow-md',
    onClick: () => choosePackage(jamPackage._id),
  },
})))

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
      venue.value = gathering.venue
      eventDate.value = toDateInput(gathering.eventDate)
    } else if (route.query.packageId) {
      selectedId.value = String(route.query.packageId)
      name.value = String(route.query.name || '')
      venue.value = String(route.query.venue || '')
      eventDate.value = toDateInput(String(route.query.eventDate || ''))
    }
  } catch (error) {
    toast.add({ title: 'Could not load packages', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
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
    venue: venue.value.trim(),
    eventDate: eventDateIso,
  }
  if (!editingId.value) {
    await navigateTo({ path: '/user/seating-payment', query: details })
    return
  }
  saving.value = true
  try {
    await updateGathering(editingId.value, details)
    await navigateTo({ path: '/user/seating-payment', query: { gatheringId: editingId.value } })
  } catch (error) {
    toast.add({ title: 'Could not save seating plan', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="bg-toast-700 min-h-screen pt-24 sm:pt-28 pb-10">
    <UContainer class="py-4 sm:py-6 space-y-4 max-w-6xl">
      <div
        v-if="!loading && !seatingPlansEnabled"
        class="white-bread-container p-6 text-center space-y-2"
      >
        <h1 class="text-2xl font-bold font-serif">
          Seating is not available yet
        </h1>
        <p class="text-sm">
          This feature is turned off. You can still create a wedding event.
        </p>
      </div>
      <template v-else>
      <div class="text-center space-y-1.5 max-w-2xl mx-auto">
        <UBadge
          color="bread"
          variant="soft"
          size="md"
          class="px-3 py-0.5 font-semibold rounded-full text-toast-900 bg-bread-400"
        >
          Step {{ currentView === 'packages' ? '1' : '2' }} of 2
        </UBadge>
        <h1 class="text-2xl sm:text-3xl font-bold font-serif text-bread-400">
          {{ currentView === 'packages' ? 'Pick a jam plan' : 'Set up the gathering' }}
        </h1>
        <p class="text-xs sm:text-sm text-white/90">
          {{ currentView === 'packages'
            ? 'Every plan includes a seat plan, an invitation and RSVP, and an attendance QR. Choose a guest cap and price.'
            : 'Add the name, venue, and date. You can change the plan before you pay.' }}
        </p>
        <div class="flex justify-center items-center gap-2 pt-1">
          <button
            type="button"
            class="px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer"
            :class="currentView === 'packages' ? 'bg-bread-400 text-toast-900 shadow-sm' : 'bg-toast-800/80 text-bread-200 hover:bg-toast-600'"
            @click="switchView('packages')"
          >
            1. Select package
          </button>
          <span class="text-bread-400/50 text-xs">•</span>
          <button
            type="button"
            class="px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer"
            :class="currentView === 'details' ? 'bg-bread-400 text-toast-900 shadow-sm' : 'bg-toast-800/80 text-bread-200 hover:bg-toast-600'"
            @click="switchView('details')"
          >
            2. Gathering details
          </button>
        </div>
      </div>

      <div
        v-if="loading"
        class="text-center text-white"
      >
        Loading packages...
      </div>
      <div
        v-else-if="packages.length === 0"
        class="white-bread-container p-6 text-center"
      >
        No jam packages are available yet.
      </div>
      <UPricingPlans
        v-else-if="currentView === 'packages'"
        class="gap-4"
      >
        <UPricingPlan
          v-for="plan in plans"
          :key="plan.id"
          v-bind="plan"
          class="text-left bread-container transition-all duration-300"
          :class="selectedId === plan.id ? 'ring-3 ring-toast-600/30' : ''"
          :ui="{
            title: 'font-serif font-bold text-base sm:text-lg',
            description: 'text-xs text-toast-800 min-h-0',
            price: 'text-base font-bold',
          }"
        />
      </UPricingPlans>

      <div
        v-else
        class="max-w-2xl mx-auto"
      >
        <div class="bread-container bg-bread-400 text-toast-900 p-6 sm:p-8 space-y-6">
          <div class="flex items-center justify-between bg-white/80 p-4 rounded-xl border border-toast-600/20">
            <div>
              <span class="text-xs text-toast-600 uppercase font-bold tracking-wider">Selected plan:</span>
              <h3 class="text-lg font-bold font-serif text-toast-900">
                {{ selected?.name }}
              </h3>
              <p class="text-sm">
                Up to {{ selected?.maxGuests }} guests · ₱{{ selected?.pricePhp.toLocaleString() }}
              </p>
            </div>
            <UButton
              variant="outline"
              color="primary"
              size="xs"
              icon="i-lucide-arrow-left"
              @click="switchView('packages')"
            >
              Change package
            </UButton>
          </div>

          <form
            class="space-y-5"
            @submit.prevent="submit"
          >
            <UFormField
              label="Gathering name"
              required
            >
              <UInput
                v-model="name"
                placeholder="Santos reunion"
                size="lg"
                class="w-full bg-white text-toast-900 border-toast-300 rounded-lg"
              />
            </UFormField>
            <UFormField
              label="Venue"
              required
            >
              <UInput
                v-model="venue"
                placeholder="The garden hall"
                size="lg"
                class="w-full bg-white text-toast-900 border-toast-300 rounded-lg"
              />
            </UFormField>
            <UFormField
              label="Date"
              required
            >
              <UInput
                v-model="eventDate"
                type="date"
                size="lg"
                class="w-full bg-white text-toast-900 border-toast-300 rounded-lg"
              />
            </UFormField>
            <div class="pt-4 flex gap-4">
              <UButton
                type="button"
                variant="soft"
                color="neutral"
                size="lg"
                class="w-1/3"
                @click="switchView('packages')"
              >
                Back
              </UButton>
              <UButton
                type="submit"
                color="primary"
                size="lg"
                class="w-2/3 font-bold text-white bg-toast-600 hover:bg-toast-700 shadow-md"
                :loading="saving"
              >
                Continue to payment
              </UButton>
            </div>
          </form>
        </div>
      </div>
      </template>
    </UContainer>
  </div>
</template>
