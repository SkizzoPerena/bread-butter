<script lang="ts" setup>
import type { EventQuestion, EventRecord, RsvpSummary } from '~/types/event'
import { rsvpSummaryToChartData } from '~/types/event'
import type { RsvpRecord } from '~/types/rsvp'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import {
  aggregateQuestionAnswerChartData,
  countQuestionAnswers,
  isChartableQuestionType,
} from '~/utils/rsvpDisplay'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'RSVP',
  bgClass: 'bg-teal-50',
})

const RSVP_CHART_COLORS = ['#14b8a6', '#f43f5e', '#f59e0b']
const QUESTION_CHART_COLORS = [
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#f59e0b',
  '#f43f5e',
  '#10b981',
]

const QUESTION_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Text',
  OPTIONS: 'Multiple choice',
  'YES/NO': 'Yes / No',
}

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { fetchAllEventRsvps } = useRsvps()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const rsvpSummary = ref<RsvpSummary | null>(null)
const isLoadingEvent = ref(true)
const isLoadingRsvps = ref(false)
const allRsvps = ref<RsvpRecord[]>([])
const isQuestionsModalOpen = ref(false)
const rsvpResponsesRef = ref<{ reload: () => Promise<void> } | null>(null)

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')

const chartData = computed(() =>
  rsvpSummary.value ? rsvpSummaryToChartData(rsvpSummary.value) : []
)

const questions = computed(() => eventRecord.value?.questions ?? [])

const selectedTab = ref(0)

const tabItems = computed(() => [
  { label: `Questions (${questions.value.length})`, slot: 'questions' },
  { label: 'Responses', slot: 'responses' },
])

function questionTypeLabel(type: string): string {
  return QUESTION_TYPE_LABELS[type] ?? type
}

function questionTypeColor(type: string): 'teal' | 'secondary' | 'info' {
  if (type === 'TEXT') return 'teal'
  if (type === 'OPTIONS') return 'info'
  return 'secondary'
}

async function loadAllRsvps(targetEventId: string) {
  isLoadingRsvps.value = true
  try {
    allRsvps.value = await fetchAllEventRsvps(targetEventId)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load RSVP answers', error })
    allRsvps.value = []
  } finally {
    isLoadingRsvps.value = false
  }
}

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    eventRecord.value = null
    rsvpSummary.value = null
    allRsvps.value = []
    isLoadingEvent.value = false
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
          questions: [
            {
              question: 'Will you be attending the ceremony?',
              type: 'YES/NO',
            },
            {
              question: 'Meal preference?',
              type: 'OPTIONS',
              options: ['Chicken', 'Fish', 'Vegetarian'],
            },
            {
              question: 'Do you have any dietary restrictions?',
              type: 'TEXT',
            },
          ] satisfies EventQuestion[],
        } satisfies EventRecord,
        guestList: [],
        rsvpSummary: {
          totalSent: 12,
          going: 5,
          notGoing: 2,
          pending: 5,
        },
        tasks: null,
      }),
    })
    eventRecord.value = detail.event
    rsvpSummary.value = detail.rsvpSummary
    setActiveEvent(detail.event)
    await loadAllRsvps(targetEventId)
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
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <UButton
          v-if="selectedTab === 0 && questions.length > 0"
          icon="i-lucide-pencil"
          color="teal"
          :disabled="isEventCancelled || (!eventId && !isUiOnlyMode)"
          @click="isQuestionsModalOpen = true"
        >
          Edit Questions
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
        description="RSVP questions cannot be edited for a cancelled event."
      />

      <UPageCard class="bg-teal-50 dark:bg-teal-900/20 ring ring-inset ring-teal-500/25">
        <div class="grid gap-6 sm:grid-cols-2 sm:items-center">
          <div class="space-y-1">
            <p class="text-sm font-medium text-teal-600/70 dark:text-teal-400/70">
              RSVPs Sent
            </p>
            <p class="text-3xl font-bold text-teal-600 dark:text-teal-400">
              {{ rsvpSummary?.totalSent?.toLocaleString() ?? 0 }}
            </p>
          </div>
          <PieChart
            title="Response Status"
            :data="chartData"
            :colors="RSVP_CHART_COLORS"
          />
        </div>
      </UPageCard>
      <UTabs v-model="selectedTab" :items="tabItems" color="teal" :unmount="false" :ui="{ list: { background: 'bg-teal-100 dark:bg-teal-800' } }">
        <template #questions="{ item }">
          <div class="mt-4 space-y-4">
            <div
              v-if="!questions.length"
              class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center"
            >
              <UIcon name="i-lucide-message-square-text" class="size-10 text-muted" />
              <p class="mt-4 text-base font-medium">No questions yet</p>
              <p class="mt-1 max-w-sm text-sm text-muted">
                Add questions for guests to answer when they respond to your RSVP invitation.
              </p>
              <UButton
                v-if="!isEventCancelled"
                class="mt-6"
                color="teal"
                icon="i-lucide-pencil"
                @click="isQuestionsModalOpen = true"
              >
                Edit Questions
              </UButton>
            </div>

            <div v-else class="space-y-3">
              <UPageCard
                v-for="(question, index) in questions"
                :key="`${index}-${question.question}`"
                class="bg-muted/10"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <p class="font-medium text-highlighted">
                    {{ index + 1 }}. {{ question.question }}
                  </p>
                  <UBadge
                    :color="questionTypeColor(question.type)"
                    variant="subtle"
                  >
                    {{ questionTypeLabel(question.type) }}
                  </UBadge>
                </div>
                <p
                  v-if="question.type === 'OPTIONS' && question.options?.length"
                  class="mt-2 text-sm text-muted"
                >
                  Options: {{ question.options.join(', ') }}
                </p>

                <div
                  v-if="isChartableQuestionType(question.type)"
                  class="mt-3 max-w-sm"
                >
                  <div
                    v-if="isLoadingRsvps"
                    class="flex items-center gap-2 py-2 text-xs text-muted"
                  >
                    <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
                    Loading answer breakdown...
                  </div>
                  <PieChart
                    v-else
                    size="compact"
                    :title="`Answer breakdown (${countQuestionAnswers(question, allRsvps)} responses)`"
                    :data="aggregateQuestionAnswerChartData(question, allRsvps)"
                    :colors="QUESTION_CHART_COLORS"
                  />
                </div>
              </UPageCard>
            </div>
          </div>
        </template>

        <template #responses="{ item }">
          <div class="mt-4">
            <EventRsvpResponsesList
              v-if="eventId || isUiOnlyMode"
              ref="rsvpResponsesRef"
              :event-id="eventId || 'mock-event-id'"
              :current-questions="questions"
              hide-header
            />
          </div>
        </template>
      </UTabs>
    </UPageCard>

    <EventQuestionsModal
      v-if="eventId || isUiOnlyMode"
      v-model:open="isQuestionsModalOpen"
      :event-id="eventId || 'mock-event-id'"
      :initial-questions="questions"
      @saved="async () => {
        await loadEventData()
        await rsvpResponsesRef?.reload()
      }"
    />
  </UContainer>
</template>
