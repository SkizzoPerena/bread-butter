<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { EventRecord } from '~/types/event'
import { getApiErrorMessage, reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { useInvitation } from '~/composables/useInvitation'
import {
  applyInvitationToEditor,
  buildInvitationPayload,
  buildInvitationUpdatePayload,
  seedInvitationDefaultsFromEvent,
  type InvitationEditorBlock,
} from '~/utils/invitationForm'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  title: 'Invitation Maker',
  bgClass: 'bg-purple-50'
})

const route = useRoute()
const toast = useToast()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { fetchEvent } = useEvents()
const { fetchInvitationByEvent, createInvitation, updateInvitation } = useInvitation()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const invitationId = ref<string | null>(null)
const isLoading = ref(false)
const isSaving = ref(false)
const loadedFromApi = ref(false)

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

const blocks = ref<InvitationEditorBlock[]>([
  { id: Date.now(), type: 'heading', content: 'Schedule of Events' },
  { id: Date.now() + 1, type: 'text', content: 'Ceremony begins at 4:00 PM, with dinner and dancing to follow.' }
])

const isPublished = ref(false)

const saveButtonLabel = computed(() =>
  invitationId.value ? 'Save Invitation' : 'Create Invitation'
)

const navbarActionLabel = computed(() =>
  isPublished.value ? 'Edit Invitation' : saveButtonLabel.value
)

function addScheduleBlock() {
  if (!headingBlock.value) {
    blocks.value.push({ id: Date.now(), type: 'heading', content: 'Schedule of Events' })
  }
  if (!textBlock.value) {
    blocks.value.push({ id: Date.now() + 1, type: 'text', content: 'Ceremony begins at 4:00 PM, with dinner and dancing to follow.' })
  }
}

function removeScheduleBlock() {
  blocks.value = blocks.value.filter(block => block.type !== 'heading' && block.type !== 'text')
}

function enterEditMode() {
  isPublished.value = false
}

async function loadEventContext() {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open Invitation Maker from an event dashboard.',
      color: 'error',
    })
    return
  }

  try {
    const detail = await loadPageData({
      mock: () => ({
        event: {
          _id: eventId.value || 'mock-event-id',
          eventType: 'WEDDING',
          eventName: 'Alex & Jordan',
          description: '',
          venue: 'The Grand Hotel, Cityville',
          eventDate: '2026-06-08T00:00:00.000Z',
          status: 'ONGOING',
          coverImageURL: null,
        },
        guestList: [],
        rsvpSummary: null,
        tasks: null,
      }),
      fetch: async () => fetchEvent(eventId.value),
    })
    eventRecord.value = detail.event
    setActiveEvent(detail.event)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  }
}

async function loadInvitation() {
  if (!eventId.value && !isUiOnlyMode.value) {
    return
  }

  try {
    await loadPageData({
      fetch: async () => {
        const invitation = await fetchInvitationByEvent(eventId.value)
        if (invitation) {
          applyInvitationToEditor(invitation, { rsvpData, blocks })
          invitationId.value = invitation._id
          loadedFromApi.value = true
          isPublished.value = true
        }
      },
      mock: () => undefined,
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not load invitation', error })
  }
}

async function saveInvitation(): Promise<boolean> {
  const targetEventId = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!targetEventId) {
    toast.add({
      title: 'Missing event',
      description: 'Open Invitation Maker from an event dashboard.',
      color: 'error',
    })
    return false
  }

  if (isUiOnlyMode.value) {
    isPublished.value = true
    toast.add({ title: 'Invitation saved', color: 'success' })
    return true
  }

  isSaving.value = true
  try {
    const updatePayload = buildInvitationUpdatePayload({ rsvpData, blocks: blocks.value })

    if (invitationId.value) {
      await updateInvitation(invitationId.value, updatePayload)
    } else {
      try {
        const created = await createInvitation(
          buildInvitationPayload({ eventId: targetEventId, rsvpData, blocks: blocks.value })
        )
        invitationId.value = created._id
      } catch (error) {
        const err = error as { status?: number; statusCode?: number; data?: { message?: string } }
        const status = err.status ?? err.statusCode
        const message = err.data?.message ?? getApiErrorMessage(error)
        if (status === 409 || message.toLowerCase().includes('already has an invitation')) {
          const existing = await fetchInvitationByEvent(targetEventId)
          if (existing) {
            invitationId.value = existing._id
            await updateInvitation(existing._id, updatePayload)
          } else {
            throw error
          }
        } else {
          throw error
        }
      }
    }

    isPublished.value = true
    toast.add({ title: 'Invitation saved', color: 'success' })
    return true
  } catch (error) {
    reportApiError(toast, { title: 'Could not save invitation', error })
    return false
  } finally {
    isSaving.value = false
  }
}

async function handleNavbarAction() {
  if (isPublished.value) {
    enterEditMode()
    return
  }
  await saveInvitation()
}

async function handleFinalStepAction() {
  const saved = await saveInvitation()
  if (saved) {
    isPublished.value = true
  }
}

onMounted(async () => {
  isLoading.value = true
  try {
    await loadEventContext()
    await loadInvitation()
    if (!loadedFromApi.value) {
      seedInvitationDefaultsFromEvent(eventRecord.value, rsvpData)
    }
  } finally {
    isLoading.value = false
  }
})

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

const headingBlock = computed(() => blocks.value.find(b => b.type === 'heading'))
const textBlock = computed(() => blocks.value.find(b => b.type === 'text'))

const formatDateWithWeekday = (dateString: string) => {
  if (!dateString) return ''
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
            Your invitation is live!
          </div>

          <UButton
            :icon="isPublished ? 'i-lucide-pencil' : 'i-lucide-check-circle'"
            :color="isPublished ? 'neutral' : 'purple'"
            :loading="isSaving"
            :disabled="isLoading"
            @click="handleNavbarAction"
          >
            {{ navbarActionLabel }}
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <UContainer>
      <div class="mb-8" />

      <div v-if="isLoading" class="flex justify-center py-16">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-purple-600" />
      </div>

      <UPageGrid
        v-else
        class="items-start"
        :class="{ 'max-w-3xl mx-auto': isPublished }"
        :grid="{ cols: isPublished ? 1 : '1 md:3' }"
      >
        <UPageCard
          v-if="!isPublished"
          class="bread-container col-span-1 p-0 sm:p-0 overflow-hidden flex flex-col max-h-[calc(100vh-125px)]"
          :ui="{ container: 'p-0 sm:p-0 lg:p-0 flex flex-col w-full min-h-0 gap-0' }"
        >
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
              <div v-if="currentStepData?.id === 'core-details'" class="flex flex-col gap-4">
                <UFormField label="Introductory Line">
                  <UInput v-model="rsvpData.requestLine" placeholder="e.g., You are invited to..." class="w-full" />
                </UFormField>
                <UFormField label="Event Headline">
                  <UInput v-model="rsvpData.eventLabel" placeholder="e.g., The Wedding of..." size="lg" class="w-full" />
                </UFormField>
                <div class="grid grid-cols-2 gap-4">
                  <UFormField label="Event Date">
                    <UInput v-model="rsvpData.eventDate" type="date" icon="i-lucide-calendar" class="w-full" />
                  </UFormField>
                  <UFormField label="Event Time">
                    <UInput v-model="rsvpData.eventTime" type="time" icon="i-lucide-clock" class="w-full" />
                  </UFormField>
                </div>
                <UFormField label="Venue">
                  <UInput v-model="rsvpData.eventVenue" placeholder="e.g., The Grand Hotel, Cityville" icon="i-lucide-map-pin" class="w-full" />
                </UFormField>
              </div>

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
                    block
                    @click="removeScheduleBlock()"
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

              <div v-else-if="currentStepData?.id === 'rsvp-deadline'" class="flex flex-col gap-6">
                <UFormField label="Deadline Message">
                  <UTextarea v-model="rsvpData.deadlineText" class="w-full" />
                </UFormField>
                <UFormField label="Deadline Date">
                  <UInput
                    v-model="rsvpData.deadlineDate"
                    type="date"
                    icon="i-lucide-calendar"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </div>
          </UScrollArea>

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
                :loading="isSaving"
                @click="handleFinalStepAction"
                block
              >
                {{ saveButtonLabel }}
              </UButton>
            </div>
          </div>
        </UPageCard>

        <div :class="isPublished ? 'col-span-full' : 'col-span-2'" class="flex flex-col gap-6">
          <UPageCard class="bread-container-bordered border border-toast-400" :class="isPublished ? 'shadow-2xl max-w-3xl mx-auto' : ' '">
            <div class="flex flex-col gap-8 text-center py-8 px-4">
              <div class="space-y-4">
                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                  {{ rsvpData.requestLine || 'Your request line...' }}
                </p>
                <h1 class="text-4xl md:text-5xl font-bold font-serif text-neutral-900 dark:text-white leading-tight">
                  {{ rsvpData.eventLabel || 'Your Event Label...' }}
                </h1>

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

              <div class="flex flex-col">
                <h2 v-if="headingBlock" class="text-2xl font-bold">
                  {{ headingBlock.content }}
                </h2>

                <div
                  v-if="textBlock"
                  class="prose dark:prose-invert max-w-none mx-auto text-center"
                  v-html="textBlock.content"
                />
              </div>

              <div class="mt-8 pt-8 border-t border-neutral-200 dark:border-neutral-800">
                <div
                  class="prose dark:prose-invert mx-auto text-center text-sm"
                  v-html="rsvpData.deadlineText"
                />

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
