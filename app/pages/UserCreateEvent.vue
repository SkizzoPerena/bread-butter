<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'

definePageMeta({
  layout: 'signed-in-navbar',
})

useHead({
  title: 'Create Event - Bread + Butter',
})

const toast = useToast()

type ViewStep = 'packages' | 'details'

const currentView = ref<ViewStep>('packages')
const selectedPackage = ref<string>('bread-butter')

const plans = [
  {
    id: 'bread',
    title: 'Bread',
    description: 'Essential tools for your website and guests.',
    price: 'P10,000',
    discount: 'P5,000',
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
    button: {
      label: 'Select Bread Portion',
      color: 'primary' as const,
      size: 'md' as const,
      class: 'font-bold text-white bg-toast-600 hover:bg-toast-700 shadow-md',
      onClick: () => choosePackage('bread')
    }
  },
  {
    id: 'butter',
    title: 'Butter',
    description: 'Advanced planning tools and supplier management.',
    price: 'P15,000',
    discount: 'P7,500',
    features: [
      'All Bread Features',
      'Tasks & Checklists',
      'Suppliers Management',
      'Church Requirements',
      'Schedules (100 email credits)',
      '250 emails'
    ],
    button: {
      label: 'Select Butter Portion',
      color: 'primary' as const,
      size: 'md' as const,
      class: 'font-bold text-white bg-toast-600 hover:bg-toast-700 shadow-md',
      onClick: () => choosePackage('butter')
    }
  },
  {
    id: 'bread-butter',
    title: 'Bread + Butter',
    description: 'The ultimate package with full collaborator access.',
    price: 'P20,000',
    discount: 'P10,000',
    features: [
      'All Bread Features',
      'All Butter Features',
      'Full Collaborator Access',
      'Priority Support',
      '250 emails'
    ],
    button: {
      label: 'Select Bread + Butter',
      color: 'primary' as const,
      size: 'md' as const,
      class: 'font-bold text-white bg-toast-600 hover:bg-toast-700 shadow-md',
      onClick: () => choosePackage('bread-butter')
    }
  }
]

const eventForm = reactive({
  eventName: '',
  eventType: 'WEDDING',
  eventDate: '',
  venue: '',
  description: '',
  isCatholicWedding: false,
})

const isWeddingEventType = computed(() =>
  String(eventForm.eventType || '').trim().toUpperCase() === 'WEDDING',
)

watch(isWeddingEventType, (isWedding) => {
  if (!isWedding) {
    eventForm.isCatholicWedding = false
  }
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

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const minEventDate = computed(() => {
  const min = new Date()
  min.setFullYear(min.getFullYear() + 1)
  return formatDateInputValue(min)
})

function isEventDateAtLeastOneYearOut(dateStr: string): boolean {
  if (!dateStr.trim()) return false
  const selected = new Date(`${dateStr}T00:00:00`)
  const min = new Date()
  min.setFullYear(min.getFullYear() + 1)
  min.setHours(0, 0, 0, 0)
  return selected >= min
}

function switchView(view: ViewStep) {
  currentView.value = view
}

function choosePackage(pkgId: string) {
  selectedPackage.value = pkgId
  switchView('details')
}

function buildDescription(): string {
  const trimmed = eventForm.description.trim()
  if (trimmed) return trimmed

  const name = eventForm.eventName.trim()
  const venue = eventForm.venue.trim()
  if (name && venue) return `${name} at ${venue}`
  if (name) return `${name} celebration`
  return 'Event celebration'
}

function submitEventSetup() {
  if (!eventForm.eventName.trim()) {
    toast.add({
      title: 'Event name required',
      description: 'Please enter a name for your celebration.',
      color: 'warning',
    })
    return
  }

  if (!eventForm.eventDate.trim()) {
    toast.add({
      title: 'Event date required',
      description: 'Please select your target event date.',
      color: 'warning',
    })
    return
  }

  if (!isEventDateAtLeastOneYearOut(eventForm.eventDate)) {
    toast.add({
      title: 'Event date too soon',
      description: 'Please select a date at least one year from today.',
      color: 'warning',
    })
    return
  }

  if (!eventForm.venue.trim()) {
    toast.add({
      title: 'Venue required',
      description: 'Please enter a venue or location for your event.',
      color: 'warning',
    })
    return
  }

  navigateTo({
    path: '/user/payment',
    query: {
      package: selectedPackage.value,
      eventName: eventForm.eventName.trim(),
      eventType: eventForm.eventType,
      eventDate: eventForm.eventDate,
      venue: eventForm.venue.trim(),
      description: buildDescription(),
      isCatholicWedding: isWeddingEventType.value && eventForm.isCatholicWedding ? 'true' : 'false',
    },
  })
}

</script>

<template>
  <div class="bg-toast-700 min-h-screen flex flex-col justify-center">
    <UContainer class="py-4 sm:py-6 space-y-4 max-w-6xl">

      <!-- Header Banner -->
      <div class="text-center space-y-1.5 max-w-2xl mx-auto">
        <UBadge color="bread" variant="soft" size="md"
          class="px-3 py-0.5 font-semibold rounded-full text-toast-900 bg-bread-400">
          Step {{ currentView === 'packages' ? '1' : '2' }} of 2
        </UBadge>
        <h1 class="text-2xl sm:text-3xl font-bold font-serif text-bread-400">
          {{ currentView === 'packages' ? 'Pick Your Portion' : 'Set Up Your Event' }}
        </h1>
        <p class="text-xs sm:text-sm text-white/90">
          {{ currentView === 'packages'
            ? 'Choose a package tailored to your planning needs and celebration budget.'
            : 'Fill in your initial event details to customize your platform experience.' }}
        </p>

        <!-- View Switcher Tabs indicator -->
        <div class="flex justify-center items-center gap-2 pt-1">
          <button @click="switchView('packages')" :class="[
            'px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer',
            currentView === 'packages' ? 'bg-bread-400 text-toast-900 shadow-sm' : 'bg-toast-800/80 text-bread-200 hover:bg-toast-600'
          ]">
            1. Select Package
          </button>
          <span class="text-bread-400/50 text-xs">•</span>
          <button @click="switchView('details')" :class="[
            'px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer',
            currentView === 'details' ? 'bg-bread-400 text-toast-900 shadow-sm' : 'bg-toast-800/80 text-bread-200 hover:bg-toast-600'
          ]">
            2. Event Details
          </button>
        </div>
      </div>

      <!-- VIEW 1: PRODUCT PACKAGES SECTION (Compact UPricingPlans) -->
      <UPricingPlans v-if="currentView === 'packages'" class="gap-4">
        <UPricingPlan v-for="plan in plans" :key="plan.id" v-bind="plan"
          class="text-left bread-container transition-all duration-300"
          :class="selectedPackage === plan.id ? 'ring-3 ring-toast-600/30' : ''" :ui="{

            title: 'font-serif font-bold text-base sm:text-lg',
            description: 'text-xs text-toast-800 min-h-0',
            price: 'text-base font-bold',
            discount: 'text-toast-400 text-xs sm:text-base font-bold',
            feature: 'text-xs py-0.5',
            featureIcon: 'w-3.5 h-3.5 text-toast-700 shrink-0'
          }" />
      </UPricingPlans>

      <!-- VIEW 2: EVENT DETAILS SETUP FORM -->
      <div v-else class="max-w-2xl mx-auto">
        <div class="bread-container bg-bread-400 text-toast-900 p-6 sm:p-8 space-y-6">

          <!-- Selected Package Summary Bar -->
          <div class="flex items-center justify-between bg-white/80 p-4 rounded-xl border border-toast-600/20">
            <div>
              <span class="text-xs text-toast-600 uppercase font-bold tracking-wider">Selected Portion:</span>
              <h3 class="text-lg font-bold font-serif text-toast-900">
                {{plans.find(p => p.id === selectedPackage)?.title}}
              </h3>
            </div>
            <UButton variant="outline" color="primary" size="xs" icon="i-lucide-arrow-left"
              @click="switchView('packages')">
              Change Package
            </UButton>
          </div>

          <h2 class="text-2xl font-bold font-serif text-toast-800 border-b border-toast-600/20 pb-3">
            Event Information
          </h2>

          <div class="space-y-5">
            <UFormField label="Event Name" required>
              <UInput v-model="eventForm.eventName" placeholder="e.g. Mark & Sarah's Wedding" size="lg"
                class="w-full bg-white text-toast-900 border-toast-300 rounded-lg" />
            </UFormField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="Event Type" required>
                <USelect v-model="eventForm.eventType" :items="eventTypeOptions" size="lg"
                  class="w-full bg-white text-toast-900 border-toast-300 rounded-lg" />
              </UFormField>

              <UFormField label="Target Event Date" required
                description="Must be at least one year from today">
                <UInput v-model="eventForm.eventDate" type="date" size="lg" :min="minEventDate"
                  class="w-full bg-white text-toast-900 border-toast-300 rounded-lg" />
              </UFormField>
            </div>

            <UCheckbox
              v-if="isWeddingEventType"
              v-model="eventForm.isCatholicWedding"
              label="Is this a Catholic wedding?"
              class="text-toast-900"
            />

            <UFormField label="Venue / Location" required>
              <UInput v-model="eventForm.venue" placeholder="e.g. Manila Cathedral / Grand Ballroom" size="lg"
                class="w-full bg-white text-toast-900 border-toast-300 rounded-lg" />
            </UFormField>

            <UFormField label="Event Description" required>
              <UTextarea v-model="eventForm.description"
                placeholder="Brief description of your celebration (auto-filled from name and venue if left blank)"
                :rows="3" size="lg" class="w-full bg-white text-toast-900 border-toast-300 rounded-lg" />
            </UFormField>

            <div class="pt-4 flex gap-4">
              <UButton type="button" variant="soft" color="neutral" size="lg" class="w-1/3"
                @click="switchView('packages')">
                Back
              </UButton>
              <UButton type="button" color="primary" size="lg"
                class="w-2/3 font-bold text-white bg-toast-600 hover:bg-toast-700 shadow-md" @click="submitEventSetup">
                Proceed to Payment
              </UButton>
            </div>
          </div>

        </div>
      </div>

    </UContainer>
  </div>
</template>
