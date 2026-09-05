<script lang="ts" setup>
import { DateFormatter } from '@internationalized/date'
import { reportApiError } from '~/types/auth'
import { formatEventPriceTier, type EventRecord } from '~/types/event'

definePageMeta({
  layout: 'partner-navbar'
})

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const toast = useToast()
const { isUiOnlyMode } = useApiMode()
const { fetchUserEvents } = useEvents()

const events = ref<EventRecord[]>([])
const isLoading = ref(true)

async function loadEvents() {
  isLoading.value = true
  try {
    events.value = await fetchUserEvents(true)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load events', error })
  } finally {
    isLoading.value = false
  }
}

onMounted(loadEvents)
</script>

<template>
  <UContainer class="space-y-6 py-6">
    <UPageHeader
      title="Collaborated Events"
      description="Review the client events you can access through accepted collaboration invites."
    />

    <div v-if="isUiOnlyMode" class="text-sm text-muted">
      UI-only mode is enabled, so event data may be limited to demo values.
    </div>

    <div v-if="isLoading" class="py-12 text-center text-muted">
      Loading events...
    </div>
    <div v-else-if="events.length === 0" class="py-12 text-center text-muted">
      No collaborated events yet. Check your collaborations inbox for pending invites.
    </div>
    <UPageGrid v-else class="items-stretch">
      <UPageCard
        v-for="event in events"
        :key="event._id"
        class="white-bread-container"
      >
        <div class="space-y-4">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg font-semibold">{{ event.eventName }}</h2>
              <UBadge :label="event.status" color="neutral" variant="soft" />
            </div>
            <div class="text-sm text-muted">{{ event.venue || 'Venue TBD' }}</div>
            <div class="text-sm text-muted">
              {{ event.eventDate ? df.format(new Date(event.eventDate)) : 'Date TBD' }}
            </div>
            <div class="text-sm text-muted">
              Plan: {{ formatEventPriceTier(event) }}
            </div>
          </div>

          <div class="flex justify-end">
            <UButton :to="`/partners/events/${event._id}`" icon="i-lucide-arrow-right">
              Open workspace
            </UButton>
          </div>
        </div>
      </UPageCard>
    </UPageGrid>
  </UContainer>
</template>

<style></style>
