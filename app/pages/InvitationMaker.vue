<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

definePageMeta({
  layout: 'eventsubnavbar',
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
            :color="isPublished ? 'neutral' : 'primary'" 
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

          <UPageCard  v-if="!isPublished" class="bread-container">
            <div class="text-2xl font-semibold">Editor</div>

          <!-- REQUIRED FIELD: Core Event Details -->
          <UAccordion :ui="{label: 'text-lg font-semibold'}" :items="[{ label: '1. Core Event Details', slot: 'core-details', defaultOpen: true }]">
            <template #core-details>
              <div class="flex flex-col gap-4 p-4">
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
            </template>
          </UAccordion>

          <!-- FIXED SLOT: Schedule & Details Block -->
          <div>

              <div class="flex justify-between items-center">
                <div class="text-lg font-semibold">
                  2. Schedule & Details
                </div>
                <UButton
                  v-if="headingBlock"
                  icon="i-lucide-trash"
                  color="error"
                  variant="ghost"
                  class="rounded-lg" 
                  @click="removeScheduleBlock()"
                />
                <UButton
                  v-else
                  icon="i-lucide-plus"
                  color="primary"
                  variant="solid"
                  class="rounded-lg" 
                  @click="addScheduleBlock()"
                />
              </div>

            <div v-if="headingBlock || textBlock" class="flex flex-col p-4 gap-4">
              <UFormField v-if="headingBlock" label="Schedule Heading">
                <UInput v-model="headingBlock.content" placeholder="e.g., Schedule of Events" size="lg" class="w-full" />
              </UFormField>
              
              <UFormField v-if="textBlock" label="Details">
                <UTextarea v-model="textBlock.content" class="w-full" placeholder="Add more details like ceremony times, dinner information, etc." />
              </UFormField>
            </div>
          </div>


          <!-- REQUIRED FIELD: RSVP Deadline -->
          <UAccordion :ui="{label: 'text-lg font-semibold'}" :items="[{ label: '3. Set RSVP Deadline (Required)', slot: 'rsvp-deadline', defaultOpen: true }]">
            <template #rsvp-deadline>
              <div class="flex flex-col gap-6 p-4">
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
            </template>
          </UAccordion>

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
                  class="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400 rounded-lg font-semibold text-sm"
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