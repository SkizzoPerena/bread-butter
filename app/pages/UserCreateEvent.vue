<script setup lang="ts">
import { ref, reactive } from 'vue'

definePageMeta({
  layout: 'landing-navbar',
})

useHead({
  title: 'Create Event - Bread + Butter',
})

const router = useRouter()
const toast = useToast()

type ViewStep = 'packages' | 'details'

const currentView = ref<ViewStep>('packages')
const selectedPackage = ref<string>('bread-butter') // default or selected

const packagesList = [
  {
    id: 'bread',
    title: 'Bread',
    description: 'Essential tools for your website and guests.',
    price: 'P10,000',
    discount: 'P5,000',
    badge: 'Basic',
    features: [
      'Website Builder',
      'Guest List',
      'RSVP',
      'Invitations',
      'Playlist',
      'Gifts',
      'Payments Management',
      '100 emails'
    ],
    buttonText: 'Select Bread Portion'
  },
  {
    id: 'butter',
    title: 'Butter',
    description: 'Advanced planning tools and supplier management.',
    price: 'P15,000',
    discount: 'P7,500',
    badge: 'Popular',
    features: [
      'All Bread Features',
      'Tasks & Checklists',
      'Suppliers Management',
      'Church Requirements',
      'Schedules (100 email credits)',
      '250 emails'
    ],
    buttonText: 'Select Butter Portion'
  },
  {
    id: 'bread-butter',
    title: 'Bread + Butter',
    description: 'The ultimate package with full collaborator access.',
    price: 'P20,000',
    discount: 'P10,000',
    badge: 'Complete',
    features: [
      'All Bread Features',
      'All Butter Features',
      'Full Collaborator Access',
      'Priority Support',
      '250 emails'
    ],
    buttonText: 'Select Bread + Butter'
  }
]

const eventForm = reactive({
  eventName: '',
  eventType: 'WEDDING',
  eventDate: '',
  venue: '',
  guestCount: 100,
})

const eventTypeOptions = [
  { label: 'Wedding', value: 'WEDDING' },
  { label: 'Birthday', value: 'BIRTHDAY' },
  { label: 'Debut', value: 'DEBUT' },
  { label: 'Baptism', value: 'BAPTISM' },
  { label: 'Anniversary', value: 'ANNIVERSARY' },
  { label: 'Corporate Event', value: 'CORPORATE' },
  { label: 'Special Party', value: 'PARTY' }
]

function switchView(view: ViewStep) {
  currentView.value = view
}

function choosePackage(pkgId: string) {
  selectedPackage.value = pkgId
  switchView('details')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function submitEventSetup() {
  if (!eventForm.eventName.trim()) {
    toast.add({
      title: 'Event name required',
      description: 'Please enter a name for your celebration.',
      color: 'warning'
    })
    return
  }

  // Navigate to Payment page with query parameters
  navigateTo({
    path: '/user/payment',
    query: {
      package: selectedPackage.value,
      eventName: eventForm.eventName,
      eventType: eventForm.eventType,
      eventDate: eventForm.eventDate,
      venue: eventForm.venue,
      guestCount: String(eventForm.guestCount)
    }
  })
}
</script>

<template>
  <div class="min-h-screen bg-toast-700 text-white pt-24 lg:pt-28 pb-20 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto space-y-8">

      <!-- Header Banner -->
      <div class="text-center space-y-3 max-w-3xl mx-auto">
        <UBadge color="bread" variant="soft" size="lg" class="px-3.5 py-1 font-semibold rounded-full text-toast-900 bg-bread-400">
          Step {{ currentView === 'packages' ? '1' : '2' }} of 2
        </UBadge>
        <h1 class="text-4xl sm:text-5xl font-bold font-serif text-bread-400">
          {{ currentView === 'packages' ? 'Pick Your Portion' : 'Set Up Your Event' }}
        </h1>
        <p class="text-lg text-white">
          {{ currentView === 'packages' 
            ? 'Choose a package tailored to your planning needs and celebration budget.' 
            : 'Fill in your initial event details to customize your platform experience.' }}
        </p>

        <!-- View Switcher Tabs indicator -->
        <div class="flex justify-center items-center gap-3 pt-2">
          <button
            @click="switchView('packages')"
            :class="[
              'px-4 py-1.5 rounded-full text-xs font-bold transition-all',
              currentView === 'packages' ? 'bg-bread-400 text-toast-900 shadow-md' : 'bg-toast-800/80 text-bread-200 hover:bg-toast-600'
            ]"
          >
            1. Select Package
          </button>
          <span class="text-bread-400/50">•</span>
          <button
            @click="switchView('details')"
            :class="[
              'px-4 py-1.5 rounded-full text-xs font-bold transition-all',
              currentView === 'details' ? 'bg-bread-400 text-toast-900 shadow-md' : 'bg-toast-800/80 text-bread-200 hover:bg-toast-600'
            ]"
          >
            2. Event Details
          </button>
        </div>
      </div>

      <!-- VIEW 1: PRODUCT PACKAGES SECTION (matching index.vue pricing section) -->
      <div v-if="currentView === 'packages'" class="space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          <div
            v-for="pkg in packagesList"
            :key="pkg.id"
            :class="[
              'bread-container transition-all duration-300 p-6 sm:p-8 bg-bread-400 text-toast-900 flex flex-col justify-between relative border-2',
              selectedPackage === pkg.id ? 'border-toast-600 shadow-2xl ring-4 ring-toast-600/30 scale-102' : 'border-transparent hover:border-toast-400'
            ]"
          >
            <div class="space-y-4">
              <div class="flex justify-between items-center">
                <span class="font-serif font-bold text-2xl text-toast-900">{{ pkg.title }}</span>
                <UBadge color="toast" variant="solid" size="xs" class="font-bold">
                  {{ pkg.badge }}
                </UBadge>
              </div>

              <p class="text-sm text-toast-800 min-h-10">{{ pkg.description }}</p>

              <div class="border-y border-toast-600/20 py-4 my-4">
                <div class="text-xs text-toast-600 line-through font-medium">Original: {{ pkg.price }}</div>
                <div class="text-3xl font-bold font-serif text-toast-700 mt-1">
                  {{ pkg.discount }} <span class="text-xs font-sans font-normal text-toast-800">/ event</span>
                </div>
              </div>

              <!-- Included Features List -->
              <div class="space-y-2 pt-2">
                <p class="text-xs font-bold uppercase tracking-wider text-toast-700">Includes:</p>
                <ul class="space-y-2 text-sm text-toast-900">
                  <li v-for="(feat, fIdx) in pkg.features" :key="fIdx" class="flex items-center gap-2">
                    <UIcon name="i-lucide-check-circle" class="w-4 h-4 text-toast-600 shrink-0" />
                    <span>{{ feat }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Action Button -->
            <div class="pt-6">
              <UButton
                block
                color="primary"
                size="lg"
                class="font-bold text-white shadow-md bg-toast-600 hover:bg-toast-700"
                @click="choosePackage(pkg.id)"
              >
                {{ pkg.buttonText }}
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 2: EVENT DETAILS SETUP FORM -->
      <div v-else class="max-w-2xl mx-auto">
        <div class="bread-container bg-bread-400 text-toast-900 p-6 sm:p-10 space-y-6">
          
          <!-- Selected Package Summary Bar -->
          <div class="flex items-center justify-between bg-white/80 p-4 rounded-xl border border-toast-600/20">
            <div>
              <span class="text-xs text-toast-600 uppercase font-bold tracking-wider">Selected Portion:</span>
              <h3 class="text-lg font-bold font-serif text-toast-900">
                {{ packagesList.find(p => p.id === selectedPackage)?.title }}
              </h3>
            </div>
            <UButton
              variant="outline"
              color="primary"
              size="xs"
              icon="i-lucide-arrow-left"
              @click="switchView('packages')"
            >
              Change Package
            </UButton>
          </div>

          <h2 class="text-2xl font-bold font-serif text-toast-800 border-b border-toast-600/20 pb-3">
            Event Information
          </h2>

          <div class="space-y-5">
            <UFormField label="Event Name" required>
              <UInput
                v-model="eventForm.eventName"
                placeholder="e.g. Mark & Sarah's Wedding"
                size="lg"
                class="w-full bg-white text-toast-900 border-toast-300 rounded-lg"
              />
            </UFormField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="Event Type" required>
                <USelect
                  v-model="eventForm.eventType"
                  :items="eventTypeOptions"
                  size="lg"
                  class="w-full bg-white text-toast-900 border-toast-300 rounded-lg"
                />
              </UFormField>

              <UFormField label="Target Event Date">
                <UInput
                  v-model="eventForm.eventDate"
                  type="date"
                  size="lg"
                  class="w-full bg-white text-toast-900 border-toast-300 rounded-lg"
                />
              </UFormField>
            </div>

            <UFormField label="Venue / Location">
              <UInput
                v-model="eventForm.venue"
                placeholder="e.g. Manila Cathedral / Grand Ballroom"
                size="lg"
                class="w-full bg-white text-toast-900 border-toast-300 rounded-lg"
              />
            </UFormField>

            <UFormField label="Estimated Guest Count">
              <UInput
                v-model.number="eventForm.guestCount"
                type="number"
                min="1"
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
                type="button"
                color="primary"
                size="lg"
                class="w-2/3 font-bold text-white bg-toast-600 hover:bg-toast-700 shadow-md"
                @click="submitEventSetup"
              >
                Proceed to Payment
              </UButton>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>
