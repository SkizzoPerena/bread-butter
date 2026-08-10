<script lang="ts" setup>
import { DateFormatter } from '@internationalized/date'
import type { EventRecord, TasksSummary } from '~/types/event'
import { formatEventPriceTier } from '~/types/event'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { EVENT_FEATURE } from '~/utils/eventTierFeatures'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Tasks',
  bgClass: 'bg-red-50',
})

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { requireEventFeature } = useEventFeatureGate()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const tasksSummary = ref<TasksSummary | null>(null)
const isLoadingEvent = ref(false)
const tasksPanelRef = ref<{ openCreateModal: () => void } | null>(null)

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')

const eventTitle = computed(() => eventRecord.value?.eventName ?? '')

const eventDateLabel = computed(() => {
  const dateValue = eventRecord.value?.eventDate
  return dateValue ? df.format(new Date(dateValue)) : ''
})

const taskCount = computed(() => tasksSummary.value?.totalTasks ?? 0)

const todoCount = computed(() => tasksSummary.value?.byStatus?.TODO ?? 0)
const ongoingCount = computed(() => tasksSummary.value?.byStatus?.ONGOING ?? 0)
const completedCount = computed(() => tasksSummary.value?.byStatus?.COMPLETED ?? 0)

const completionRate = computed(() => {
  const total = taskCount.value
  if (total === 0) {
    return 0
  }
  return Math.round((completedCount.value / total) * 100)
})


function openAddTask() {
  tasksPanelRef.value?.openCreateModal()
}

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    eventRecord.value = null
    return
  }

  const targetEventId = eventId.value || 'mock-event-id'
  isLoadingEvent.value = true
  tasksSummary.value = null

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
          priceTier: {
            _id: 'mock-tier-id',
            code: 'bread_butter',
            name: 'Bread + Butter',
            pricePhp: 10000,
            isEnabled: true,
          },
          tierPricePhp: 10000,
        } satisfies EventRecord,
        guestList: [],
        rsvpSummary: null,
        tasks: {
          totalTasks: 0,
          byStatus: { TODO: 0, ONGOING: 0, COMPLETED: 0 },
          preview: { page: 1, limit: 5, subtasksLimit: 2, tasks: [] },
        },
      }),
    })
    eventRecord.value = detail.event
    setActiveEvent(detail.event)
    tasksSummary.value = detail.tasks
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
  }
}

onMounted(async () => {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    navigateTo('/user/dashboard')
    return
  }

  const allowed = await requireEventFeature(EVENT_FEATURE.TASKS)
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
          color="red"
          :disabled="isEventCancelled"
          @click="openAddTask"
        >
          Add Task
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

    <template v-else>
      <UPageCard class="white-bread-container">
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0 flex-1">
            <div class="mb-2 flex flex-wrap items-center gap-2 md:gap-3">
              <h1 class="text-xl font-bold text-highlighted md:text-2xl">
                {{ eventTitle }}
              </h1>
              <UBadge color="red" variant="subtle">
                {{ taskCount }} {{ taskCount === 1 ? 'task' : 'tasks' }}
              </UBadge>
            </div>
            <p
              v-if="eventRecord?.description"
              class="mb-3 text-sm text-muted"
            >
              {{ eventRecord.description }}
            </p>
            <div class="flex flex-wrap items-center gap-2 text-sm text-muted md:gap-4">
              <span
                v-if="eventRecord"
                class="inline-flex items-center gap-1.5"
              >
                <UIcon name="i-lucide-tag" class="size-4" />
                {{ formatEventPriceTier(eventRecord) }}
              </span>
              <span v-if="eventRecord && eventDateLabel">•</span>
              <span
                v-if="eventDateLabel"
                class="inline-flex items-center gap-1.5"
              >
                <UIcon name="i-lucide-calendar" class="size-4" />
                {{ eventDateLabel }}
              </span>
              <span v-if="eventDateLabel && eventRecord?.venue">•</span>
              <span
                v-if="eventRecord?.venue"
                class="inline-flex items-center gap-1.5"
              >
                <UIcon name="i-lucide-map-pin" class="size-4" />
                {{ eventRecord.venue }}
              </span>
            </div>
          </div>
          <UButton
            icon="i-lucide-list-plus"
            color="red"
            class="w-full shrink-0 md:w-auto"
            :disabled="isEventCancelled"
            @click="openAddTask"
          >
            Add Task
          </UButton>
        </div>
      </UPageCard>

      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <UPageCard class="white-bread-container">
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-primary/10 p-2.5">
              <UIcon name="i-lucide-list-todo" class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-sm font-medium text-muted">To Do</p>
              <p class="text-2xl font-bold text-highlighted">{{ todoCount }}</p>
            </div>
          </div>
        </UPageCard>

        <UPageCard class="white-bread-container">
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-warning/10 p-2.5">
              <UIcon name="i-lucide-loader" class="size-5 text-warning" />
            </div>
            <div>
              <p class="text-sm font-medium text-muted">Ongoing</p>
              <p class="text-2xl font-bold text-highlighted">{{ ongoingCount }}</p>
            </div>
          </div>
        </UPageCard>

        <UPageCard class="white-bread-container">
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-success/10 p-2.5">
              <UIcon name="i-lucide-circle-check" class="size-5 text-success" />
            </div>
            <div>
              <p class="text-sm font-medium text-muted">Completed</p>
              <p class="text-2xl font-bold text-highlighted">{{ completedCount }}</p>
            </div>
          </div>
        </UPageCard>

        <UPageCard class="white-bread-container">
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-red-100 p-2.5 dark:bg-red-950/40">
              <UIcon name="i-lucide-percent" class="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p class="text-sm font-medium text-muted">Completion</p>
              <p class="text-2xl font-bold text-highlighted">{{ completionRate }}%</p>
              <p class="text-xs text-muted">
                {{ completedCount }} of {{ taskCount }} tasks completed
              </p>
            </div>
          </div>
        </UPageCard>
      </div>

      <UPageCard class="white-bread-container">
        <div class="mb-4 text-lg font-semibold text-muted">Tasks</div>
        <EventTasksCardPanel
          ref="tasksPanelRef"
          v-model:tasks-summary="tasksSummary"
          :event-id="eventId"
          :event-record="eventRecord"
          :is-event-cancelled="isEventCancelled"
        />
      </UPageCard>
    </template>
  </UContainer>
</template>
