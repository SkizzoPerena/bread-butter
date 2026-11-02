<script lang="ts" setup>
import { CalendarDate, DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import type { EventRecord } from '~/types/event'
import type { GatheringRecord } from '~/types/seating'
import { formatEventPriceTier } from '~/types/event'
import { getEventBalanceDue, isEventFullyPaid, isTierUpgradePending, getPendingUpgradeStatusLabel } from '~/types/payment'
import { reportApiError } from '~/types/auth'
import { useAuth } from '~/composables/useAuth'
import { useEvents } from '~/composables/useEvents'
import { defaultCover } from '~/utils/eventImage'
import { resolveEventDashboardPath } from '~/utils/eventTierFeatures'
import {
  isEventPendingVerification,
  isSinglePendingEventAccount,
  isSingleUnpaidEventAccount,
  buildPendingPaymentQuery,
  buildUserPaymentQuery,
  getUiPendingPayment,
  getUiUnpaidEvent
} from '~/utils/paymentPendingGuard'

const route = useRoute()
const toast = useToast()
const { user } = useAuth('user')
const { fetchUserEvents, updateEvent } = useEvents()
const { listGatherings } = useSeating()
const { seatingPlansEnabled, loadSeatingFeature } = useSeatingFeature()
const { loadPageData, isUiOnlyMode } = useApiMode()
const { startPageTransition, finishPageTransition } = usePageTransition()

const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
})

const activeTab = ref<'events' | 'seating'>(
  route.query.tab === 'seating' ? 'seating' : 'events'
)

const userEvents = ref<EventRecord[]>([])
const seatingPlans = ref<GatheringRecord[]>([])
const isLoadingEvents = ref(false)

const ongoingEvents = computed(() => {
  const todayDate = today(getLocalTimeZone())
  const filtered = userEvents.value.filter((event) => {
    const eventDate = new CalendarDate(new Date(event.eventDate).getUTCFullYear(), new Date(event.eventDate).getUTCMonth() + 1, new Date(event.eventDate).getUTCDate())
    return eventDate.compare(todayDate) >= 0
  })
  return [...filtered].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
})

const pastEvents = computed(() => {
  const todayDate = today(getLocalTimeZone())
  const filtered = userEvents.value.filter((event) => {
    const eventDate = new CalendarDate(new Date(event.eventDate).getUTCFullYear(), new Date(event.eventDate).getUTCMonth() + 1, new Date(event.eventDate).getUTCDate())
    return eventDate.compare(todayDate) < 0
  })
  return [...filtered].sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
})

const tabItems = computed(() => [
  {
    value: 'events' as const,
    label: userEvents.value.length ? `Events (${userEvents.value.length})` : 'Events',
    icon: 'i-lucide-calendar-heart',
  },
  ...(seatingPlansEnabled.value ? [{
    value: 'seating' as const,
    label: seatingPlans.value.length ? `Jams (${seatingPlans.value.length})` : 'Jams',
    icon: 'i-lucide-layout-grid',
  }] : []),
])

async function loadUserEvents() {
  isLoadingEvents.value = true
  try {
    const [events, gatherings] = await Promise.all([
      loadPageData({
        mock: () => [],
        fetch: () => fetchUserEvents(true),
      }),
      loadPageData({
        mock: () => listGatherings(),
        fetch: () => listGatherings(),
      }).catch(() => [] as GatheringRecord[]),
    ])
    userEvents.value = events
    seatingPlans.value = gatherings

    if (isUiOnlyMode.value) {
      const uiPending = getUiPendingPayment()
      if (uiPending) {
        await navigateTo({
          path: '/user/payment-pending',
          query: uiPending as Record<string, string>,
        }, { replace: true })
        return
      }
      const uiUnpaid = getUiUnpaidEvent()
      if (uiUnpaid) {
        await navigateTo({
          path: '/user/payment',
          query: uiUnpaid as Record<string, string>,
        }, { replace: true })
        return
      }
    }

    if (!isUiOnlyMode.value && seatingPlans.value.length === 0 && isSinglePendingEventAccount(userEvents.value)) {
      await navigateTo({
        path: '/user/payment-pending',
        query: buildPendingPaymentQuery(userEvents.value[0]) as Record<string, string>,
      }, { replace: true })
      return
    }

    if (!isUiOnlyMode.value && seatingPlans.value.length === 0 && isSingleUnpaidEventAccount(userEvents.value)) {
      await navigateTo({
        path: '/user/payment',
        query: buildUserPaymentQuery(userEvents.value[0]) as Record<string, string>,
      }, { replace: true })
      return
    }

    if (!isUiOnlyMode.value && userEvents.value.length === 0 && seatingPlans.value.length === 0) {
      await navigateTo('/user/create-event')
    }
  } catch (error) {
    userEvents.value = []
    reportApiError(toast, { title: 'Could not load events', error })
  } finally {
    isLoadingEvents.value = false
    finishPageTransition()
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

function isSeatingPlanFullyPaid(plan: GatheringRecord): boolean {
  return plan.status === 'ACTIVE'
}

function getSeatingPaymentStatusLabel(plan: GatheringRecord): string {
  if (plan.status === 'ACTIVE') return 'Fully paid & active'
  if (plan.payment?.status === 'PENDING') return 'Payment pending review'
  if (plan.payment?.status === 'DENIED') return 'Payment denied'
  return 'Payment required'
}

function getPaymentStatusBadge(event: EventRecord): {
  label: string
  badgeClass: string
} {
  const label = getPaymentStatusLabel(event)
  if (isEventFullyPaid(event)) {
    return {
      label,
      badgeClass: 'bg-emerald-400/20 text-emerald-100 border border-emerald-400/30',
    }
  }
  if (isEventPendingVerification(event) || isTierUpgradePending(event) || event.latestPayment?.status === 'PENDING') {
    return {
      label,
      badgeClass: 'bg-amber-400/20 text-amber-100 border border-amber-300/40',
    }
  }
  return {
    label,
    badgeClass: 'bg-white/20 text-white border border-white/30',
  }
}

const eventUploadFiles = ref<Record<string, any>>({})
const uploadingEventId = ref<string | null>(null)

function hasEventCover(event: EventRecord): boolean {
  if (!event.coverImageURL) return false
  const trimmed = event.coverImageURL.trim()
  if (!trimmed) return false
  if (trimmed === defaultCover || trimmed.includes('/assets/bpb-images/') || trimmed.includes('wedding-1.jpg')) {
    return false
  }
  return true
}

function onCoverImageError(event: EventRecord) {
  event.coverImageURL = null
}

function extractSingleFile(val: unknown): File | null {
  if (!val) return null
  if (val instanceof File) return val
  if (Array.isArray(val) && val.length > 0) {
    return val[0] instanceof File ? val[0] : (val[0] as File) || null
  }
  if (typeof (val as any)?.item === 'function') {
    const f = (val as any).item(0)
    return f instanceof File ? f : (f as File) || null
  }
  return (val as File) || null
}

async function handleEventImageUpload(event: EventRecord, rawFile: unknown) {
  const file = extractSingleFile(rawFile)
  if (!file) return

  uploadingEventId.value = event._id
  try {
    if (isUiOnlyMode.value) {
      event.coverImageURL = URL.createObjectURL(file)
      toast.add({
        title: 'Image added',
        description: 'Event image updated successfully.',
        color: 'success',
      })
      return
    }

    await updateEvent(event._id, {
      eventName: event.eventName,
      eventType: event.eventType,
      venue: event.venue,
      description: event.description,
      eventDate: event.eventDate,
      isCatholicWedding: event.isCatholicWedding,
      coverImage: file,
    })

    event.coverImageURL = URL.createObjectURL(file)

    toast.add({
      title: 'Image uploaded',
      description: 'Event cover image updated successfully.',
      color: 'success',
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not upload image', error })
  } finally {
    uploadingEventId.value = null
    delete eventUploadFiles.value[event._id]
  }
}

function getEventDashboardLink(event: EventRecord) {
  return {
    path: resolveEventDashboardPath(event),
    query: { eventId: event._id },
  }
}

function getEventAction(event: EventRecord): {
  label: string
  to: { path: string; query: Record<string, string> }
  color: 'bread' | 'warning' | 'neutral'
  icon?: string
} {
  if (isEventFullyPaid(event)) {
    return {
      label: 'Open Dashboard',
      to: getEventDashboardLink(event),
      color: 'bread',
      icon: 'i-lucide-arrow-right',
    }
  }

  if (isEventPendingVerification(event)) {
    return {
      label: 'Payment Pending',
      to: {
        path: '/user/payment-pending',
        query: buildPendingPaymentQuery(event) as Record<string, string>,
      },
      color: 'warning',
      icon: 'i-lucide-clock',
    }
  }

  return {
    label: 'Complete Payment',
    to: {
      path: '/user/payment',
      query: buildUserPaymentQuery(event),
    },
    color: 'neutral',
    icon: 'i-lucide-credit-card',
  }
}

function handleEventAction(event: EventRecord) {
  const action = getEventAction(event)
  startPageTransition(action.to)
}

onMounted(() => {
  loadSeatingFeature()
  loadUserEvents()
})
</script>

<template>
  <div class="w-full flex-1 bg-toast-700 text-white py-3.5 sm:py-5 px-3.5 sm:px-6 lg:px-8 flex flex-col items-center">
    <div class="w-full max-w-7xl mx-auto space-y-6">
      <!-- Navbar Teleport Actions -->
      <ClientOnly>
        <Teleport to="#navbar-actions">
          <UButton v-if="activeTab === 'events'" icon="i-lucide-plus" color="bread"
            class="font-semibold rounded-lg shadow-xs cursor-pointer text-xs sm:text-sm"
            @click.prevent="startPageTransition('/user/create-event')">
            Create New Event
          </UButton>
          <UButton v-else-if="seatingPlansEnabled" icon="i-lucide-layout-grid" color="bread"
            class="font-semibold rounded-lg shadow-xs cursor-pointer text-xs sm:text-sm"
            @click.prevent="startPageTransition('/user/create-seating')">
            Create New Jam
          </UButton>
        </Teleport>
      </ClientOnly>

      <!-- Main Dashboard Container -->
      <div
        class="bread-container bg-bread-400 text-toast-900 p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 w-full rounded-2xl">
        <!-- Top Toolbar with UTabs and Contextual Action Button -->
        <UTabs v-model="activeTab" :items="tabItems" :content="false" class="w-full " :ui="{
        }" />


        <!-- Loading State Skeleton -->
        <div v-if="isLoadingEvents" class="space-y-4 w-full">
          <div class="border-b border-toast-600/20 pb-4">
            <USkeleton class="h-6 sm:h-8 w-48 bg-toast-900/10" />
          </div>
          <UPageGrid class="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
            <div v-for="n in 3" :key="`skeleton-home-${n}`"
              class="bg-toast-500/90 rounded-xl overflow-hidden border border-white/10">
              <USkeleton class="aspect-[3/2] w-full rounded-none bg-white/15" />
              <div class="space-y-2 p-3 sm:space-y-3 sm:p-4">
                <USkeleton class="h-4 sm:h-5 w-3/4 bg-white/20" />
                <USkeleton class="h-3 sm:h-4 w-1/2 bg-white/15" />
                <USkeleton class="h-3 sm:h-4 w-1/2 bg-white/15" />
                <USkeleton class="h-7 sm:h-9 w-full mt-3 bg-white/25" />
              </div>
            </div>
          </UPageGrid>
        </div>

        <!-- TAB CONTENT: EVENTS -->
        <div v-else-if="activeTab === 'events'" class="space-y-6 w-full">
          <!-- Ongoing Events -->
          <div v-if="ongoingEvents.length > 0" class="space-y-4 w-full">
            <div class="flex items-center justify-between pb-1">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800 flex items-center gap-2">
                <UIcon name="i-lucide-calendar-heart" class="size-5 text-toast-700" />
                <span>Ongoing Events</span>
              </h3>
              <span class="text-xs text-toast-700 font-medium">
                {{ ongoingEvents.length }} active celebration{{ ongoingEvents.length === 1 ? '' : 's' }}
              </span>
            </div>

            <UPageGrid class="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
              <div v-for="event in ongoingEvents" :key="event._id"
                class="bg-toast-500 rounded-xl flex flex-col justify-between overflow-hidden transition-all duration-200 border-5 border-toast-500 text-white group">
                <div>
                  <div class="aspect-[3/2] w-full overflow-hidden rounded-lg relative bg-toast-800 shrink-0">
                    <!-- If event has a custom cover image -->
                    <img v-if="hasEventCover(event)" :src="event.coverImageURL!" :alt="event.eventName"
                      class="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      @error="() => onCoverImageError(event)" />

                    <!-- If no event image inserted: UFileUpload filling the same size of the image area -->
                    <div v-else class="h-full w-full bg-toast-800">
                      <UFileUpload v-model="eventUploadFiles[event._id]" :multiple="false" accept="image/*"
                        variant="area" label="Add image here" description="Click or drag image (PNG, JPG, WEBP)"
                        icon="i-lucide-image-plus" :loading="uploadingEventId === event._id"
                        class="h-full w-full rounded-none border-0 bg-toast-800! hover:bg-toast-900! transition-colors"
                        :ui="{
                          root: 'h-full w-full bg-toast-800!',
                          base: 'h-full w-full flex flex-col items-center justify-center text-center p-4 cursor-pointer bg-toast-800! hover:bg-toast-900! border-dashed! border-toast-600/60! transition-colors',
                          wrapper: 'flex flex-col items-center justify-center text-center',
                          label: 'text-xs font-bold text-white mt-1',
                          description: 'text-[11px] text-toast-200 mt-0.5',
                          icon: 'size-6 text-toast-300 mb-1 shrink-0',
                        }" @update:model-value="(val) => handleEventImageUpload(event, val)" />
                    </div>
                  </div>

                  <div class="p-3 sm:p-4 space-y-2">
                    <div class="flex items-start justify-between gap-2 pb-0.5 min-w-0">
                      <div
                        class="min-w-0 flex-1 text-base sm:text-lg font-bold font-serif text-white group-hover:text-bread-200 transition-colors wrap-break-word hyphens-none leading-tight">
                        {{ event.eventName }}
                      </div>

                      <div class="flex items-center gap-2 shrink-0">
                        <!-- Hazard icon with hover tooltip if event is not fully paid -->
                        <UTooltip v-if="!isEventFullyPaid(event)" :text="getPaymentStatusLabel(event)"
                          :content="{ side: 'top' }">
                          <div
                            class="inline-flex items-center justify-center size-6.5 rounded-full bg-amber-400/20 border border-amber-400/60 text-amber-300 cursor-help transition-transform hover:scale-110 shadow-xs"
                            aria-label="Payment status">
                            <UIcon name="i-lucide-alert-triangle" class="size-4 text-amber-400 animate-pulse" />
                          </div>
                        </UTooltip>

                        <!-- Package tier badge -->
                        <UBadge color="bread" variant="subtle" size="xs"
                          class="rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs truncate max-w-37.5">
                          {{ formatEventPriceTier(event) }}
                        </UBadge>
                      </div>
                    </div>

                    <div class="space-y-1.5 pt-0.5 text-xs sm:text-sm text-toast-100">
                      <div class="flex items-start gap-2">
                        <UIcon name="i-lucide-map-pin" class="size-3.5 text-bread-300 shrink-0 mt-0.5" />
                        <span class="wrap-break-word hyphens-none flex-1">{{ event.venue || 'Venue pending' }}</span>
                      </div>
                      <div class="flex items-center gap-2 truncate">
                        <UIcon name="i-lucide-calendar-heart" class="size-3.5 text-bread-300 shrink-0" />
                        <span class="truncate">{{ formatEventDateLabel(event.eventDate) }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="p-3 sm:p-4 pt-0">
                  <UButton block size="sm" :color="getEventAction(event).color" variant="solid"
                    :icon="getEventAction(event).icon" trailing
                    class="w-full text-xs sm:text-sm py-2 px-3 rounded-lg cursor-pointer justify-center font-bold"
                    @click.prevent="handleEventAction(event)">
                    {{ getEventAction(event).label }}
                  </UButton>
                </div>
              </div>
            </UPageGrid>
          </div>

          <!-- Past Events -->
          <div v-if="pastEvents.length > 0" class="space-y-4 pt-4 border-t border-toast-600/20">
            <div class="flex items-center justify-between pb-1">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800 flex items-center gap-2">
                <UIcon name="i-lucide-history" class="size-5 text-toast-700" />
                <span>Past Events</span>
              </h3>
              <span class="text-xs text-toast-700 font-medium">
                {{ pastEvents.length }} completed celebration{{ pastEvents.length === 1 ? '' : 's' }}
              </span>
            </div>

            <UPageGrid class="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
              <div v-for="event in pastEvents" :key="event._id"
                class="bg-toast-500 rounded-xl flex flex-col justify-between overflow-hidden border-5 border-toast-500 text-white group">
                <div>
                  <div class="aspect-[3/2] w-full overflow-hidden rounded-lg relative bg-toast-800 shrink-0">
                    <img v-if="hasEventCover(event)" :src="event.coverImageURL!" :alt="event.eventName"
                      class="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      @error="() => onCoverImageError(event)" />
                    <div v-else class="h-full w-full bg-toast-800">
                      <UFileUpload v-model="eventUploadFiles[event._id]" :multiple="false" accept="image/*"
                        variant="area" label="Add image here" description="Click or drag image (PNG, JPG, WEBP)"
                        icon="i-lucide-image-plus" :loading="uploadingEventId === event._id"
                        class="h-full w-full rounded-none border-0 bg-toast-800! hover:bg-toast-900! transition-colors"
                        :ui="{
                          root: 'h-full w-full bg-toast-800!',
                          base: 'h-full w-full flex flex-col items-center justify-center text-center p-4 cursor-pointer bg-toast-800! hover:bg-toast-900! border-dashed! border-toast-600/60! transition-colors',
                          wrapper: 'flex flex-col items-center justify-center text-center',
                          label: 'text-xs font-bold text-white mt-1',
                          description: 'text-[11px] text-toast-200 mt-0.5',
                          icon: 'size-6 text-toast-300 mb-1 shrink-0',
                        }" @update:model-value="(val) => handleEventImageUpload(event, val)" />
                    </div>
                  </div>

                  <div class="p-3 sm:p-4 space-y-2">
                    <div class="flex items-start justify-between gap-2 pb-0.5 min-w-0">
                      <div
                        class="min-w-0 flex-1 text-base sm:text-lg font-bold font-serif text-white group-hover:text-bread-200 transition-colors wrap-break-word hyphens-none leading-tight">
                        {{ event.eventName }}
                      </div>

                      <div class="flex items-center gap-2 shrink-0">
                        <!-- Hazard icon with hover tooltip if event is not fully paid -->
                        <UTooltip v-if="!isEventFullyPaid(event)" :text="getPaymentStatusLabel(event)"
                          :content="{ side: 'top' }">
                          <div
                            class="inline-flex items-center justify-center size-6.5 rounded-full bg-amber-400/20 border border-amber-400/60 text-amber-300 cursor-help transition-transform hover:scale-110 shadow-xs"
                            aria-label="Payment status">
                            <UIcon name="i-lucide-alert-triangle" class="size-4 text-amber-400 animate-pulse" />
                          </div>
                        </UTooltip>

                        <!-- Package tier badge -->
                        <UBadge color="bread" variant="subtle" size="xs"
                          class="rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs truncate max-w-37.5">
                          {{ formatEventPriceTier(event) }}
                        </UBadge>
                      </div>
                    </div>

                    <div class="space-y-1.5 pt-0.5 text-xs sm:text-sm text-toast-100">
                      <div class="flex items-start gap-2">
                        <UIcon name="i-lucide-map-pin" class="size-3.5 text-bread-300 shrink-0 mt-0.5" />
                        <span class="wrap-break-word hyphens-none flex-1">{{ event.venue || 'Venue pending' }}</span>
                      </div>
                      <div class="flex items-center gap-2 truncate">
                        <UIcon name="i-lucide-calendar-heart" class="size-3.5 text-bread-300 shrink-0" />
                        <span class="truncate">{{ formatEventDateLabel(event.eventDate) }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="p-3 sm:p-4 pt-0">
                  <UButton block size="sm" :color="getEventAction(event).color" variant="solid"
                    :icon="getEventAction(event).icon" trailing
                    class="w-full text-xs sm:text-sm py-2 px-3 rounded-lg cursor-pointer justify-center font-bold"
                    @click.prevent="handleEventAction(event)">
                    {{ getEventAction(event).label }}
                  </UButton>
                </div>
              </div>
            </UPageGrid>
          </div>

          <!-- Empty Events State -->
          <div v-if="userEvents.length === 0" class="p-6 sm:p-8 text-center space-y-3.5 max-w-xl mx-auto w-full">
            <div
              class="size-16 rounded-full bg-toast-600 text-white flex items-center justify-center mx-auto shadow-sm">
              <UIcon name="i-lucide-calendar-plus" class="size-8" />
            </div>
            <div class="space-y-1">
              <h3 class="text-xl sm:text-2xl font-serif font-bold text-toast-900">No Events Planned Yet</h3>
              <p class="text-xs sm:text-sm text-toast-700 max-w-sm mx-auto">
                Start creating your event website, guest lists, RSVPs, and countdown in just a few minutes.
              </p>
            </div>
            <div class="pt-2">
              <UButton color="primary" variant="solid" size="md"
                class="font-semibold bg-toast-600 hover:bg-toast-700 text-white rounded-lg shadow-sm cursor-pointer"
                icon="i-lucide-plus" @click.prevent="startPageTransition('/user/create-event')">
                Create Your First Event
              </UButton>
            </div>
          </div>
        </div>

        <!-- TAB CONTENT: JAMS -->
        <div v-else-if="activeTab === 'seating'" class="space-y-6 w-full">
          <div v-if="seatingPlans.length > 0" class="space-y-4 w-full">
            <div class="flex items-center justify-between pb-1">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-layout-grid" class="size-5 text-toast-700" />
                <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                  Jams
                </h3>
              </div>
              <span class="text-xs text-toast-700 font-medium">
                {{ seatingPlans.length }} active jam{{ seatingPlans.length === 1 ? '' : 's' }}
              </span>
            </div>

            <UPageGrid class="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
              <div v-for="plan in seatingPlans" :key="plan._id"
                class="bg-toast-500 rounded-xl p-3.5 sm:p-4 space-y-2.5 flex flex-col justify-between border-5 border-toast-500 text-white group">
                <div class="space-y-2">
                  <!-- Row 1: Plan Name, Hazard alert (if unpaid), and Plan Type badge -->
                  <div class="flex items-start justify-between gap-2 pb-0.5 min-w-0">
                    <h3
                      class="min-w-0 flex-1 font-serif text-lg sm:text-xl font-bold text-white group-hover:text-bread-200 transition-colors wrap-break-word hyphens-none leading-tight">
                      {{ plan.name }}
                    </h3>

                    <div class="flex items-center gap-2 shrink-0">
                      <!-- Hazard icon with hover tooltip if seating plan is not active/fully paid -->
                      <UTooltip v-if="!isSeatingPlanFullyPaid(plan)" :text="getSeatingPaymentStatusLabel(plan)"
                        :content="{ side: 'top' }">
                        <div
                          class="inline-flex items-center justify-center size-6.5 rounded-full bg-amber-400/20 border border-amber-400/60 text-amber-300 cursor-help transition-transform hover:scale-110 shadow-xs"
                          aria-label="Payment status">
                          <UIcon name="i-lucide-alert-triangle" class="size-4 text-amber-400 animate-pulse" />
                        </div>
                      </UTooltip>

                      <!-- Plan package badge -->
                      <UBadge color="bread" variant="subtle" size="xs"
                        class="rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-bold">
                        {{ plan.packageName }}
                      </UBadge>
                    </div>
                  </div>

                  <!-- Row 2: Below title is guest count -->
                  <div class="text-xs text-toast-200 font-medium">
                    {{ plan.guestCount }} / {{ plan.maxGuests }} guests
                  </div>

                  <!-- Venue & Date -->
                  <div class="space-y-1 text-xs text-toast-100 pt-0.5">
                    <div class="flex items-start gap-1.5">
                      <UIcon name="i-lucide-map-pin" class="size-3.5 text-bread-300 shrink-0 mt-0.5" />
                      <span class="wrap-break-word hyphens-none flex-1">{{ plan.venue || 'Venue pending' }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 truncate">
                      <UIcon name="i-lucide-calendar" class="size-3.5 text-bread-300 shrink-0" />
                      <span class="truncate">{{ formatEventDateLabel(plan.eventDate) }}</span>
                    </div>
                  </div>
                </div>
                <div class="pt-2">
                  <UButton block size="sm" :color="plan.status === 'ACTIVE' ? 'bread' : 'neutral'" variant="solid"
                    :icon="plan.status === 'ACTIVE' ? 'i-lucide-arrow-right' : 'i-lucide-credit-card'" trailing
                    class="w-full text-xs sm:text-sm py-2 px-3 rounded-lg cursor-pointer justify-center font-bold" :to="plan.status === 'ACTIVE'
                      ? `/jam/dashboard/${plan._id}`
                      : { path: '/user/seating-payment', query: { gatheringId: plan._id } }">
                    {{ plan.status === 'ACTIVE' ? 'Open Jam' : 'Complete Payment' }}
                  </UButton>
                </div>
              </div>
            </UPageGrid>
          </div>

          <!-- Empty Jams State -->
          <div v-else class="p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto w-full">
            <div
              class="size-16 rounded-full bg-toast-600 text-white flex items-center justify-center mx-auto shadow-sm">
              <UIcon name="i-lucide-layout-grid" class="size-8" />
            </div>
            <div class="space-y-1">
              <h3 class="text-xl sm:text-2xl font-serif font-bold text-toast-900">No Jams Yet</h3>
              <p class="text-xs sm:text-sm text-toast-700 max-w-sm mx-auto">
                Arrange tables, assign seats, manage RSVP lists, and set up your guest arrival pass scanner with Jam.
              </p>
            </div>
            <div class="pt-2">
              <UButton color="primary" variant="solid" size="md"
                class="font-semibold bg-toast-600 hover:bg-toast-700 text-white rounded-lg shadow-sm cursor-pointer"
                icon="i-lucide-plus" @click.prevent="startPageTransition('/user/create-seating')">
                Create Your First Jam
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style></style>
