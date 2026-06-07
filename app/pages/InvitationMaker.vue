<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  title: 'Invitation Maker',
  bgClass: 'bg-purple-50'
})

// 1. Required RSVP Data
const rsvpData = reactive({
  requestLine: 'Together with their families',
  eventLabel: 'Alex & Jordan are getting married!',
  eventDate: '',
  eventTime: '',
  eventVenue: '',
  deadlineText: 'Please let us know if you can make it so we can accomodate you.',
  deadlineDate: '' 
})

// 2. Dynamic Blocks Data
interface Block {
  id: number;
  type: 'heading' | 'text';
  content: string;
}

const blocks = ref<Block[]>([
  { id: Date.now(), type: 'heading', content: 'Schedule of Events' },
  { id: Date.now() + 1, type: 'text', content: 'Ceremony begins at 4:00 PM, with dinner and dancing to follow.' }
])

const isPublished = ref(false)

const addScheduleBlock = () => {
  // Add both blocks if they don't exist.
  if (!headingBlock.value) {
    blocks.value.push({ id: Date.now(), type: 'heading', content: 'Schedule of Events' })
  }
  if (!textBlock.value) {
    blocks.value.push({ id: Date.now() + 1, type: 'text', content: 'Ceremony begins at 4:00 PM, with dinner and dancing to follow.' })
  }
}

const removeScheduleBlock = () => {
  // Remove both heading and text blocks
  blocks.value = blocks.value.filter(block => block.type !== 'heading' && block.type !== 'text')
}

const togglePublish = () => {
  isPublished.value = !isPublished.value
}

const currentStep = ref(0)

interface StepDef {
  id: string
  icon: string
  label: string
  description: string
}

const invitationSteps = computed<StepDef[]>(() => [
  {
    id: 'core-details', icon: 'i-lucide-info', label: '1. Core Event Details',
    description: 'Provide the essential details for your event, like the title, date, and venue.'
  },
  {
    id: 'schedule-details', icon: 'i-lucide-list', label: '2. Schedule & Details',
    description: 'Add a schedule or any extra details your guests might need.'
  },
  {
    id: 'rsvp-deadline', icon: 'i-lucide-calendar-clock', label: '3. Set RSVP Deadline',
    description: 'Configure when and how your guests should respond.'
  }
])

const currentStepData = computed(() => invitationSteps.value[currentStep.value])

// 3. Computed properties to grab specific blocks to lock their layout positions
const headingBlock = computed(() => blocks.value.find(b => b.type === 'heading'))
const textBlock = computed(() => blocks.value.find(b => b.type === 'text'))

const formatDateWithWeekday = (dateString: string) => {
  if (!dateString) return ''
  // The input type="date" provides a string in 'YYYY-MM-DD' format.
  // new Date('YYYY-MM-DD') can be interpreted as UTC time, which might lead to off-by-one day errors in some timezones.
  // To treat it as a local date, we replace hyphens with slashes.
  const date = new Date(dateString.replace(/-/g, '/'))
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatTime = (timeString: string) => {
  if (!timeString) return ''
  // Create a dummy date object to use toLocaleTimeString.
  // The date part is arbitrary; only the time matters.
  const date = new Date(`1970-01-01T${timeString}`)
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

</script>

<template>
  <div>
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div class="flex items-center gap-4">
          <div v-if="isPublished" class="text-sm md:text-base font-medium text-success-600 dark:text-success-400">
            ✨ Your invitation is live!
          </div>
          
          <UButton 
            :icon="isPublished ? 'i-lucide-pencil' : 'i-lucide-check-circle'" 
            :color="isPublished ? 'neutral' : 'purple'" 
            @click="togglePublish"
          >
            {{ isPublished ? 'Edit Invitation' : 'Create Invitation' }}
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>
    
    <!-- Main Content Container -->
    <UContainer>
      <div  class="mb-8"></div>
      <UPageGrid class="items-start" :class="{ 'max-w-3xl mx-auto': isPublished }" :grid="{ cols: isPublished ? 1 : '1 md:3' }">
        
        
        <!-- LEFT SIDE: Content Blocks Form -->

        <UPageCard 
          v-if="!isPublished" 
          class="bread-container col-span-1 p-0 sm:p-0 overflow-hidden flex flex-col max-h-[calc(100vh-125px)]"
          :ui="{ container: 'p-0 sm:p-0 lg:p-0 flex flex-col w-full min-h-0 gap-0' }"
        >
          <!-- Static Header -->
          <div class="px-6 pt-6 pb-4 shrink-0">
            <div class="relative flex justify-center items-center text-xl font-semibold mb-1">
              <UButton 
                v-if="currentStep > 0" 
                icon="i-lucide-arrow-left" 
                color="neutral" 
                variant="ghost"
                class="absolute left-0 p-2" 
                aria-label="Previous Step" 
                @click="currentStep--" 
              />
              <span>{{ currentStepData?.label }}</span>
            </div>
            <p class="text-center text-sm mx-3 text-muted">
              {{ currentStepData?.description }}
            </p>
          </div>

          <UScrollArea class="w-full shrink min-h-0 my-0 py-0">
            <div class="px-6 py-4">
              <!-- Step 1: Core Details -->
              <div v-if="currentStepData?.id === 'core-details'" class="flex flex-col gap-4">
                <UFormField label="Introductory Line">
                  <UInput v-model="rsvpData.requestLine" placeholder="e.g., You are invited to..." class="w-full" />
                </UFormField>
                <UFormField label="Event Headline">
                  <UInput v-model="rsvpData.eventLabel" placeholder="e.g., The Wedding of..." size="lg" class="w-full" />
                </UFormField>
                <div class="grid grid-cols-2 gap-4">
                  <UFormField label="Event Date">
                    <UInput type="date" v-model="rsvpData.eventDate" icon="i-lucide-calendar" class="w-full" />
                  </UFormField>
                  <UFormField label="Event Time">
                    <UInput type="time" v-model="rsvpData.eventTime" icon="i-lucide-clock" class="w-full" />
                  </UFormField>
                </div>
                <UFormField label="Venue">
                  <UInput v-model="rsvpData.eventVenue" placeholder="e.g., The Grand Hotel, Cityville" icon="i-lucide-map-pin" class="w-full" />
                </UFormField>
              </div>

              <!-- Step 2: Schedule & Details -->
              <div v-else-if="currentStepData?.id === 'schedule-details'" class="flex flex-col gap-4">
                <UButton
                  v-if="!headingBlock && !textBlock"
                  icon="i-lucide-plus"
                  color="purple"
                  variant="outline"
                  block
                  @click="addScheduleBlock()"
                >
                  Add Schedule Block
                </UButton>
                <div v-else class="flex justify-end">
                  <UButton
                    icon="i-lucide-trash"
                    color="error"
                    variant="ghost"
                    @click="removeScheduleBlock()"
                    block
                  >
                    Remove Block
                  </UButton>
                </div>

                <UFormField v-if="headingBlock" label="Schedule Heading">
                  <UInput v-model="headingBlock.content" placeholder="e.g., Schedule of Events" size="lg" class="w-full" />
                </UFormField>
                <UFormField v-if="textBlock" label="Details">
                  <UTextarea v-model="textBlock.content" class="w-full" placeholder="Add more details like ceremony times, dinner information, etc." />
                </UFormField>
              </div>

              <!-- Step 3: RSVP Deadline -->
              <div v-else-if="currentStepData?.id === 'rsvp-deadline'" class="flex flex-col gap-6">
                <UFormField label="Deadline Message">
                  <UTextarea v-model="rsvpData.deadlineText" class="w-full" />
                </UFormField>
                <UFormField label="Deadline Date">
                  <UInput 
                    type="date" 
                    v-model="rsvpData.deadlineDate" 
                    icon="i-lucide-calendar" 
                    class="w-full"
                  />
                </UFormField>
              </div>
            </div>
          </UScrollArea>

          <!-- Static Footer -->
          <div class="pb-6 px-6 pt-4 shrink-0">
            <div class="flex justify-end items-center">
              <UButton 
                v-if="currentStep < invitationSteps.length - 1" 
                icon="i-lucide-arrow-right"
                color="purple" 
                @click="currentStep++" 
                block 
              >
                Next Step
              </UButton>
              <UButton 
                v-else
                icon="i-lucide-check-circle"
                color="purple" 
                @click="togglePublish" 
                block 
              >
                Create Invitation
              </UButton>
            </div>
          </div>

        </UPageCard>

        <!-- RIGHT SIDE: Live Preview / Final Invitation -->
        <div :class="isPublished ? 'col-span-full' : 'col-span-2'" class="flex flex-col gap-6">          
          <UPageCard class="bread-container-bordered border border-toast-400" :class="isPublished ? 'shadow-2xl max-w-3xl mx-auto' : ' '">
            <div class="flex flex-col gap-8 text-center py-8 px-4">
              
              <!-- 1. Header Area (Fixed Fields) -->
              <div class="space-y-4">
                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                  {{ rsvpData.requestLine || 'Your request line...' }}
                </p>
                <h1 class="text-4xl md:text-5xl font-bold font-serif text-neutral-900 dark:text-white leading-tight">
                  {{ rsvpData.eventLabel || 'Your Event Label...' }}
                </h1>
                
                <!-- Date, Time, and Venue -->
                <div class="mt-6 flex flex-col items-center text-neutral-700 dark:text-neutral-300">
                  <div class="text-lg font-semibold uppercase">
                      {{ formatDateWithWeekday(rsvpData.eventDate) || 'Event Date' }}
                  </div>
                  <div>{{ formatTime(rsvpData.eventTime) || 'Event Time' }}</div>
                  <div class="flex items-center font-semibold font-serif pt-2">
                    {{ rsvpData.eventVenue || 'Event Venue Placeholder' }}
                  </div>
                </div>
              </div>

              <!-- 2. Dynamic Body Area (Locked Positions) -->
              <div class="flex flex-col">
                <h2 v-if="headingBlock" class="text-2xl font-bold">
                  {{ headingBlock.content }}
                </h2>
                
                <div 
                  v-if="textBlock"
                  class="prose dark:prose-invert max-w-none mx-auto text-center" 
                  v-html="textBlock.content"
                ></div>
              </div>

              <!-- 3. Footer Area (RSVP Deadline) -->
              <div class="mt-8 pt-8 border-t border-neutral-200 dark:border-neutral-800">
                <div 
                  class="prose dark:prose-invert mx-auto text-center text-sm" 
                  v-html="rsvpData.deadlineText"
                ></div>
                
                <div 
                  v-if="rsvpData.deadlineDate" 
                  class="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400 rounded-lg font-semibold text-sm"
                >
                  <UIcon name="i-lucide-calendar" class="w-5 h-5" />
                  RSVP by {{ formatDateWithWeekday(rsvpData.deadlineDate) }}
                </div>
              </div>

            </div>
          </UPageCard>
        </div>
      </UPageGrid>
    </UContainer>
  </div>
</template>