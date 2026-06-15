<script lang="ts" setup>
import { DateFormatter } from '@internationalized/date'
import type { EventRecord } from '~/types/event'
import { EVENT_TYPE_OPTIONS } from '~/types/event'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { defaultCover, resolveEventCoverImageUrl } from '~/utils/eventImage'
import demoCoverImage from '~/assets/bpb-images/wedding-1.jpg'

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

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const isLoadingEvent = ref(false)

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const {
  form,
  coverImageFile,
  coverImageInput,
  isSubmitting,
  isEventCancelled,
  isWeddingEvent,
  onCoverImageChange,
  submit,
} = useEventSettingsForm({
  eventId,
  eventRecord,
})

const eventCoverUrl = computed(() => {
  if (coverImageFile.value) {
    return URL.createObjectURL(coverImageFile.value)
  }
  if (eventRecord.value?.coverImageURL) {
    return resolveEventCoverImageUrl(eventRecord.value.coverImageURL)
  }
  if (isUiOnlyMode.value || !eventId.value) {
    return demoCoverImage
  }
  return null
})

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
  }
}

onMounted(() => {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    navigateTo('/UserDashboard')
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
                <USelect v-model="form.eventType" :items="EVENT_TYPE_OPTIONS" class="w-full" />
              </UFormField>

              <UCheckbox
                v-if="isWeddingEvent"
                v-model="form.isCatholicWedding"
                label="Is this a Catholic Wedding?"
              />

              <UFormField label="Venue" name="venue" required>
                <UInput v-model="form.venue" class="w-full" placeholder="Manila Cathedral" />
              </UFormField>

              <UFormField label="Description" name="description" required>
                <UTextarea v-model="form.description" class="w-full" placeholder="Tell us more about your special day" />
              </UFormField>

              <UFormField label="Cover Image" name="coverImage">
                <input
                  ref="coverImageInput"
                  type="file"
                  accept="image/*"
                  class="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-slate-500 file:px-3 file:py-1.5 file:text-white"
                  @change="onCoverImageChange"
                >
                <p v-if="coverImageFile" class="mt-1 text-xs text-muted">Selected: {{ coverImageFile.name }}</p>
                <p v-else-if="eventRecord?.coverImageURL" class="mt-1 text-xs text-muted">Current cover will be kept unless you upload a new image.</p>
              </UFormField>
            </UForm>
          </UPageCard>
        </div>

        <UPageCard class="white-bread-container md:col-span-2 max-h-[calc(100vh-64px)] overflow-y-auto space-y-4">
          <div class="overflow-hidden rounded-lg border border-gray-300">
            <img
              v-if="eventCoverUrl"
              :src="eventCoverUrl"
              :alt="`${overviewTitle} cover`"
              class="w-full object-cover"
              @error="onCoverImageError"
            >
            <div
              v-else
              class="flex h-48 items-center justify-center bg-muted/30 text-sm text-muted"
            >
              No cover image
            </div>
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
                class="rounded-full px-4"
                variant="subtle"
                color="slate"
                disabled
                :ui="{ base: 'disabled:cursor-default' }"
              >
                {{ overviewDateLabel }}
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
    </div>
  </UContainer>
</template>
