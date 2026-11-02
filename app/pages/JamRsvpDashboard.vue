<script lang="ts" setup>
import type { ChartSlice, EventQuestion } from '~/types/event'
import type { GatheringRecord, RsvpStatus, SeatingGuestRecord } from '~/types/seating'
import { guestDisplayName } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import PieChart from '~/components/PieChart.vue'
import {
  isChartableQuestionType,
  formatRsvpAnswerValue,
  formatRsvpAnswerNotes,
  formatRsvpDate,
  isRetiredQuestion,
  mapRsvpStatusToBadgeColor,
  mapRsvpStatusToLabel,
} from '~/utils/rsvpDisplay'

definePageMeta({
  layout: 'jam-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'RSVP',
  bgClass: 'bg-teal-50',
  middleware: 'seating-enabled',
})

useWeddingFonts()

const RSVP_CHART_COLORS = ['#14b8a6', '#f43f5e', '#f59e0b', '#94a3b8']
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
const { isUiOnlyMode } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const seating = useSeating()

const gatheringId = computed(() => String(route.params.gatheringId || route.query.gatheringId || ''))
const gathering = ref<GatheringRecord | null>(null)
const guests = ref<SeatingGuestRecord[]>([])
const isLoadingEvent = ref(true)
const isExporting = ref(false)

// Active Tab & Search
type RsvpTab = 'questions' | 'responses'
const activeTab = ref<RsvpTab>('questions')
const searchQuery = ref('')

const rsvpPage = ref(1)
const rsvpStatusFilter = ref<'ALL' | 'GOING' | 'NOT_GOING' | 'PENDING'>('ALL')

const isQuestionsModalOpen = ref(false)
const questionsMode = ref<'edit' | 'preview'>('edit')
const isSubmittingQuestions = ref(false)
const draftQuestions = ref<DraftQuestion[]>([])

// Sidebar Metrics
const goingCount = computed(() => guests.value.filter((g) => g.rsvpStatus === 'GOING').length)
const notGoingCount = computed(() => guests.value.filter((g) => g.rsvpStatus === 'NOT_GOING').length)
const pendingCount = computed(() => guests.value.filter((g) => !g.rsvpStatus || g.rsvpStatus === 'PENDING').length)
const invitationsSentCount = computed(() => guests.value.filter((g) => g.inviteSentAt).length)
const totalSentCount = computed(() => guests.value.length)
const emailCreditsRemaining = computed(() => {
  if (!gathering.value) return 0
  return Math.max(gathering.value.maxGuests - guests.value.length, 0)
})

const respondedCount = computed(() => goingCount.value + notGoingCount.value)
const responseRate = computed(() => {
  if (totalSentCount.value === 0) return 0
  return Math.min(100, Math.round((respondedCount.value / totalSentCount.value) * 100))
})

const chartData = computed<ChartSlice[]>(() => {
  return [
    { label: 'Attending', value: goingCount.value },
    { label: 'Not Attending', value: notGoingCount.value },
    { label: 'Pending', value: pendingCount.value },
  ].filter((slice) => slice.value > 0)
})

const questions = computed<EventQuestion[]>(() => gathering.value?.questions ?? [])

const tabItems = computed(() => [
  {
    label: 'Questions',
    value: 'questions',
    icon: 'i-lucide-message-square-text',
    badge: String(questions.value.length),
  },
  {
    label: 'Responses',
    value: 'responses',
    icon: 'i-lucide-inbox',
    badge: String(guests.value.length),
  },
])

// Filtered questions
const filteredQuestions = computed(() => {
  if (!searchQuery.value.trim() || activeTab.value !== 'questions') return questions.value
  const q = searchQuery.value.toLowerCase().trim()
  return questions.value.filter((item) =>
    item.question.toLowerCase().includes(q) ||
    item.type.toLowerCase().includes(q) ||
    item.options?.some((opt) => opt.toLowerCase().includes(q))
  )
})

// Filtered guests for responses
const filteredGuests = computed(() => {
  let list = guests.value
  if (rsvpStatusFilter.value === 'GOING') list = list.filter((g) => g.rsvpStatus === 'GOING')
  else if (rsvpStatusFilter.value === 'NOT_GOING') list = list.filter((g) => g.rsvpStatus === 'NOT_GOING')
  else if (rsvpStatusFilter.value === 'PENDING') list = list.filter((g) => !g.rsvpStatus || g.rsvpStatus === 'PENDING')

  if (searchQuery.value.trim() && activeTab.value === 'responses') {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter((g) =>
      guestDisplayName(g).toLowerCase().includes(q) ||
      (g.email || '').toLowerCase().includes(q) ||
      (g.answers ?? []).some((a) => a.question.toLowerCase().includes(q) || a.answer.toLowerCase().includes(q))
    )
  }
  return list
})

const paginatedGuests = computed(() => {
  const start = (rsvpPage.value - 1) * PAGE_SIZE
  return filteredGuests.value.slice(start, start + PAGE_SIZE)
})

const rsvpTotal = computed(() => filteredGuests.value.length)
const rsvpTotalPages = computed(() => Math.max(1, Math.ceil(rsvpTotal.value / PAGE_SIZE)))

function toggleStatusFilter(status: 'GOING' | 'NOT_GOING' | 'PENDING') {
  activeTab.value = 'responses'
  if (rsvpStatusFilter.value === status) {
    rsvpStatusFilter.value = 'ALL'
  } else {
    rsvpStatusFilter.value = status
  }
  rsvpPage.value = 1
}

function clearFilters() {
  searchQuery.value = ''
  rsvpStatusFilter.value = 'ALL'
  rsvpPage.value = 1
}

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

function getQuestionAnswerChartData(q: EventQuestion): ChartSlice[] {
  const counts = new Map<string, number>()
  if (q.type === 'YES/NO') {
    counts.set('Yes', 0)
    counts.set('No', 0)
  } else if (q.type === 'OPTIONS' && q.options) {
    for (const opt of q.options) {
      counts.set(opt, 0)
    }
  }

  for (const guest of guests.value) {
    const matched = guest.answers?.find((a) => a.question.trim().toLowerCase() === q.question.trim().toLowerCase())
    if (matched && matched.answer) {
      const val = matched.answer.trim()
      counts.set(val, (counts.get(val) || 0) + 1)
    }
  }

  return Array.from(counts.entries()).map(([label, value]) => ({ label, value }))
}

function countQuestionAnswers(q: EventQuestion): number {
  return guests.value.filter((guest) =>
    guest.answers?.some((a) => a.question.trim().toLowerCase() === q.question.trim().toLowerCase() && a.answer?.trim())
  ).length
}

async function loadData() {
  if (!gatheringId.value) return
  isLoadingEvent.value = true
  try {
    const [gatheringData, guestsData] = await Promise.all([
      seating.getGathering(gatheringId.value),
      seating.listGuests(gatheringId.value),
    ])
    gathering.value = gatheringData
    guests.value = guestsData.guests
    setActiveEvent({
      _id: gatheringData._id,
      name: gatheringData.name,
      title: gatheringData.name,
      location: gatheringData.venue,
      date: gatheringData.eventDate,
      eventDate: gatheringData.eventDate,
      status: gatheringData.status,
      maxGuests: gatheringData.maxGuests,
    } as any)
  } catch (error) {
    toast.add({ title: 'Could not load RSVP data', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    isLoadingEvent.value = false
  }
}

function seedDraftQuestions() {
  draftQuestions.value = questions.value.map((q, index) => ({
    id: index + 1,
    question: q.question,
    type: q.type,
    options: q.options ? [...q.options] : [],
  }))
}

function addDraftQuestion() {
  draftQuestions.value.push({
    id: Date.now(),
    question: '',
    type: 'TEXT',
    options: [],
  })
}

function removeDraftQuestion(index: number) {
  draftQuestions.value.splice(index, 1)
}

function addOption(qIndex: number) {
  draftQuestions.value[qIndex].options.push('')
}

function removeOption(qIndex: number, optIndex: number) {
  draftQuestions.value[qIndex].options.splice(optIndex, 1)
}

function onQuestionTypeChange(q: DraftQuestion) {
  if (q.type === 'OPTIONS' && !q.options.length) {
    q.options = ['']
  }
}

async function handleSaveQuestions() {
  for (const q of draftQuestions.value) {
    if (!q.question.trim()) {
      toast.add({
        title: 'Validation error',
        description: 'Question prompts cannot be empty.',
        color: 'error',
      })
      return
    }
    if (q.type === 'OPTIONS') {
      const validOptions = q.options.filter((o) => o.trim())
      if (!validOptions.length) {
        toast.add({
          title: 'Validation error',
          description: `Multiple choice question "${q.question}" must have at least one choice.`,
          color: 'error',
        })
        return
      }
    }
  }

  isSubmittingQuestions.value = true
  try {
    const payload: EventQuestion[] = draftQuestions.value.map((q) => ({
      question: q.question.trim(),
      type: q.type,
      options: q.type === 'OPTIONS' ? q.options.filter((o) => o.trim()) : undefined,
    }))

    await seating.saveInvitation(gatheringId.value, {
      questions: payload,
    })

    if (gathering.value) {
      gathering.value.questions = payload
    }

    toast.add({
      title: 'Questions saved',
      description: 'RSVP questions have been updated successfully.',
      color: 'success',
    })
    isQuestionsModalOpen.value = false
    await loadData()
  } catch (error) {
    toast.add({ title: 'Could not save questions', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    isSubmittingQuestions.value = false
  }
}

async function exportRsvpsCsv() {
  isExporting.value = true
  try {
    const blob = await seating.exportGuests(gatheringId.value)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rsvp-responses-${gathering.value?.name || 'jam'}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.add({ title: 'RSVP responses exported to CSV', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not export responses', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    isExporting.value = false
  }
}

watch(isQuestionsModalOpen, (isOpen) => {
  if (isOpen) {
    questionsMode.value = 'edit'
    seedDraftQuestions()
  }
})

onMounted(() => {
  loadData()
})

watch(gatheringId, () => {
  loadData()
})
</script>

<template>
  <div
    class="rsvp-page-root w-full min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-4 lg:overflow-hidden bg-bread-50/30"
  >
    <!-- Navbar Teleport Actions -->
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-file-down"
            color="neutral"
            variant="outline"
            size="sm"
            :loading="isExporting"
            @click="exportRsvpsCsv"
          >
            Export CSV
          </UButton>
          <UButton
            icon="i-lucide-pencil"
            color="teal"
            size="sm"
            @click="() => { seedDraftQuestions(); isQuestionsModalOpen = true }"
          >
            Edit Questions
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- ================= LEFT DIVISION (col-span-1): RSVP Overview & Metrics Sidebar ================= -->
    <aside
      class="col-span-1 lg:col-span-1 w-full bg-white border-b lg:border-b-0 lg:border-r border-bread-200/80 shadow-xs flex flex-col justify-between lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] z-20 overflow-y-auto p-4 sm:p-5 lg:p-6 space-y-6"
    >
      <div class="space-y-6">
        <!-- RSVP Overview -->
        <div class="space-y-3">
          <div class="flex items-center justify-between pb-1">
            <h2 class="font-bold font-serif text-sm text-highlighted">
              RSVP Overview
            </h2>
            <span class="text-xs text-muted font-sans font-medium">
              {{ totalSentCount }} registered
            </span>
          </div>

          <!-- Status Metrics Tiles (Going, Pending, Declined) -->
          <div class="grid grid-cols-3 gap-2">
            <!-- Going -->
            <button
              type="button"
              class="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-2.5 flex flex-col justify-between transition-all hover:bg-emerald-50 text-left cursor-pointer"
              :class="rsvpStatusFilter === 'GOING' ? 'ring-2 ring-emerald-400 bg-emerald-100/60 shadow-xs' : ''"
              :title="rsvpStatusFilter === 'GOING' ? 'Click to show all responses' : 'Filter by Going'"
              @click="toggleStatusFilter('GOING')"
            >
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-emerald-700 font-sans">Going</span>
                <UIcon name="i-lucide-check-circle-2" class="size-3.5 text-emerald-500" />
              </div>
              <span class="text-xl sm:text-2xl font-bold font-serif text-emerald-800 tracking-tight mt-1">
                {{ goingCount }}
              </span>
            </button>

            <!-- Pending -->
            <button
              type="button"
              class="bg-amber-50/70 border border-amber-200/70 rounded-xl p-2.5 flex flex-col justify-between transition-all hover:bg-amber-100/60 text-left cursor-pointer"
              :class="rsvpStatusFilter === 'PENDING' ? 'ring-2 ring-amber-400 bg-amber-100/80 shadow-xs' : ''"
              :title="rsvpStatusFilter === 'PENDING' ? 'Click to show all responses' : 'Filter by Pending'"
              @click="toggleStatusFilter('PENDING')"
            >
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-amber-700 font-sans">Pending</span>
                <UIcon name="i-lucide-clock" class="size-3.5 text-amber-500" />
              </div>
              <span class="text-xl sm:text-2xl font-bold font-serif text-amber-900 tracking-tight mt-1">
                {{ pendingCount }}
              </span>
            </button>

            <!-- Declined -->
            <button
              type="button"
              class="bg-rose-50/60 border border-rose-200/60 rounded-xl p-2.5 flex flex-col justify-between transition-all hover:bg-rose-100/50 text-left cursor-pointer"
              :class="rsvpStatusFilter === 'NOT_GOING' ? 'ring-2 ring-rose-400 bg-rose-100/80 shadow-xs' : ''"
              :title="rsvpStatusFilter === 'NOT_GOING' ? 'Click to show all responses' : 'Filter by Declined'"
              @click="toggleStatusFilter('NOT_GOING')"
            >
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-rose-700 font-sans">Declined</span>
                <UIcon name="i-lucide-x-circle" class="size-3.5 text-rose-500" />
              </div>
              <span class="text-xl sm:text-2xl font-bold font-serif text-rose-800 tracking-tight mt-1">
                {{ notGoingCount }}
              </span>
            </button>
          </div>

          <!-- Secondary Metrics Grid: Invites Sent & Email Credits -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <div class="bg-toast-50/60 border border-bread-200/60 rounded-xl p-2.5 flex flex-col justify-between">
              <span class="text-[11px] font-semibold text-toast-700 font-sans">Invites Sent</span>
              <span class="text-lg sm:text-xl font-bold font-serif text-highlighted tracking-tight mt-1">
                {{ invitationsSentCount }}/{{ totalSentCount }}
              </span>
            </div>

            <div class="bg-toast-50/60 border border-bread-200/60 rounded-xl p-2.5 flex flex-col justify-between">
              <span class="text-[11px] font-semibold text-toast-700 font-sans">Email Credits</span>
              <span class="text-lg sm:text-xl font-bold font-serif text-highlighted tracking-tight mt-1">
                {{ emailCreditsRemaining }}
              </span>
            </div>
          </div>

          <!-- Response Status Chart in Card -->
          <div class="bg-toast-50/80 border-2 border-toast-200/80 rounded-2xl p-4 shadow-xs">
            <PieChart title="Response Status" :data="chartData" :colors="RSVP_CHART_COLORS" />
          </div>

          <!-- Response Rate Progress Card -->
          <div class="bg-toast-50/70 border border-bread-200/60 rounded-xl p-3.5 space-y-2">
            <div class="flex items-center justify-between text-xs font-sans">
              <span class="font-semibold text-toast-800">Response Rate</span>
              <span class="font-bold font-serif text-black text-sm">{{ responseRate }}%</span>
            </div>
            <UProgress :model-value="responseRate" color="teal" size="xs" />
            <div class="flex items-center justify-between text-[11px] text-muted font-sans pt-0.5">
              <span>{{ respondedCount }} of {{ totalSentCount }} responded</span>
              <span v-if="goingCount > 0" class="text-emerald-700 font-semibold">
                {{ goingCount }} attending
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Left Panel Bottom Actions -->
      <div class="pt-4 space-y-2">
        <UButton
          icon="i-lucide-pencil"
          color="teal"
          size="md"
          block
          class="w-full font-semibold shadow-xs justify-center py-2.5 transition-all hover:shadow hover:brightness-105 active:scale-[0.99] cursor-pointer"
          @click="() => { seedDraftQuestions(); isQuestionsModalOpen = true }"
        >
          Edit Questions
        </UButton>
      </div>
    </aside>

    <!-- ================= RIGHT DIVISION (col-span-3): Workspace ================= -->
    <main
      class="col-span-1 lg:col-span-3 w-full h-full lg:h-[calc(100vh-64px)] flex flex-col min-h-0 overflow-hidden bg-toast-50/30"
    >
      <!-- Top Sticky Toolbar -->
      <header
        class="bg-white/95 backdrop-blur border-b border-bread-200/80 px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 z-10 w-full"
      >
        <!-- UTabs spanning the container width -->
        <div class="flex-1 min-w-0 w-full md:w-auto">
          <UTabs
            v-model="activeTab"
            :items="tabItems"
            value-key="value"
            color="teal"
            :content="false"
            class="w-full"
            :ui="{ list: 'w-full' }"
          />
        </div>

        <!-- Search and Filters on Far Right -->
        <div class="flex items-center gap-2.5 shrink-0 justify-end w-full md:w-auto ml-auto">
          <div v-if="activeTab === 'responses'" class="flex items-center">
            <USelect
              v-model="rsvpStatusFilter"
              :items="STATUS_FILTER_OPTIONS"
              value-key="value"
              label-key="label"
              size="sm"
              class="w-36 text-xs font-sans shrink-0"
              @update:model-value="rsvpPage = 1"
            />
          </div>

          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            type="search"
            :placeholder="activeTab === 'questions' ? 'Search questions...' : 'Search responses...'"
            class="w-full sm:w-60 md:w-64"
          />

          <UButton
            v-if="searchQuery || rsvpStatusFilter !== 'ALL'"
            icon="i-lucide-filter-x"
            color="neutral"
            variant="ghost"
            size="sm"
            class="font-sans cursor-pointer text-teal-600 hover:text-teal-700 hover:bg-teal-50 shrink-0"
            @click="clearFilters"
          >
            Clear
          </UButton>
        </div>
      </header>

      <!-- Scrollable Body -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 min-h-0">
        <!-- Loading State -->
        <div v-if="isLoadingEvent" class="flex flex-col items-center justify-center py-20 text-muted">
          <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
          <p class="mt-3 text-sm font-medium">Loading RSVP details...</p>
        </div>

        <!-- TAB 1: QUESTIONS -->
        <template v-else-if="activeTab === 'questions'">
          <div
            v-if="!questions.length"
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-300 bg-white/70 px-6 py-16 text-center shadow-xs"
          >
            <div class="size-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 mb-3">
              <UIcon name="i-lucide-message-square-text" class="size-6" />
            </div>
            <h3 class="text-base font-semibold text-highlighted">No questions yet</h3>
            <p class="mt-1 max-w-sm text-xs text-muted">
              Add questions for guests to answer when they respond to your RSVP invitation.
            </p>
            <UButton
              class="mt-5"
              color="teal"
              icon="i-lucide-pencil"
              size="sm"
              @click="() => { seedDraftQuestions(); isQuestionsModalOpen = true }"
            >
              Edit Questions
            </UButton>
          </div>

          <div
            v-else-if="filteredQuestions.length === 0"
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-300 bg-white/70 px-6 py-14 text-center shadow-xs"
          >
            <UIcon name="i-lucide-search-x" class="size-8 text-muted mb-2" />
            <p class="text-sm font-medium text-highlighted">No questions match your search</p>
            <UButton color="neutral" variant="ghost" size="xs" class="mt-3 cursor-pointer text-teal-600" @click="clearFilters">
              Clear search
            </UButton>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="(question, index) in filteredQuestions"
              :key="`${index}-${question.question}`"
              class="rounded-xl border border-bread-200/80 bg-white p-4 shadow-xs space-y-3"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-start gap-2.5 min-w-0">
                  <span class="font-bold text-toast-500 font-mono text-sm shrink-0">{{ index + 1 }}.</span>
                  <p class="font-semibold text-highlighted text-sm leading-snug">{{ question.question }}</p>
                </div>
                <UBadge :color="questionTypeColor(question.type)" variant="subtle" size="xs" class="shrink-0">
                  {{ questionTypeLabel(question.type) }}
                </UBadge>
              </div>

              <div v-if="question.type === 'OPTIONS' && question.options?.length" class="text-xs text-muted">
                <span class="font-semibold text-toast-700">Options:</span> {{ question.options.join(', ') }}
              </div>

              <div v-if="isChartableQuestionType(question.type)" class="pt-2 border-t border-bread-100">
                <PieChart
                  size="compact"
                  :title="`Answer breakdown (${countQuestionAnswers(question)} responses)`"
                  :data="getQuestionAnswerChartData(question)"
                  :colors="QUESTION_CHART_COLORS"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- TAB 2: RESPONSES -->
        <template v-else-if="activeTab === 'responses'">
          <div
            v-if="!guests.length"
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-300 bg-white/70 px-6 py-16 text-center shadow-xs"
          >
            <div class="size-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 mb-3">
              <UIcon name="i-lucide-inbox" class="size-6" />
            </div>
            <h3 class="text-base font-semibold text-highlighted">No RSVP responses yet</h3>
            <p class="mt-1 max-w-sm text-xs text-muted">
              Responses will appear here after you send invitations and guests reply.
            </p>
          </div>

          <div
            v-else-if="filteredGuests.length === 0"
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-300 bg-white/70 px-6 py-14 text-center shadow-xs"
          >
            <UIcon name="i-lucide-search-x" class="size-8 text-muted mb-2" />
            <p class="text-sm font-medium text-highlighted">No responses match your search or filter</p>
            <UButton color="neutral" variant="ghost" size="xs" class="mt-3 cursor-pointer text-teal-600" @click="clearFilters">
              Clear filters
            </UButton>
          </div>

          <div v-else class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="guest in paginatedGuests"
                :key="guest._id"
                class="rounded-xl border border-bread-200/80 bg-white p-4 shadow-xs space-y-3"
              >
                <div class="flex flex-wrap items-start justify-between gap-2 border-b border-bread-100 pb-2.5">
                  <div>
                    <h4 class="font-bold text-highlighted text-sm">{{ formatGuestName(guestDisplayName(guest)) }}</h4>
                    <p class="text-xs text-muted font-mono">{{ guest.email }}</p>
                  </div>
                  <div class="flex flex-col items-end gap-1">
                    <UBadge
                      :color="guest.rsvpStatus === 'GOING' ? 'success' : guest.rsvpStatus === 'NOT_GOING' ? 'error' : 'warning'"
                      variant="subtle"
                      size="xs"
                    >
                      {{ guest.rsvpStatus === 'GOING' ? 'Attending' : guest.rsvpStatus === 'NOT_GOING' ? 'Not Attending' : 'Pending' }}
                    </UBadge>
                    <span v-if="guest.inviteSentAt" class="text-[10px] text-muted">
                      Invited {{ formatRsvpDate(guest.inviteSentAt) }}
                    </span>
                  </div>
                </div>

                <div v-if="guest.answers && guest.answers.length" class="space-y-2">
                  <div
                    v-for="(answer, aIdx) in guest.answers"
                    :key="`${guest._id}-${aIdx}`"
                    class="rounded-lg bg-bread-50/50 p-2.5 text-xs space-y-0.5 border border-bread-100"
                  >
                    <div class="flex items-center justify-between gap-1">
                      <span class="font-semibold text-highlighted">{{ answer.question }}</span>
                      <UBadge v-if="isRetiredQuestion(answer.question, questions)" color="warning" variant="subtle" size="2xs">
                        Previous question
                      </UBadge>
                    </div>
                    <p class="text-toast-700">{{ formatRsvpAnswerValue(answer.answer) }}</p>
                  </div>
                </div>
                <div v-else class="text-xs text-muted italic">
                  No answers submitted
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div v-if="rsvpTotalPages > 1" class="flex justify-center pt-2">
              <UPagination v-model:page="rsvpPage" :total="rsvpTotal" :items-per-page="PAGE_SIZE" show-edges />
            </div>
          </div>
        </template>
      </div>
    </main>

    <!-- Fullscreen Questions Modal -->
    <UModal
      v-model:open="isQuestionsModalOpen"
      :dismissible="false"
      fullscreen
      :ui="{
        header: 'bg-toast-400 border-none',
        title: 'text-white font-serif text-xl',
        content: 'border-none ring-transparent',
      }"
    >
      <template #header>
        <div class="flex items-center justify-between w-full gap-4">
          <h3 class="text-white font-serif text-xl font-semibold truncate">
            RSVP Questions
          </h3>
          <div class="flex items-center gap-2 shrink-0">
            <UButton
              :icon="questionsMode === 'edit' ? 'i-lucide-eye' : 'i-lucide-pencil'"
              :label="questionsMode === 'edit' ? 'Preview' : 'Back to Edit'"
              size="sm"
              color="toast"
              variant="solid"
              class="bg-toast-800 hover:bg-toast-900 active:bg-toast-950 text-white font-semibold shadow-xs border border-toast-900/30 cursor-pointer"
              :disabled="isSubmittingQuestions"
              @click="() => { questionsMode = questionsMode === 'edit' ? 'preview' : 'edit' }"
            />
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              class="text-white hover:bg-white/15 cursor-pointer"
              :disabled="isSubmittingQuestions"
              @click="() => { isQuestionsModalOpen = false }"
            />
          </div>
        </div>
      </template>

      <template #body>
        <div class="max-w-2xl mx-auto py-6 px-4">
          <!-- EDIT MODE -->
          <div v-if="questionsMode === 'edit'" class="space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-semibold text-highlighted">Questions for Guests</h4>
                <p class="text-xs text-muted">These questions will appear on the RSVP form when guests respond.</p>
              </div>
              <UButton icon="i-lucide-plus" color="teal" size="sm" class="cursor-pointer" @click="addDraftQuestion">
                Add Question
              </UButton>
            </div>

            <div
              v-if="!draftQuestions.length"
              class="rounded-2xl border-2 border-dashed border-toast-300/70 bg-toast-50/50 p-8 text-center space-y-2"
            >
              <div class="size-10 rounded-full bg-toast-100 flex items-center justify-center text-toast-600 mx-auto mb-2">
                <UIcon name="i-lucide-help-circle" class="size-5" />
              </div>
              <p class="text-sm font-semibold text-toast-900">No questions configured</p>
              <p class="text-xs text-toast-600 max-w-sm mx-auto">Click "Add Question" to start building your custom RSVP questionnaire.</p>
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="(draft, index) in draftQuestions"
                :key="draft.id"
                class="rounded-2xl border-2 border-toast-200/90 bg-toast-50/70 p-4 sm:p-5 shadow-xs space-y-3.5 transition-all hover:border-toast-300 hover:shadow-sm"
              >
                <div class="flex items-center justify-between gap-2 pb-2.5 border-b border-toast-200/70">
                  <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-toast-200/80 text-toast-900 border border-toast-300/60 shadow-2xs">
                      Question #{{ index + 1 }}
                    </span>
                  </div>
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    class="cursor-pointer hover:bg-rose-50"
                    title="Delete question"
                    @click="removeDraftQuestion(index)"
                  />
                </div>

                <UFormField label="Question Prompt" required class="font-sans">
                  <UInput
                    v-model="draft.question"
                    placeholder="e.g. Do you have any dietary restrictions?"
                    class="w-full bg-white rounded-lg shadow-2xs"
                  />
                </UFormField>

                <UFormField label="Answer Type" class="font-sans">
                  <USelect
                    v-model="draft.type"
                    :items="QUESTION_TYPES"
                    value-key="value"
                    label-key="label"
                    class="w-full bg-white rounded-lg shadow-2xs"
                    @update:model-value="onQuestionTypeChange(draft)"
                  />
                </UFormField>

                <!-- Options list for Multiple Choice -->
                <div v-if="draft.type === 'OPTIONS'" class="space-y-2.5 pt-2.5 border-t border-toast-200/70">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-toast-900 font-sans">Choices</span>
                    <UButton
                      icon="i-lucide-plus"
                      color="teal"
                      variant="ghost"
                      size="xs"
                      class="cursor-pointer text-teal-700 hover:text-teal-800 hover:bg-teal-50 font-semibold"
                      @click="addOption(index)"
                    >
                      Add Option
                    </UButton>
                  </div>
                  <div
                    v-for="(opt, oIdx) in draft.options"
                    :key="oIdx"
                    class="flex items-center gap-2"
                  >
                    <UInput
                      v-model="draft.options[oIdx]"
                      placeholder="e.g. Vegetarian"
                      class="flex-1 bg-white rounded-lg shadow-2xs"
                      size="sm"
                    />
                    <UButton
                      icon="i-lucide-x"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      class="cursor-pointer hover:bg-toast-200/60"
                      @click="removeOption(index, oIdx)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-bread-200/80">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="isSubmittingQuestions"
                @click="isQuestionsModalOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                color="teal"
                size="sm"
                :loading="isSubmittingQuestions"
                class="cursor-pointer font-semibold"
                @click="handleSaveQuestions"
              >
                Save Questions
              </UButton>
            </div>
          </div>

          <!-- PREVIEW MODE -->
          <div v-else class="space-y-6 max-w-xl mx-auto">
            <div class="bg-toast-50/80 border-2 border-toast-200/90 rounded-2xl p-6 space-y-5 shadow-xs">
              <div class="border-b border-bread-200/70 pb-3">
                <h3 class="font-serif text-lg font-bold text-highlighted">Guest RSVP Questionnaire Preview</h3>
                <p class="text-xs text-muted">This is how your questions will be rendered to your guests.</p>
              </div>

              <div v-if="!draftQuestions.length" class="text-center py-6 text-sm text-muted">
                No questions to preview.
              </div>

              <div v-else class="space-y-4">
                <div v-for="(draft, idx) in draftQuestions" :key="draft.id" class="space-y-1.5">
                  <label class="block text-xs font-semibold text-toast-900">
                    {{ idx + 1 }}. {{ draft.question || '(Untitled Question)' }}
                  </label>
                  <UInput v-if="draft.type === 'TEXT'" placeholder="Guest types their answer here..." class="w-full" disabled />
                  <div v-else-if="draft.type === 'YES/NO'" class="flex items-center gap-4 text-xs font-medium text-toast-700">
                    <label class="flex items-center gap-1.5"><input type="radio" disabled checked /> Yes</label>
                    <label class="flex items-center gap-1.5"><input type="radio" disabled /> No</label>
                  </div>
                  <div v-else-if="draft.type === 'OPTIONS'" class="space-y-1 text-xs font-medium text-toast-700">
                    <label v-for="(opt, oIdx) in draft.options" :key="oIdx" class="flex items-center gap-2">
                      <input type="radio" disabled />
                      <span>{{ opt || `Option ${oIdx + 1}` }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
