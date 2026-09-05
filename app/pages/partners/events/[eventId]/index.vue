<script setup lang="ts">
import { DateFormatter } from '@internationalized/date'
import { reportApiError } from '~/types/auth'
import { formatEventPriceTier, type SelectedEventDetail } from '~/types/event'
import {
  EVENT_FEATURE,
  getAllowedFeaturesForEvent
} from '~/utils/eventTierFeatures'

definePageMeta({
  layout: 'partner-navbar'
})

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const route = useRoute()
const toast = useToast()
const { fetchEvent } = useEvents()

const eventId = computed(() => typeof route.params.eventId === 'string' ? route.params.eventId : '')
const detail = ref<SelectedEventDetail | null>(null)
const isLoading = ref(true)

const modules = computed(() => {
  const event = detail.value?.event
  const allowed = event ? new Set(getAllowedFeaturesForEvent(event)) : new Set<string>()

  return [
    { label: 'Guests', to: `/partners/events/${eventId.value}/guests`, icon: 'i-lucide-users-round', enabled: allowed.has(EVENT_FEATURE.GUESTS) },
    { label: 'RSVP', to: `/partners/events/${eventId.value}/rsvp`, icon: 'i-lucide-mail-check', enabled: allowed.has(EVENT_FEATURE.RSVP) },
    { label: 'Tasks', to: `/partners/events/${eventId.value}/tasks`, icon: 'i-lucide-list-checks', enabled: allowed.has(EVENT_FEATURE.TASKS) },
    { label: 'Suppliers', to: `/partners/events/${eventId.value}/suppliers`, icon: 'i-lucide-briefcase-business', enabled: allowed.has(EVENT_FEATURE.SUPPLIERS) },
    { label: 'Wishlist', to: `/partners/events/${eventId.value}/wishlist`, icon: 'i-lucide-gift', enabled: allowed.has(EVENT_FEATURE.WISHLIST) },
    { label: 'Church Requirements', to: `/partners/events/${eventId.value}/church-requirements`, icon: 'i-lucide-church', enabled: allowed.has(EVENT_FEATURE.CHURCH_REQUIREMENTS) },
    { label: 'Playlist', to: `/partners/events/${eventId.value}/playlist`, icon: 'i-lucide-music-4', enabled: allowed.has(EVENT_FEATURE.PLAYLIST) },
    { label: 'Schedules', to: `/partners/events/${eventId.value}/schedules`, icon: 'i-lucide-calendar-range', enabled: true },
    { label: 'Settings', to: `/partners/events/${eventId.value}/settings`, icon: 'i-lucide-settings', enabled: true },
    { label: 'Payments', to: `/partners/events/${eventId.value}/payments`, icon: 'i-lucide-credit-card', enabled: true },
    { label: 'Upgrade', to: `/partners/events/${eventId.value}/upgrade`, icon: 'i-lucide-circle-arrow-up', enabled: true },
    { label: 'Email Credits', to: `/partners/events/${eventId.value}/email-credits`, icon: 'i-lucide-mail-plus', enabled: true },
    { label: 'Website', to: `/partners/events/${eventId.value}/website`, icon: 'i-lucide-globe', enabled: allowed.has(EVENT_FEATURE.CUSTOM_SITE) },
    { label: 'Invitation', to: `/partners/events/${eventId.value}/invitation`, icon: 'i-lucide-mail', enabled: allowed.has(EVENT_FEATURE.INVITATIONS) }
  ]
})

async function loadWorkspace() {
  if (!eventId.value) {
    toast.add({ title: 'Missing event', description: 'Select an event first.', color: 'error' })
    await navigateTo('/partners/events')
    return
  }

  isLoading.value = true
  try {
    detail.value = await fetchEvent(eventId.value, true)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event workspace', error })
  } finally {
    isLoading.value = false
  }
}

onMounted(loadWorkspace)
</script>

<template>
  <UContainer class="space-y-6 py-6">
    <div v-if="isLoading" class="py-12 text-center text-muted">
      Loading workspace...
    </div>

    <template v-else-if="detail">
      <UPageHeader
        :title="detail.event.eventName"
        :description="detail.event.venue || 'Venue TBD'"
      >
        <template #links>
          <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{{ detail.event.eventDate ? df.format(new Date(detail.event.eventDate)) : 'Date TBD' }}</span>
            <span>•</span>
            <span>{{ formatEventPriceTier(detail.event) }}</span>
            <span>•</span>
            <span>{{ detail.event.status }}</span>
          </div>
        </template>
      </UPageHeader>

      <UPageGrid>
        <UPageCard class="white-bread-container">
          <template #header>
            <div class="font-semibold">Overview</div>
          </template>
          <div class="space-y-2 text-sm">
            <div><span class="text-muted">Guests:</span> {{ detail.guestList.length }}</div>
            <div><span class="text-muted">RSVP entries:</span> {{ detail.rsvpSummary?.totalSent ?? 0 }}</div>
            <div><span class="text-muted">Tasks:</span> {{ detail.tasks?.totalTasks ?? 0 }}</div>
          </div>
        </UPageCard>

        <UPageCard class="white-bread-container">
          <template #header>
            <div class="font-semibold">Partner Access</div>
          </template>
          <p class="text-sm text-muted">
            This workspace is collaboration-only. Event creation and owner-only invite management stay on the client owner flow.
          </p>
        </UPageCard>
      </UPageGrid>

      <UPageGrid class="items-stretch">
        <UPageCard
          v-for="module in modules"
          :key="module.to"
          class="white-bread-container"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <UIcon :name="module.icon" class="size-4 text-toast-700" />
                <div class="font-semibold">{{ module.label }}</div>
              </div>
              <p class="text-sm text-muted">
                {{ module.enabled ? 'Open this event module.' : 'Not available for this event tier.' }}
              </p>
            </div>
            <UButton
              :to="module.enabled ? module.to : undefined"
              :disabled="!module.enabled"
              icon="i-lucide-arrow-right"
            >
              Open
            </UButton>
          </div>
        </UPageCard>
      </UPageGrid>
    </template>
  </UContainer>
</template>
