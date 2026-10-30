<script lang="ts" setup>
import { DateFormatter } from '@internationalized/date'
import type { EventRecord } from '~/types/event'
import { eventTypeOptionsFor } from '~/types/event'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { defaultCover, resolveEventCoverImageUrl } from '~/utils/eventImage'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Settings',
  bgClass: 'bg-slate-50',
})

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { finishPageTransition } = usePageTransition()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const isLoadingEvent = ref(false)

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const {
  form,
  isSubmitting,
  isEventCancelled,
  isWeddingEvent,
  isDateEditEnabled,
  isDateWarningModalOpen,
  dateShiftDays,
  promptEnableDateEdit,
  confirmEnableDateEdit,
  cancelEnableDateEdit,
  submit,
} = useEventSettingsForm({
  eventId,
  eventRecord,
})

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const minEventDate = computed(() => formatDateInputValue(new Date()))

const eventCoverUrl = computed(() =>
  resolveEventCoverImageUrl(eventRecord.value?.coverImageURL)
)

const overviewDateLabel = computed(() => {
  const iso = eventRecord.value?.eventDate
  if (iso) {
    return df.format(new Date(iso))
  }
  if (isUiOnlyMode.value) {
    return 'May 18, 2026'
  }
  return ''
})

const overviewVenue = computed(() => eventRecord.value?.venue ?? '')
const overviewTitle = computed(() => eventRecord.value?.eventName ?? 'Event Settings')

const statusBadge = computed(() => {
  if (eventRecord.value?.status === 'CANCELLED') {
    return { label: 'Cancelled', color: 'error' as const }
  }
  return { label: 'Ongoing', color: 'success' as const }
})

function onCoverImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = defaultCover
}

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    eventRecord.value = null
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
          coverImageURL: null,
        } satisfies EventRecord,
        guestList: [],
        rsvpSummary: null,
        tasks: null,
      }),
    })
    eventRecord.value = detail.event
    setActiveEvent(detail.event)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
    finishPageTransition()
  }
}

onMounted(() => {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    navigateTo('/')
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

    <div
      v-if="isLoadingEvent"
      class="flex items-center justify-center py-16 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading event...</span>
    </div>

    <div v-else class="space-y-6">
      <ClientOnly>
        <Teleport to="#navbar-actions">
          <UButton
            icon="i-lucide-save"
            color="slate"
            :loading="isSubmitting"
            :disabled="isEventCancelled"
            @click="submit"
          >
            Save Settings
          </UButton>
        </Teleport>
      </ClientOnly>

      <UPageGrid class="md:grid-cols-3 items-start">
        <div class="col-span-1 flex flex-col gap-4">
          <UAlert
            v-if="isEventCancelled"
            color="warning"
            variant="subtle"
            title="Event cancelled"
            description="This event is cancelled. You can still update its details here."
          />

          <UPageCard class="white-bread-container">
            <div class="mb-4 text-xl font-semibold font-serif text-muted">
              Edit event details
            </div>

            <UForm class="space-y-4" @submit.prevent="submit">
              <UFormField label="Event Name" name="eventName" required>
                <UInput v-model="form.eventName" class="w-full" placeholder="Jane & John's Wedding" />
              </UFormField>

              <UFormField label="Event Type" name="eventType" required>
                <USelect v-model="form.eventType" :items="eventTypeOptionsFor(eventRecord?.eventType)" class="w-full" />
              </UFormField>

              <UCheckbox
                v-if="isWeddingEvent"
                v-model="form.isCatholicWedding"
                label="Is this a Catholic Wedding?"
              />

              <UFormField label="Target Event Date" name="eventDate" required>
                <!-- Locked Date Display with Change Date button -->
                <div
                  v-if="!isDateEditEnabled"
                  class="flex items-center justify-between p-2.5 sm:p-3 rounded-lg border border-bread-300 bg-bread-50/50 text-sm transition-colors"
                >
                  <div class="flex items-center gap-2.5 text-toast-900 font-medium">
                    <UIcon name="i-lucide-calendar" class="size-4 text-toast-600 shrink-0" />
                    <span>{{ overviewDateLabel || 'No date set' }}</span>
                  </div>
                  <UButton
                    type="button"
                    size="xs"
                    color="primary"
                    variant="soft"
                    icon="i-lucide-pencil"
                    :disabled="isEventCancelled"
                    class="cursor-pointer font-medium shadow-xs"
                    @click="promptEnableDateEdit"
                  >
                    Change Date
                  </UButton>
                </div>

                <!-- Unlocked Date Input -->
                <div v-else class="space-y-2">
                  <div class="flex items-center gap-2">
                    <UInput
                      v-model="form.eventDate"
                      type="date"
                      :min="minEventDate"
                      class="w-full bg-white font-sans"
                      required
                    />
                    <UButton
                      type="button"
                      size="sm"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-lock"
                      class="cursor-pointer text-muted hover:text-toast-900 shrink-0"
                      title="Cancel date edit and lock"
                      @click="cancelEnableDateEdit"
                    >
                      Lock
                    </UButton>
                  </div>

                  <!-- Date shift feedback banner -->
                  <div
                    v-if="dateShiftDays !== 0"
                    class="text-xs flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all"
                    :class="dateShiftDays > 0 ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-purple-50 text-purple-800 border border-purple-200'"
                  >
                    <UIcon name="i-lucide-calendar-clock" class="size-4 shrink-0" />
                    <span>
                      Task due dates will shift <strong>{{ Math.abs(dateShiftDays) }} day{{ Math.abs(dateShiftDays) === 1 ? '' : 's' }} {{ dateShiftDays > 0 ? 'later' : 'earlier' }}</strong> upon saving.
                    </span>
                  </div>
                  <p v-else class="text-[11px] text-muted">
                    Pick a new date. Saving will shift all task due dates based on the difference.
                  </p>
                </div>
              </UFormField>

              <UFormField label="Venue" name="venue" required>
                <UInput v-model="form.venue" class="w-full" placeholder="Manila Cathedral" />
              </UFormField>

              <UFormField label="Description" name="description" required>
                <UTextarea v-model="form.description" class="w-full" placeholder="Tell us more about your special day" />
              </UFormField>
            </UForm>
          </UPageCard>
        </div>

        <UPageCard class="white-bread-container md:col-span-2 max-h-[calc(100vh-64px)] overflow-y-auto space-y-4">
          <div class="overflow-hidden rounded-lg border border-gray-300">
            <img
              :src="eventCoverUrl"
              :alt="`${overviewTitle} cover`"
              class="w-full object-cover"
              @error="onCoverImageError"
            >
          </div>

          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-2xl font-bold font-serif">
                {{ overviewTitle }}
              </h2>
              <UBadge :color="statusBadge.color" variant="subtle">
                {{ statusBadge.label }}
              </UBadge>
            </div>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-if="overviewDateLabel"
                icon="i-lucide-calendar"
                class="rounded-full px-4 cursor-pointer hover:bg-slate-200 transition-colors"
                variant="subtle"
                color="slate"
                :title="isDateEditEnabled ? 'Editing date in form' : 'Click to change event date'"
                @click="promptEnableDateEdit"
              >
                {{ overviewDateLabel }}
                <UIcon name="i-lucide-pencil" class="size-3 ml-1 text-slate-400" />
              </UButton>
              <UButton
                v-if="overviewVenue"
                icon="i-lucide-map-pin"
                class="rounded-full px-4"
                variant="subtle"
                color="slate"
                disabled
                :ui="{ base: 'disabled:cursor-default' }"
              >
                {{ overviewVenue }}
              </UButton>
            </div>
          </div>
        </UPageCard>
      </UPageGrid>

      <!-- Warning Modal for Editing Event Date -->
      <UModal
        v-model:open="isDateWarningModalOpen"
        :ui="{
          content: 'w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden',
          header: 'border-b border-bread-200/60 p-4 sm:p-5 bg-bread-50/50',
          body: 'p-4 sm:p-6 space-y-4 font-sans',
          footer: 'border-t border-bread-200/60 p-4 bg-bread-50/30 flex justify-end gap-2.5 font-sans',
        }"
      >
        <template #header>
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <UIcon name="i-lucide-alert-triangle" class="size-5" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-highlighted font-serif">
                Change Event Date?
              </h3>
              <p class="text-xs text-muted font-sans">
                Task schedule adjustment warning
              </p>
            </div>
          </div>
        </template>

        <template #body>
          <div class="space-y-3.5 text-sm font-sans">
            <p class="text-toast-800 leading-relaxed">
              Changing your event date will automatically reschedule your entire task timeline.
              <strong>All task due dates will move</strong> based on the time difference between the current date and your new date.
            </p>

            <div class="rounded-xl bg-amber-50/80 border border-amber-200 p-3.5 space-y-2 text-xs text-amber-900">
              <div class="flex items-center gap-2 font-medium">
                <UIcon name="i-lucide-calendar" class="size-4 text-amber-700 shrink-0" />
                <span>Current Event Date: <strong>{{ overviewDateLabel }}</strong></span>
              </div>
              <p class="text-amber-800/90 leading-normal pl-6">
                For example, moving your event 2 weeks later will automatically push all your task deadlines 2 weeks forward so your planning schedule stays intact.
              </p>
            </div>

            <p class="text-xs text-muted">
              Do you want to unlock and edit the event date?
            </p>
          </div>
        </template>

        <template #footer>
          <UButton
            color="neutral"
            variant="outline"
            class="cursor-pointer"
            @click="cancelEnableDateEdit"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            icon="i-lucide-unlock"
            class="font-semibold text-white bg-toast-600 hover:bg-toast-700 shadow-sm cursor-pointer"
            @click="confirmEnableDateEdit"
          >
            Enable Editing
          </UButton>
        </template>
      </UModal>
    </div>
  </UContainer>
</template>
