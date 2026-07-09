<script lang="ts" setup>
import {
  CalendarDate,
  DateFormatter,
  getLocalTimeZone,
  today,
} from '@internationalized/date'
import type { EventRecord } from '~/types/event'
import type { SubEventRecord } from '~/types/subEvent'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { EVENT_FEATURE } from '~/utils/eventTierFeatures'
import {
  isSubEventDateBeforeParent,
  parentEventMaxSubEventDate,
} from '~/utils/subEventDate'
import { calendarDateToUtcIso } from '~/utils/taskFormat'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Schedules',
  bgClass: 'bg-cyan-50',
})

const EMOJI_RE = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { requireEventFeature } = useEventFeatureGate()
const { fetchSubEventsByEvent, createSubEvent } = useSubEvents()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const subEvents = ref<SubEventRecord[]>([])
const isLoadingEvent = ref(false)
const isLoadingSubEvents = ref(false)
const isAddModalOpen = ref(false)
const isSubmitting = ref(false)

const addForm = reactive({
  name: '',
  venue: '',
  description: '',
})

const selectedDate = shallowRef<CalendarDate | null>(null)
const minSubEventDate = today(getLocalTimeZone())

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')
const mutationsDisabled = computed(
  () => isEventCancelled.value || (!eventId.value && !isUiOnlyMode.value)
)

const parentEventDateLabel = computed(() => {
  const iso = eventRecord.value?.eventDate
  if (!iso) {
    return isUiOnlyMode.value ? 'May 18, 2026' : ''
  }
  return df.format(new Date(iso))
})

const maxSubEventDate = computed(() => {
  const iso = eventRecord.value?.eventDate
  if (!iso) {
    return isUiOnlyMode.value
      ? parentEventMaxSubEventDate('2026-05-18T00:00:00.000Z')
      : null
  }
  return parentEventMaxSubEventDate(iso)
})

const selectedDateLabel = computed(() => {
  if (!selectedDate.value) {
    return 'Select a date'
  }
  return df.format(selectedDate.value.toDate(getLocalTimeZone()))
})

function navigateToSubEvent(subEvent: SubEventRecord) {
  const targetEventId = eventId.value || 'mock-event-id'
  navigateTo({
    path: '/SubEventDashboard',
    query: {
      eventId: targetEventId,
      subEventId: subEvent._id,
    },
  })
}

function formatSubEventDate(iso?: string | null): string {
  if (!iso) {
    return 'Date TBD'
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return 'Date TBD'
  }
  return df.format(date)
}

function resetAddForm() {
  addForm.name = ''
  addForm.venue = ''
  addForm.description = ''
  selectedDate.value = null
}

function openAddModal() {
  resetAddForm()
  isAddModalOpen.value = true
}

function validateAddForm(): string | null {
  const name = addForm.name.trim()
  if (!name) {
    return 'Sub-event name is required.'
  }
  if (EMOJI_RE.test(name)) {
    return 'Sub-event name must not contain emojis.'
  }
  if (addForm.venue.trim() && EMOJI_RE.test(addForm.venue)) {
    return 'Venue must not contain emojis.'
  }
  if (addForm.description.trim() && EMOJI_RE.test(addForm.description)) {
    return 'Description must not contain emojis.'
  }
  if (!selectedDate.value) {
    return 'Sub-event date is required.'
  }
  const parentIso = eventRecord.value?.eventDate
  if (!parentIso) {
    return 'Main event date is unavailable.'
  }
  const subEventIso = calendarDateToUtcIso(selectedDate.value)
  if (!isSubEventDateBeforeParent(subEventIso, parentIso)) {
    return 'Sub-event date must be before the main event date.'
  }
  return null
}

async function loadSubEvents(targetEventId: string) {
  isLoadingSubEvents.value = true
  try {
    subEvents.value = await fetchSubEventsByEvent(targetEventId)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load schedules', error })
    subEvents.value = []
  } finally {
    isLoadingSubEvents.value = false
  }
}

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    eventRecord.value = null
    subEvents.value = []
    return
  }

  const targetEventId = eventId.value || 'mock-event-id'
  isLoadingEvent.value = true

  try {
    const detail = await loadPageData({
      fetch: async () => fetchEvent(targetEventId),
      mock: () => ({
        event: {
          _id: targetEventId,
          eventType: 'WEDDING',
          eventName: "Jane & John's Wedding",
          description: 'Mock event',
          venue: 'Manila Cathedral',
          eventDate: '2026-05-18T00:00:00.000Z',
          status: 'ONGOING',
        } satisfies EventRecord,
        guestList: [],
        rsvpSummary: null,
        tasks: null,
      }),
    })
    eventRecord.value = detail.event
    setActiveEvent(detail.event)
    await loadSubEvents(targetEventId)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
  }
}

async function handleAddSubEvent() {
  const validationError = validateAddForm()
  if (validationError) {
    toast.add({ title: 'Validation error', description: validationError, color: 'error' })
    return
  }
  if (!selectedDate.value) {
    return
  }

  const targetEventId = eventId.value || 'mock-event-id'
  isSubmitting.value = true
  try {
    await createSubEvent({
      eventId: targetEventId,
      name: addForm.name.trim(),
      venue: addForm.venue.trim() || undefined,
      description: addForm.description.trim() || undefined,
      eventDate: calendarDateToUtcIso(selectedDate.value),
    })
    toast.add({
      title: 'Sub-event added',
      description: 'The schedule has been updated.',
      color: 'success',
    })
    isAddModalOpen.value = false
    await loadSubEvents(targetEventId)
  } catch (error) {
    reportApiError(toast, { title: 'Could not add sub-event', error })
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    navigateTo('/UserDashboard')
    return
  }

  const allowed = await requireEventFeature(EVENT_FEATURE.SCHEDULES)
  if (!allowed) {
    return
  }

  loadEventData()
})

watch(eventId, () => {
  loadEventData()
})
</script>

<template>
  <UContainer class="space-y-6 py-8 pb-12">
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <UButton
          icon="i-lucide-plus"
          color="cyan"
          :disabled="mutationsDisabled"
          @click="openAddModal"
        >
          Add Sub-Event
        </UButton>
      </Teleport>
    </ClientOnly>

    <div
      v-if="isLoadingEvent"
      class="flex items-center justify-center py-16 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading event...</span>
    </div>

    <UPageCard v-else class="white-bread-container space-y-6">
      <UAlert
        v-if="isEventCancelled"
        color="warning"
        variant="subtle"
        title="Event cancelled"
        description="Schedules cannot be modified for a cancelled event."
      />

      <div
        v-if="isLoadingSubEvents"
        class="flex items-center justify-center py-12 text-muted"
      >
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
        <span class="ml-2 text-sm">Loading schedules...</span>
      </div>

      <div
        v-else-if="!subEvents.length"
        class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center"
      >
        <UIcon name="i-lucide-calendar-days" class="size-10 text-muted" />
        <p class="mt-4 text-base font-medium">No sub-events yet</p>
        <p class="mt-1 max-w-sm text-sm text-muted">
          Add schedule items like welcome parties or rehearsal dinners. Each sub-event date must be before your main event on {{ parentEventDateLabel }}.
        </p>
        <UButton
          v-if="!mutationsDisabled"
          class="mt-6"
          color="cyan"
          icon="i-lucide-plus"
          @click="openAddModal"
        >
          Add Sub-Event
        </UButton>
      </div>

      <div v-else class="space-y-3">
        <UPageCard
          v-for="subEvent in subEvents"
          :key="subEvent._id"
          class="cursor-pointer bg-cyan-50/50 transition-colors hover:bg-cyan-50 dark:bg-cyan-900/10 dark:hover:bg-cyan-900/20 ring ring-inset ring-cyan-500/20"
          @click="navigateToSubEvent(subEvent)"
        >
          <div class="space-y-2">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <p class="font-semibold text-highlighted">
                {{ subEvent.name }}
              </p>
              <div class="flex items-center gap-2">
                <UBadge color="cyan" variant="subtle">
                  {{ formatSubEventDate(subEvent.eventDate) }}
                </UBadge>
                <UIcon name="i-lucide-chevron-right" class="size-4 text-muted" />
              </div>
            </div>
            <p v-if="subEvent.venue" class="text-sm text-muted">
              <UIcon name="i-lucide-map-pin" class="inline size-4 -mt-0.5" />
              {{ subEvent.venue }}
            </p>
            <p v-if="subEvent.description" class="text-sm text-muted">
              {{ subEvent.description }}
            </p>
          </div>
        </UPageCard>
      </div>
    </UPageCard>

    <UModal
      v-model:open="isAddModalOpen"
      title="Add Sub-Event"
      :dismissible="!isSubmitting"
      :ui="{ content: 'border-none ring-transparent max-w-md' }"
    >
      <template #body>
        <form class="space-y-4" @submit.prevent="handleAddSubEvent">
          <UFormField label="Name" name="name" required>
            <UInput
              v-model="addForm.name"
              class="w-full"
              placeholder="Rehearsal Dinner"
              :disabled="isSubmitting"
            />
          </UFormField>

          <UFormField label="Date" name="eventDate" required>
            <UPopover>
              <UButton
                color="neutral"
                variant="outline"
                class="w-full"
                :disabled="isSubmitting || !maxSubEventDate"
              >
                {{ selectedDateLabel }}
              </UButton>
              <template #content="{ close }">
                <UCalendar
                  v-if="maxSubEventDate"
                  v-model="selectedDate"
                  class="p-2"
                  :min-value="minSubEventDate"
                  :max-value="maxSubEventDate"
                  @update:model-value="close"
                />
              </template>
            </UPopover>
            <p v-if="parentEventDateLabel" class="mt-1 text-xs text-muted">
              Must be before {{ parentEventDateLabel }}
            </p>
          </UFormField>

          <UFormField label="Venue" name="venue">
            <UInput
              v-model="addForm.venue"
              class="w-full"
              placeholder="Optional"
              :disabled="isSubmitting"
            />
          </UFormField>

          <UFormField label="Description" name="description">
            <UTextarea
              v-model="addForm.description"
              class="w-full"
              placeholder="Optional"
              :disabled="isSubmitting"
            />
          </UFormField>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              type="button"
              variant="outline"
              color="neutral"
              :disabled="isSubmitting"
              @click="isAddModalOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              color="cyan"
              :loading="isSubmitting"
              :disabled="isSubmitting"
            >
              Add Sub-Event
            </UButton>
          </div>
        </form>
      </template>
    </UModal>
  </UContainer>
</template>
