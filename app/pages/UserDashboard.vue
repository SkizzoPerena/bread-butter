<script lang="ts" setup>
import { CalendarDate, DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import type { EventRecord } from '~/types/event'
import { formatEventPriceTier } from '~/types/event'
import { getEventBalanceDue, isEventFullyPaid, isTierUpgradePending, getPendingUpgradeStatusLabel } from '~/types/payment'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { defaultCover, resolveEventCoverImageUrl } from '~/utils/eventImage'

definePageMeta({
  layout: 'user-navbar',
})

const toast = useToast()
const { user } = useAuth()
const { fetchUserEvents } = useEvents()
const { loadPageData, isUiOnlyMode } = useApiMode()

const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
})

const welcomeName = computed(() => user.value?.firstName ?? 'Jane')

type SortOption = 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc'

const sortOptions = [
  { label: 'Date (Earliest First)', value: 'date-asc' },
  { label: 'Date (Latest First)', value: 'date-desc' },
  { label: 'Alphabetical (A - Z)', value: 'name-asc' },
  { label: 'Alphabetical (Z - A)', value: 'name-desc' },
]

const ongoingSort = ref<SortOption>('date-asc')
const pastSort = ref<SortOption>('date-desc')

function sortEvents(events: EventRecord[], sortBy: SortOption): EventRecord[] {
  return [...events].sort((a, b) => {
    if (sortBy === 'name-asc') {
      return a.eventName.localeCompare(b.eventName)
    }
    if (sortBy === 'name-desc') {
      return b.eventName.localeCompare(a.eventName)
    }
    const timeA = new Date(a.eventDate).getTime()
    const timeB = new Date(b.eventDate).getTime()
    if (sortBy === 'date-asc') {
      return timeA - timeB
    }
    return timeB - timeA
  })
}

const ongoingEvents = computed(() => {
  const todayDate = today(getLocalTimeZone())
  const filtered = userEvents.value.filter((event) => {
    const eventDate = new CalendarDate(new Date(event.eventDate).getUTCFullYear(), new Date(event.eventDate).getUTCMonth() + 1, new Date(event.eventDate).getUTCDate())
    return eventDate.compare(todayDate) >= 0
  })
  return sortEvents(filtered, ongoingSort.value)
})

const pastEvents = computed(() => {
  const todayDate = today(getLocalTimeZone())
  const filtered = userEvents.value.filter((event) => {
    const eventDate = new CalendarDate(new Date(event.eventDate).getUTCFullYear(), new Date(event.eventDate).getUTCMonth() + 1, new Date(event.eventDate).getUTCDate())
    return eventDate.compare(todayDate) < 0
  })
  return sortEvents(filtered, pastSort.value)
})

const userEvents = ref<EventRecord[]>([])
const isLoadingEvents = ref(false)

async function loadUserEvents() {
  isLoadingEvents.value = true
  try {
    userEvents.value = await loadPageData({
      mock: () => [],
      fetch: () => fetchUserEvents(true),
    })

    if (!isUiOnlyMode.value && userEvents.value.length === 0) {
      await navigateTo('/user/create-event')
    }
  } catch (error) {
    userEvents.value = []
    reportApiError(toast, { title: 'Could not load events', error })
  } finally {
    isLoadingEvents.value = false
  }
}

function formatEventDateLabel(eventDate: string) {
  return df.format(new Date(eventDate))
}

function getPaymentStatusLabel(event: EventRecord): string {
  if (isTierUpgradePending(event)) {
    return getPendingUpgradeStatusLabel(event)
  }
  if (isEventFullyPaid(event)) {
    return 'Fully paid'
  }
  const balanceDue = getEventBalanceDue(event)
  const status = event.latestPayment?.status
  if (status === 'PENDING') {
    return 'Payment pending review'
  }
  if (status === 'APPROVED' && balanceDue > 0) {
    return `Partially paid — Php ${balanceDue.toLocaleString()} due`
  }
  if (status === 'DENIED') {
    return 'Denied'
  }
  if (!status) {
    return 'Payment required'
  }
  return `Balance due: Php ${balanceDue.toLocaleString()}`
}

function onCoverImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = defaultCover
}

onMounted(() => {
  loadUserEvents()
})
</script>

<template>
  <div class="w-full flex-1 bg-bread-400 py-6 sm:py-8">
    <UContainer class="space-y-6 sm:space-y-8">
      <ClientOnly>
        <Teleport to="#navbar-actions">
          <UButton icon="i-lucide-search" variant="outline" color="bread"
            class="text-white border-white/40 hover:bg-white/10">
            Search Events
          </UButton>
          <UButton icon="i-lucide-user-plus" color="neutral" variant="solid" to="/user/create-event">
            Create New Event
          </UButton>
        </Teleport>
      </ClientOnly>

      <!-- Ongoing Events Section -->
      <div v-if="!isLoadingEvents && ongoingEvents.length > 0" class="space-y-4">
        <div class="white-bread-container px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-2">
          <h2 class="text-lg sm:text-2xl font-bold font-serif text-highlighted truncate">Ongoing Events</h2>
          <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span class="hidden sm:inline text-sm text-muted font-medium">Sort by:</span>
            <USelect v-model="ongoingSort" :items="sortOptions" value-key="value" label-key="label" size="xs"
              class="w-36 sm:w-52 text-xs sm:text-sm" icon="i-lucide-arrow-up-down" />
          </div>
        </div>

        <UPageGrid class="grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
          <template v-if="isLoadingEvents">
            <div v-for="n in 2" :key="`skeleton-${n}`" class="white-bread-container rounded-lg overflow-hidden">
              <USkeleton class="aspect-3/2 w-full rounded-none" />
              <div class="space-y-2 p-2.5 sm:space-y-3 sm:p-4">
                <USkeleton class="h-4 sm:h-6 w-3/4" />
                <USkeleton class="h-3 sm:h-4 w-1/2" />
                <USkeleton class="h-3 sm:h-4 w-1/2" />
                <USkeleton class="h-7 sm:h-10 w-full mt-3 sm:mt-4" />
              </div>
            </div>
          </template>

          <template v-else>
            <div v-for="event in ongoingEvents" :key="event._id"
              class="white-bread-container rounded-lg flex flex-col justify-between">
              <div>
                <div class="aspect-3/2 w-full overflow-hidden rounded-t-lg">
                  <img :src="resolveEventCoverImageUrl(event.coverImageURL)" :alt="event.eventName"
                    class="h-full w-full object-cover" @error="onCoverImageError">
                </div>
                <div class="p-2.5 sm:px-6 sm:pb-4 sm:pt-4 space-y-1 sm:space-y-1.5">
                  <div class="flex items-start justify-between gap-1.5 pb-1 min-w-0">
                    <div class="min-w-0 flex-1 text-xs sm:text-lg font-semibold truncate leading-tight">
                      {{ event.eventName }}
                    </div>
                    <UBadge variant="subtle" size="xs" class="shrink-0 text-[10px] sm:text-xs px-1 py-0.5 sm:px-2">
                      {{ getPaymentStatusLabel(event) }}
                    </UBadge>
                  </div>
                  <UPageFeature icon="i-lucide-tag" :title="formatEventPriceTier(event)"
                    :ui="{ title: 'text-[11px] sm:text-sm font-normal truncate' }" />
                  <UPageFeature icon="i-lucide-map-pin" :title="event.venue"
                    :ui="{ title: 'text-[11px] sm:text-sm font-normal truncate' }" />
                  <UPageFeature icon="i-lucide-calendar-heart" :title="formatEventDateLabel(event.eventDate)"
                    :ui="{ title: 'text-[11px] sm:text-sm font-normal truncate' }" />
                </div>
              </div>
              <div class="p-2.5 pt-0 sm:px-6 sm:pb-6 sm:pt-0">
                <UButton block size="xs" class="mt-2 sm:mt-6 text-xs sm:text-sm py-1.5 sm:py-2"
                  :to="{ path: '/user/event-dashboard', query: { eventId: event._id } }">
                  Open Dashboard
                </UButton>
              </div>
            </div>
          </template>
        </UPageGrid>
      </div>

      <!-- Past Events Section -->
      <div v-if="!isLoadingEvents && pastEvents.length > 0" class="space-y-4">
        <div class="bread-container px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-2">
          <h2 class="text-lg sm:text-2xl font-bold font-serif text-highlighted truncate">Past Events</h2>
          <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span class="hidden sm:inline text-sm text-muted font-medium">Sort by:</span>
            <USelect v-model="pastSort" :items="sortOptions" value-key="value" label-key="label" size="xs"
              class="w-36 sm:w-52 text-xs sm:text-sm" icon="i-lucide-arrow-up-down" />
          </div>
        </div>

        <UPageGrid class="grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
          <template v-if="isLoadingEvents">
            <div v-for="n in 2" :key="`skeleton-past-${n}`" class="white-bread-container rounded-lg overflow-hidden">
              <USkeleton class="aspect-3/2 w-full rounded-none" />
              <div class="space-y-2 p-2.5 sm:space-y-3 sm:p-4">
                <USkeleton class="h-4 sm:h-6 w-3/4" />
                <USkeleton class="h-3 sm:h-4 w-1/2" />
                <USkeleton class="h-3 sm:h-4 w-1/2" />
                <USkeleton class="h-7 sm:h-10 w-full mt-3 sm:mt-4" />
              </div>
            </div>
          </template>

          <template v-else>
            <div v-for="event in pastEvents" :key="event._id"
              class="white-bread-container rounded-lg flex flex-col justify-between">
              <div>
                <div class="aspect-3/2 w-full overflow-hidden rounded-t-lg">
                  <img :src="resolveEventCoverImageUrl(event.coverImageURL)" :alt="event.eventName"
                    class="h-full w-full object-cover" @error="onCoverImageError">
                </div>
                <div class="p-2.5 sm:px-6 sm:pb-4 sm:pt-4 space-y-1 sm:space-y-1.5">
                  <div class="flex items-start justify-between gap-1.5 pb-1 min-w-0">
                    <div class="min-w-0 flex-1 text-xs sm:text-lg font-semibold truncate leading-tight">
                      {{ event.eventName }}
                    </div>
                    <UBadge variant="subtle" size="xs" class="shrink-0 text-[10px] sm:text-xs px-1 py-0.5 sm:px-2">
                      {{ getPaymentStatusLabel(event) }}
                    </UBadge>
                  </div>
                  <UPageFeature icon="i-lucide-tag" :title="formatEventPriceTier(event)"
                    :ui="{ title: 'text-[11px] sm:text-sm font-normal truncate' }" />
                  <UPageFeature icon="i-lucide-map-pin" :title="event.venue"
                    :ui="{ title: 'text-[11px] sm:text-sm font-normal truncate' }" />
                  <UPageFeature icon="i-lucide-calendar-heart" :title="formatEventDateLabel(event.eventDate)"
                    :ui="{ title: 'text-[11px] sm:text-sm font-normal truncate' }" />
                </div>
              </div>
              <div class="p-2.5 pt-0 sm:px-6 sm:pb-6 sm:pt-0">
                <UButton block size="xs" class="mt-2 sm:mt-6 text-xs sm:text-sm py-1.5 sm:py-2"
                  :to="{ path: '/user/event-dashboard', query: { eventId: event._id } }">
                  Open Dashboard
                </UButton>
              </div>
            </div>
          </template>
        </UPageGrid>
      </div>

      <p v-if="!isLoadingEvents && userEvents.length === 0" class="text-center text-sm text-muted py-6">
        No events yet — create one above.
      </p>

    </UContainer>
  </div>
</template>

<style></style>
