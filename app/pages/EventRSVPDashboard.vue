<script lang="ts" setup>
import type { EventQuestion, EventRecord, RsvpSummary } from '~/types/event'
import { rsvpSummaryToChartData } from '~/types/event'
import type { RsvpRecord, RsvpStatusFilter } from '~/types/rsvp'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { useEventQuestions } from '~/composables/useEventQuestions'
import {
  aggregateQuestionAnswerChartData,
  countQuestionAnswers,
  isChartableQuestionType,
  formatRsvpAnswerValue,
  formatRsvpAnswerNotes,
  formatRsvpDate,
  isRetiredQuestion,
  mapRsvpStatusToBadgeColor,
  mapRsvpStatusToLabel,
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

const QUESTION_TYPES = [
  { label: 'Text (open-ended)', value: 'TEXT' },
  { label: 'Multiple choice', value: 'OPTIONS' },
  { label: 'Yes / No', value: 'YES/NO' },
]

const STATUS_FILTER_OPTIONS = [
  { label: 'All statuses', value: 'ALL' as const },
  { label: 'Attending', value: 'GOING' as const },
  { label: 'Not Attending', value: 'NOT_GOING' as const },
  { label: 'Pending', value: 'PENDING' as const },
]

const PAGE_SIZE = 25
const EMOJI_RE = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u

type DraftQuestion = {
  id: number
  question: string
  type: string
  options: string[]
}

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { fetchAllEventRsvps, fetchEventRsvps } = useRsvps()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { isExporting, exportEventPdf } = useEventPdfExport()
const { updateEventQuestions } = useEventQuestions()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const rsvpSummary = ref<RsvpSummary | null>(null)
const isLoadingEvent = ref(true)
const isLoadingRsvps = ref(false)
const allRsvps = ref<RsvpRecord[]>([])

const paginatedRsvps = ref<RsvpRecord[]>([])
const isPaginatedRsvpsLoading = ref(false)
const rsvpPage = ref(1)
const rsvpTotal = ref(0)
const rsvpTotalPages = ref(1)
const rsvpStatusFilter = ref<RsvpStatusFilter>('ALL')

const isQuestionsModalOpen = ref(false)
const questionsMode = ref<'edit' | 'preview'>('edit')
const isSubmittingQuestions = ref(false)
const draftQuestions = ref<DraftQuestion[]>([])

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')

const chartData = computed(() =>
  rsvpSummary.value ? rsvpSummaryToChartData(rsvpSummary.value) : []
)

const questions = computed(() => eventRecord.value?.questions ?? [])


const items = [
  { label: `Questions (${questions.value.length})`, slot: 'questions' },
  { label: 'Responses', slot: 'responses' }]

function questionTypeLabel(type: string): string {
  return QUESTION_TYPE_LABELS[type] ?? type
}

function questionTypeColor(type: string): 'teal' | 'secondary' | 'info' {
  if (type === 'TEXT') return 'teal'
  if (type === 'OPTIONS') return 'info'
  return 'secondary'
}

function formatGuestName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
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

async function loadPaginatedRsvps() {
  const targetEventId = eventId.value || 'mock-event-id'
  if (!eventId.value && !isUiOnlyMode.value) {
    paginatedRsvps.value = []
    rsvpTotal.value = 0
    rsvpTotalPages.value = 1
    return
  }

  isPaginatedRsvpsLoading.value = true
  try {
    const response = await fetchEventRsvps(targetEventId, {
      page: rsvpPage.value,
      limit: PAGE_SIZE,
      status: rsvpStatusFilter.value,
    })
    paginatedRsvps.value = response.rsvps ?? []
    rsvpTotal.value = response.total ?? 0
    rsvpTotalPages.value = response.totalPages ?? 1
    rsvpPage.value = response.page ?? rsvpPage.value
  } catch (error) {
    reportApiError(toast, { title: 'Could not load RSVP responses', error })
    paginatedRsvps.value = []
    rsvpTotal.value = 0
    rsvpTotalPages.value = 1
  } finally {
    isPaginatedRsvpsLoading.value = false
  }
}

function handleRsvpStatusFilterChange(value: RsvpStatusFilter) {
  rsvpStatusFilter.value = value
  rsvpPage.value = 1
  loadPaginatedRsvps()
}

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    eventRecord.value = null
    rsvpSummary.value = null
    allRsvps.value = []
    paginatedRsvps.value = []
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
          emailsSent: 14,
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
    await loadPaginatedRsvps()
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
  }
}

function makeBlankQuestion(): DraftQuestion {
  return { id: Date.now() + Math.random(), question: '', type: '', options: ['', ''] }
}

function seedDraftQuestions() {
  if (questions.value.length) {
    draftQuestions.value = questions.value.map((q, i) => ({
      id: Date.now() + i,
      question: q.question,
      type: q.type,
      options: q.type === 'OPTIONS' && q.options?.length ? [...q.options] : ['', ''],
    }))
  } else {
    draftQuestions.value = [makeBlankQuestion()]
  }
  questionsMode.value = 'edit'
}

function addDraftQuestion() {
  draftQuestions.value.push(makeBlankQuestion())
}

function removeDraftQuestion(id: number) {
  if (draftQuestions.value.length > 1) {
    draftQuestions.value = draftQuestions.value.filter((q) => q.id !== id)
  }
}

function addDraftOption(q: DraftQuestion) {
  q.options.push('')
}

function removeDraftOption(q: DraftQuestion, index: number) {
  if (q.options.length > 2) {
    q.options.splice(index, 1)
  }
}

function validateDraftQuestions(): string | null {
  if (!draftQuestions.value.length) return 'Add at least one question.'
  for (const [i, q] of draftQuestions.value.entries()) {
    const n = i + 1
    if (!q.question.trim()) return `Question ${n}: question text is required.`
    if (EMOJI_RE.test(q.question)) return `Question ${n}: question text must not contain emojis.`
    if (!q.type) return `Question ${n}: question type is required.`
    if (q.type === 'OPTIONS') {
      const filled = q.options.filter((o) => o.trim().length > 0)
      if (filled.length < 2) return `Question ${n}: at least two non-empty options are required.`
      for (const o of q.options) {
        if (o.trim() && EMOJI_RE.test(o)) return `Question ${n}: option text must not contain emojis.`
      }
    }
  }
  return null
}

function buildDraftPayload(): EventQuestion[] {
  return draftQuestions.value.map((q) => ({
    question: q.question.trim(),
    type: q.type,
    ...(q.type === 'OPTIONS'
      ? { options: q.options.map((o) => o.trim()).filter(Boolean) }
      : {}),
  }))
}

async function handleSaveQuestions() {
  if (questionsMode.value === 'preview') {
    questionsMode.value = 'edit'
    return
  }
  const error = validateDraftQuestions()
  if (error) {
    toast.add({ title: 'Validation error', description: error, color: 'error' })
    return
  }
  if (isSubmittingQuestions.value) return
  isSubmittingQuestions.value = true
  try {
    await updateEventQuestions(eventId.value || 'mock-event-id', buildDraftPayload())
    toast.add({ title: 'Questions saved', description: 'RSVP questions have been updated.', color: 'success' })
    isQuestionsModalOpen.value = false
    await loadEventData()
  } catch (err) {
    reportApiError(toast, { title: 'Could not save questions', error: err })
  } finally {
    isSubmittingQuestions.value = false
  }
}

const previewQuestions = computed(() =>
  draftQuestions.value.filter((q) => q.question.trim() && q.type)
)

watch(rsvpPage, () => {
  loadPaginatedRsvps()
})

watch(isQuestionsModalOpen, (isOpen) => {
  if (isOpen) seedDraftQuestions()
})

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
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div class="flex flex-wrap items-center gap-2">
          <UButton icon="i-lucide-pencil" color="teal" :disabled="isEventCancelled || (!eventId && !isUiOnlyMode)"
            @click="() => { isQuestionsModalOpen = true }">
            Edit Questions
          </UButton>
          <UButton
            icon="i-lucide-file-down"
            color="neutral"
            variant="outline"
            :loading="isExporting"
            :disabled="!eventId || isExporting"
            @click="exportEventPdf(eventId, 'rsvps')"
          >
            Export PDF
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <div v-if="isLoadingEvent" class="flex items-center justify-center py-16 text-muted">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading event...</span>
    </div>

    <div v-else>
      <UPageCard class="white-bread-container mb-8">
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 sm:items-center">
          <div class="space-y-1">
            <div class="text-sm font-medium text-teal-600/70 dark:text-teal-400/70">
              Emails sent
            </div>
            <div class="text-3xl font-bold text-teal-600 dark:text-teal-400">
              {{ (rsvpSummary?.emailsSent ?? rsvpSummary?.totalSent ?? 0).toLocaleString() }}
            </div>
          </div>
          <div class="space-y-1">
            <div class="text-sm font-medium text-teal-600/70 dark:text-teal-400/70">
              Emails remaining
            </div>
            <div class="text-3xl font-bold text-teal-600 dark:text-teal-400">
              {{ eventRecord?.remainingEmails?.toLocaleString() ?? '—' }}
            </div>
          </div>
          <div class="space-y-1 sm:col-span-2 lg:col-span-1">
            <div class="text-sm font-medium text-teal-600/70 dark:text-teal-400/70">
              Main event RSVPs sent
            </div>
            <div class="text-3xl font-bold text-teal-600 dark:text-teal-400">
              {{ rsvpSummary?.totalSent?.toLocaleString() ?? 0 }}
            </div>
          </div>
          <PieChart title="Response Status" :data="chartData" :colors="RSVP_CHART_COLORS" />
        </div>
      </UPageCard>

      <UPageCard class="white-bread-container space-y-6">
        <UAlert v-if="isEventCancelled" color="warning" variant="subtle" title="Event cancelled"
          description="RSVP questions cannot be edited for a cancelled event." />




        <UTabs :items="items" color="teal" :ui="{ list: 'bg-teal-100 dark:bg-teal-800' }">

          <template #questions>
            <div class="mt-4 space-y-4">
              <div v-if="!questions.length"
                class="flex flex-col items-center justify-center rounded-lg border border-dashed border-teal-500/40 bg-teal-50/50 dark:border-teal-400/40 dark:bg-teal-900/20 px-6 py-14 text-center">
                <UIcon name="i-lucide-message-square-text" class="size-10 text-muted" />
                <div class="mt-4 text-base font-medium">No questions yet</div>
                <div class="mt-1 max-w-sm text-sm text-muted">
                  Add questions for guests to answer when they respond to your RSVP invitation.
                </div>
                <UButton v-if="!isEventCancelled" class="mt-6" color="teal" icon="i-lucide-pencil"
                  @click="() => { isQuestionsModalOpen = true }">
                  Edit Questions
                </UButton>
              </div>

              <UPageGrid v-else class="items-start">
                <UPageCard v-for="(question, index) in questions" :key="`${index}-${question.question}`"
                  class="bg-teal-50/50 dark:bg-teal-900/20 ring ring-inset ring-teal-500/25"
                  :ui="{container: 'gap-y-0'}">
                  <div class="flex items-start gap-3">
                    <div class="font-medium text-highlighted shrink-0">
                      {{ index + 1 }}.
                    </div>
                    <div class="flex-1 min-w-0">
                      <UPageGrid class="items-start mb-0 pb-0" :ui="{base: ' lg:grid-cols-8 gap-0'}">
                        <div class="font-medium text-highlighted col-span-5">
                          {{ question.question }}
                        </div>
                        <div class="text-right col-span-3">
                          <UBadge :color="questionTypeColor(question.type)" variant="subtle" class="">
                            {{ questionTypeLabel(question.type) }}
                          </UBadge>
                        </div>
                      </UPageGrid>
                      
                      <div v-if="question.type === 'OPTIONS' && question.options?.length" class="mt-2 text-sm text-muted font-medium">
                        Options: {{ question.options.join(', ') }}
                      </div>

                      <div v-if="isChartableQuestionType(question.type)" class="mt-3 max-w-sm">
                        <div v-if="isLoadingRsvps" class="flex items-center gap-2 py-2 text-xs text-muted">
                          <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
                          Loading answer breakdown...
                        </div>
                        <PieChart v-else size="compact"
                          :title="`Answer breakdown (${countQuestionAnswers(question, allRsvps)} responses)`"
                          :data="aggregateQuestionAnswerChartData(question, allRsvps)" :colors="QUESTION_CHART_COLORS" />
                      </div>
                    </div>
                  </div>
                </UPageCard>
              </UPageGrid>
            </div>
          </template>

          <template #responses>
            <div class="mt-4 space-y-4 w-full">
              <div class="flex flex-wrap items-center justify-end gap-3">
                <UFormField label="Filter by status" name="rsvpStatusFilter" class="min-w-48">
                  <USelect v-model="rsvpStatusFilter" :items="STATUS_FILTER_OPTIONS" value-key="value" label-key="label"
                    class="w-full" @update:model-value="handleRsvpStatusFilterChange($event as RsvpStatusFilter)" />
                </UFormField>
              </div>

              <div v-if="isPaginatedRsvpsLoading" class="flex items-center justify-center py-12 text-muted">
                <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
                <span class="ml-2 text-sm">Loading responses...</span>
              </div>

              <div v-else-if="!paginatedRsvps.length"
                class="flex flex-col items-center justify-center rounded-lg border border-dashed border-teal-500/40 bg-teal-50/50 dark:border-teal-400/40 dark:bg-teal-900/20 px-6 py-14 text-center">
                <UIcon name="i-lucide-inbox" class="size-10 text-muted" />
                <div class="mt-4 text-base font-medium">No RSVP responses yet</div>
                <div class="mt-1 max-w-sm text-sm text-muted">
                  Responses will appear here after you send invitations and guests reply.
                </div>
              </div>

              <UPageGrid class="items-start">
                <UPageCard v-for="rsvp in paginatedRsvps" :key="rsvp._id" class="bg-teal-50/50 dark:bg-teal-900/20 ring ring-inset ring-teal-500/25">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="space-y-1">
                      <div class="font-medium text-highlighted">
                        {{ formatGuestName(rsvp.name) }}
                      </div>
                      <div class="text-sm text-muted">
                        {{ rsvp.email }}
                      </div>
                    </div>

                    <div class="flex flex-col items-end gap-1">
                      <UBadge :color="mapRsvpStatusToBadgeColor(rsvp.status)" variant="subtle">
                        {{ mapRsvpStatusToLabel(rsvp.status) }}
                      </UBadge>
                      <div v-if="formatRsvpDate(rsvp.respondedAt)" class="text-xs text-muted">
                        Responded {{ formatRsvpDate(rsvp.respondedAt) }}
                      </div>
                      <div v-else-if="formatRsvpDate(rsvp.invitedAt)" class="text-xs text-muted">
                        Invited {{ formatRsvpDate(rsvp.invitedAt) }}
                      </div>
                    </div>
                  </div>


                  <div v-if="rsvp.answers.length" class="space-y-3">
                    <div v-for="(answer, index) in rsvp.answers" :key="`${rsvp._id}-${index}-${answer.question}`"
                      class="rounded-lg border border-teal-500/25 bg-white  px-4 py-3">
                      <div class="flex flex-wrap items-start justify-between gap-2">
                        <div class="text-sm font-medium text-highlighted">
                          {{ answer.question }}
                        </div>
                        <UBadge v-if="isRetiredQuestion(answer.question, questions)" color="warning" variant="subtle"
                          size="xs">
                          Previous question
                        </UBadge>
                      </div>
                      <div class="mt-2 text-sm text-muted">
                        {{ formatRsvpAnswerValue(answer.answer) }}
                      </div>
                      <p
                        v-if="formatRsvpAnswerNotes(answer.notes)"
                        class="mt-2 text-sm text-muted italic"
                      >
                        Notes: {{ formatRsvpAnswerNotes(answer.notes) }}
                      </p>
                    </div>
                  </div>

                  <div v-else class="text-sm text-muted italic">
                    No answers submitted yet
                  </div>
                </UPageCard>
              </UPageGrid>

              <div v-if="!isPaginatedRsvpsLoading && rsvpTotalPages > 1" class="flex justify-center pt-2">
                <UPagination v-model:page="rsvpPage" :total="rsvpTotal" :items-per-page="PAGE_SIZE" show-edges />
              </div>
            </div>
          </template>
        </UTabs>
      </UPageCard>
    </div>

    <UModal v-model:open="isQuestionsModalOpen" :dismissible="false" fullscreen :ui="{
      header: 'bg-toast-400 border-none',
      title: 'text-white font-serif text-xl',
      content: 'border-none ring-transparent',
    }">
      <template #header>
        <div class="flex items-center justify-between w-full gap-4">
          <h3 class="text-white font-serif text-xl font-semibold truncate">
            RSVP Questions
          </h3>
          <div class="flex items-center gap-2 shrink-0">
            <UButton :icon="questionsMode === 'edit' ? 'i-lucide-eye' : 'i-lucide-pencil'"
              :label="questionsMode === 'edit' ? 'Preview' : 'Back to Edit'" size="sm" color="neutral" variant="outline"
              class="text-white border-white/40 hover:bg-white/10" :disabled="isSubmittingQuestions"
              @click="() => { questionsMode = questionsMode === 'edit' ? 'preview' : 'edit' }" />
            <UButton icon="i-lucide-x" variant="ghost" color="neutral" class="text-white hover:bg-white/10"
              :disabled="isSubmittingQuestions" @click="() => { isQuestionsModalOpen = false }" />
          </div>
        </div>
      </template>

      <template #body>
        <div v-if="questionsMode === 'edit'" class="max-w-5xl mx-auto py-6 px-4">
          <div class="grid gap-6 lg:grid-cols-3">
            <div class="space-y-4">
              <UPageCard>
                <h4 class="font-semibold text-base mb-1">Building your RSVP form</h4>
                <USeparator class="my-3" />
                <ul class="text-sm text-muted space-y-2 list-disc list-inside">
                  <li>Add questions guests will answer when they respond to your invitation.</li>
                  <li>Choose <strong>Text</strong> for open-ended answers.</li>
                  <li>Choose <strong>Multiple choice</strong> and provide at least two options.</li>
                  <li>Choose <strong>Yes / No</strong> for simple confirmations.</li>
                  <li>No emojis are allowed in any field.</li>
                </ul>
                <div class="text-xs text-muted mt-4">
                  Saving will replace all existing questions for this event.
                </div>
              </UPageCard>
            </div>

            <div class="lg:col-span-2 space-y-4">
              <UPageCard v-for="(q, index) in draftQuestions" :key="q.id">
                <div class="flex items-center justify-between mb-3">
                  <span class="font-semibold text-sm">Question {{ index + 1 }}</span>
                  <UButton icon="i-lucide-x" size="xs" variant="ghost" color="error"
                    :disabled="draftQuestions.length <= 1" @click="removeDraftQuestion(q.id)" />
                </div>

                <div class="space-y-3">
                  <UFormField label="Question text" :name="`q_${index}_text`" required>
                    <UInput v-model="q.question" class="w-full"
                      placeholder="e.g. Do you have any dietary restrictions?" />
                  </UFormField>

                  <UFormField label="Answer type" :name="`q_${index}_type`" required>
                    <USelect v-model="q.type" :items="QUESTION_TYPES" value-key="value" label-key="label" class="w-full"
                      placeholder="Select a type" />
                  </UFormField>

                  <div v-if="q.type === 'OPTIONS'" class="pt-1">
                    <div class="text-sm font-medium mb-2">
                      Options
                      <span class="text-muted font-normal">(at least two required)</span>
                    </div>
                    <div v-for="(_, optIndex) in q.options" :key="optIndex" class="flex items-center gap-2 mb-2">
                      <span class="text-muted text-sm w-5 shrink-0 text-right">{{ optIndex + 1 }}.</span>
                      <UInput v-model="q.options[optIndex]" class="flex-1" :placeholder="`Option ${optIndex + 1}`" />
                      <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error"
                        :disabled="q.options.length <= 2" @click="removeDraftOption(q, optIndex)" />
                    </div>
                    <UButton size="sm" variant="outline" icon="i-lucide-plus" block class="mt-1"
                      @click="addDraftOption(q)">
                      Add option
                    </UButton>
                  </div>

                  <div v-else-if="q.type === 'YES/NO'" class="pt-1">
                    <div class="text-sm text-muted">
                      Guests will choose between <strong>Yes</strong> and <strong>No</strong>.
                    </div>
                  </div>

                  <div v-else-if="q.type === 'TEXT'" class="pt-1">
                    <div class="text-sm text-muted">
                      Guests will type a free-text answer.
                    </div>
                  </div>
                </div>
              </UPageCard>

              <UButton variant="subtle" icon="i-lucide-square-plus" block @click="addDraftQuestion">
                Add new question
              </UButton>
            </div>
          </div>
        </div>

        <div v-else class="max-w-2xl mx-auto py-6 px-4">
          <div class="text-sm text-muted mb-6 text-center">
            This is how your RSVP questions will appear to guests. Fields are disabled for preview.
          </div>

          <div v-if="previewQuestions.length" class="space-y-6">
            <UPageCard v-for="(q, index) in previewQuestions" :key="q.id">
              <div class="flex items-start gap-3">
                <div class="text-sm font-semibold shrink-0">
                  {{ index + 1 }}.
                </div>
                <div class="flex-1 min-w-0 space-y-3">
                  <div class="text-sm font-semibold">
                    {{ q.question }}
                  </div>

                  <UTextarea v-if="q.type === 'TEXT'" disabled placeholder="Guest's answer…" class="w-full opacity-60" />

                  <div v-else-if="q.type === 'OPTIONS'" class="space-y-2">
                    <label v-for="(opt, oi) in q.options.filter(o => o.trim())" :key="oi"
                      class="flex items-center gap-3 cursor-not-allowed opacity-70">
                      <span class="w-4 h-4 rounded-full border-2 border-muted shrink-0 flex items-center justify-center">
                        <span class="w-2 h-2 rounded-full bg-transparent" />
                      </span>
                      <span class="text-sm">{{ opt }}</span>
                    </label>
                    <div v-if="!q.options.filter(o => o.trim()).length" class="text-xs text-muted italic">
                      No options added yet.
                    </div>
                  </div>

                  <div v-else-if="q.type === 'YES/NO'" class="flex gap-6">
                    <label class="flex items-center gap-2 cursor-not-allowed opacity-70">
                      <span class="w-4 h-4 rounded-full border-2 border-muted shrink-0" />
                      <span class="text-sm">Yes</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-not-allowed opacity-70">
                      <span class="w-4 h-4 rounded-full border-2 border-muted shrink-0" />
                      <span class="text-sm">No</span>
                    </label>
                  </div>
                </div>
              </div>
            </UPageCard>
          </div>

          <UPageCard v-else class="text-center text-muted text-sm py-10">
            No valid questions to preview. Go back to edit and fill in at least one question.
          </UPageCard>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" color="neutral" :disabled="isSubmittingQuestions"
            @click="() => { isQuestionsModalOpen = false }">
            Cancel
          </UButton>
          <UButton v-if="questionsMode === 'edit'" :loading="isSubmittingQuestions" :disabled="isSubmittingQuestions"
            @click="handleSaveQuestions">
            Save Questions
          </UButton>
          <UButton v-else variant="outline" @click="() => { questionsMode = 'edit' }">
            Back to Edit
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
