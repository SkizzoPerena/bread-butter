<script lang="ts" setup>
import { DateFormatter } from '@internationalized/date'
import type { EventRecord } from '~/types/event'
import { isWeddingEventType } from '~/types/event'
import type {
  ChurchRequirementParty,
  ChurchRequirementRecord,
  PartyTracking,
  RequirementAttachedFile,
  RequirementStatus,
} from '~/types/churchRequirement'
import {
  CHURCH_REQUIREMENT_CATEGORY_ORDER,
  REQUIREMENT_STATUS_OPTIONS,
  formatRequirementStatusLabel,
  fromDateInputValue,
  groupRequirementsByCategoryAndTimeline,
  toDateInputValue,
} from '~/types/churchRequirement'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { EVENT_FEATURE, resolveEventDashboardPath } from '~/utils/eventTierFeatures'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Church Requirements',
  bgClass: 'bg-yellow-50',
})

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { requireEventFeature } = useEventFeatureGate()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { isExporting, exportEventPdf } = useEventPdfExport()
const { finishPageTransition } = usePageTransition()
const {
  isLoading: isLoadingRequirements,
  isSubmitting,
  fetchRequirementsByEvent,
  createRequirement,
  updateRequirementDetails,
  updatePartyRequirement,
  deletePartyFile,
  deleteRequirement,
} = useEventChurchRequirements()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const requirements = ref<ChurchRequirementRecord[]>([])
const isLoadingEvent = ref(false)
const savingPartyKey = ref<string | null>(null)
const isSavingModal = ref(false)

// Tabs and search state (matching Suppliers structure)
type RequirementTab = 'tracked' | 'checklist' | 'all'
const activeTab = ref<RequirementTab>('tracked')
const searchQuery = ref('')

// Modals
const isRequirementModalOpen = ref(false)
const isAddRequirementModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const selectedRequirementForModal = ref<ChurchRequirementRecord | null>(null)
const deletingRequirement = ref<ChurchRequirementRecord | null>(null)

// Timeline common suggestions
const TIMELINE_OPTIONS = [
  '6 Months Before',
  '3-4 Months Before',
  '1-2 Months Before',
  '1 Month Before',
  '2-3 Weeks Before',
  '1 Week Before',
]

// Modal forms
type PartyFormDraft = {
  status: RequirementStatus
  dateAcquired: string
  notes: string
  pendingFile: File | null
  existingFile: RequirementAttachedFile | null
}

type RequirementModalForm = {
  displayName: string
  category: string
  timeline: string
  sourceUrl: string
  description: string
  groom: PartyFormDraft
  bride: PartyFormDraft
}

function createEmptyPartyFormDraft(status: RequirementStatus = 'required'): PartyFormDraft {
  return {
    status,
    dateAcquired: '',
    notes: '',
    pendingFile: null,
    existingFile: null,
  }
}

const requirementModalForm = ref<RequirementModalForm>({
  displayName: '',
  category: 'Church Requirements',
  timeline: '6 Months Before',
  sourceUrl: '',
  description: '',
  groom: createEmptyPartyFormDraft(),
  bride: createEmptyPartyFormDraft(),
})

const addRequirementForm = ref({
  displayName: '',
  category: 'Church Requirements',
  timeline: '6 Months Before',
  sourceUrl: '',
  description: '',
})

const churchRequirementModalUi = {
  header: 'bg-yellow-500 border-none',
  title: 'text-white font-serif text-xl',
  content: 'border-none ring-transparent w-full max-w-xl',
  overlay: 'bg-yellow-950/40',
}

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')
const isWeddingEvent = computed(() =>
  isWeddingEventType(eventRecord.value?.eventType ?? (isUiOnlyMode.value ? 'WEDDING' : ''))
)
const eventTitle = computed(() => eventRecord.value?.eventName ?? '')
const eventDateLabel = computed(() => {
  const dateValue = eventRecord.value?.eventDate
  if (!dateValue) return ''
  try {
    return df.format(new Date(dateValue))
  } catch {
    return ''
  }
})

const mutationsDisabled = computed(
  () =>
    isEventCancelled.value ||
    !isWeddingEvent.value ||
    (!eventId.value && !isUiOnlyMode.value)
)

const isPageLoading = computed(() => isLoadingEvent.value || isLoadingRequirements.value)
const isRequirementListEmpty = computed(() => requirements.value.length === 0)

const statusSelectItems = computed(() =>
  REQUIREMENT_STATUS_OPTIONS.map((status) => ({
    label: formatRequirementStatusLabel(status),
    value: status,
  }))
)

// Helper: Determine if a requirement has been actioned / tracked
function isRequirementTracked(item: ChurchRequirementRecord): boolean {
  const gActive =
    item.groom?.status !== 'required' ||
    Boolean(item.groom?.dateAcquired) ||
    Boolean(item.groom?.notes) ||
    Boolean(item.groom?.attachedFile)
  const bActive =
    item.bride?.status !== 'required' ||
    Boolean(item.bride?.dateAcquired) ||
    Boolean(item.bride?.notes) ||
    Boolean(item.bride?.attachedFile)
  return gActive || bActive
}

// Requirements Overview Progress Calculations
const totalRequirementsCount = computed(() => requirements.value.length)
const totalPartyChecks = computed(() => totalRequirementsCount.value * 2)

const acquiredChecksCount = computed(() => {
  let count = 0
  for (const item of requirements.value) {
    if (['acquired', 'waived', 'not required'].includes(item.groom?.status)) count++
    if (['acquired', 'waived', 'not required'].includes(item.bride?.status)) count++
  }
  return count
})

const pendingChecksCount = computed(() => {
  return Math.max(0, totalPartyChecks.value - acquiredChecksCount.value)
})

const progressPercentage = computed(() => {
  if (totalPartyChecks.value === 0) return 0
  return Math.round((acquiredChecksCount.value / totalPartyChecks.value) * 100)
})

// Tab split lists
const trackedRequirements = computed(() =>
  requirements.value.filter((r) => isRequirementTracked(r))
)

const checklistRequirements = computed(() =>
  requirements.value.filter((r) => !isRequirementTracked(r))
)

const tabItems = computed(() => [
  {
    label: 'Tracked',
    value: 'tracked',
    icon: 'i-lucide-bookmark-check',
    badge: String(trackedRequirements.value.length),
  },
  {
    label: 'To Action',
    value: 'checklist',
    icon: 'i-lucide-list-todo',
    badge: String(checklistRequirements.value.length),
  },
  {
    label: 'All Documents',
    value: 'all',
    icon: 'i-lucide-scroll',
    badge: String(requirements.value.length),
  },
])

// Filter by search query
function filterListBySearch(list: ChurchRequirementRecord[]): ChurchRequirementRecord[] {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((item) => {
    return (
      item.displayName.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.timeline.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      (item.groom?.notes && item.groom.notes.toLowerCase().includes(q)) ||
      (item.bride?.notes && item.bride.notes.toLowerCase().includes(q))
    )
  })
}

const displayedTrackedGrouped = computed(() =>
  groupRequirementsByCategoryAndTimeline(filterListBySearch(trackedRequirements.value))
)

const displayedChecklistGrouped = computed(() =>
  groupRequirementsByCategoryAndTimeline(filterListBySearch(checklistRequirements.value))
)

const displayedAllGrouped = computed(() =>
  groupRequirementsByCategoryAndTimeline(filterListBySearch(requirements.value))
)

// Dynamic Category list for "Add [Category] Requirement" buttons
const categoryList = computed(() => {
  const set = new Set<string>(CHURCH_REQUIREMENT_CATEGORY_ORDER)
  for (const item of requirements.value) {
    if (item.category) set.add(item.category)
  }
  return Array.from(set)
})

// Badge Colors & Icons for statuses (Using valid Nuxt UI colors)
function getStatusBadgeColor(status: RequirementStatus): 'emerald' | 'yellow' | 'rose' | 'neutral' {
  switch (status) {
    case 'acquired':
      return 'emerald'
    case 'requested':
      return 'yellow'
    case 'required':
      return 'rose'
    case 'waived':
    case 'not required':
    default:
      return 'neutral'
  }
}

function getStatusIcon(status: RequirementStatus): string {
  switch (status) {
    case 'acquired':
      return 'i-lucide-check-circle-2'
    case 'requested':
      return 'i-lucide-hourglass'
    case 'required':
      return 'i-lucide-alert-circle'
    case 'waived':
      return 'i-lucide-minus-circle'
    case 'not required':
      return 'i-lucide-circle-slash'
    default:
      return 'i-lucide-help-circle'
  }
}

// Data Loading
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

async function loadChurchRequirementsData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    requirements.value = []
    return
  }

  const targetEventId = eventId.value || 'mock-event-id'

  try {
    const response = await fetchRequirementsByEvent(targetEventId)
    if (response) {
      requirements.value = response.requirements ?? []
    }
  } catch (error) {
    reportApiError(toast, { title: 'Could not load church requirements', error })
  }
}

function replaceRequirementInList(updated: ChurchRequirementRecord) {
  requirements.value = requirements.value.map((item) =>
    item._id === updated._id ? updated : item
  )
  if (selectedRequirementForModal.value?._id === updated._id) {
    selectedRequirementForModal.value = updated
  }
}

// Open unified requirement modal (matching supplier modal)
function openRequirementModal(item: ChurchRequirementRecord) {
  selectedRequirementForModal.value = item
  requirementModalForm.value = {
    displayName: item.displayName,
    category: item.category || 'Church Requirements',
    timeline: item.timeline || '6 Months Before',
    sourceUrl: item.sourceUrl || '',
    description: item.description || '',
    groom: {
      status: item.groom?.status ?? 'required',
      dateAcquired: toDateInputValue(item.groom?.dateAcquired),
      notes: item.groom?.notes ?? '',
      pendingFile: null,
      existingFile: item.groom?.attachedFile ?? null,
    },
    bride: {
      status: item.bride?.status ?? 'required',
      dateAcquired: toDateInputValue(item.bride?.dateAcquired),
      notes: item.bride?.notes ?? '',
      pendingFile: null,
      existingFile: item.bride?.attachedFile ?? null,
    },
  }
  isRequirementModalOpen.value = true
}

function onModalFileSelected(party: ChurchRequirementParty, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  requirementModalForm.value[party].pendingFile = file
  input.value = ''
}

async function handleRemoveModalFile(party: ChurchRequirementParty) {
  if (!selectedRequirementForModal.value || mutationsDisabled.value) return

  const reqId = selectedRequirementForModal.value._id
  try {
    const response = await deletePartyFile(reqId, party)
    if (response?.requirement) {
      replaceRequirementInList(response.requirement)
      requirementModalForm.value[party].existingFile = null
      requirementModalForm.value[party].pendingFile = null
      toast.add({
        title: 'File removed',
        description: `${party === 'groom' ? 'Groom' : 'Bride'} document removed.`,
        color: 'neutral',
      })
    }
  } catch (error) {
    reportApiError(toast, { title: 'Could not remove document', error })
  }
}

async function handleSaveRequirementModal() {
  if (!selectedRequirementForModal.value || mutationsDisabled.value) return
  if (!requirementModalForm.value.displayName.trim()) {
    toast.add({ title: 'Validation Error', description: 'Requirement name is required.', color: 'error' })
    return
  }

  isSavingModal.value = true
  const item = selectedRequirementForModal.value
  const form = requirementModalForm.value

  try {
    // 1. Update basic details
    const detailsResponse = await updateRequirementDetails(item._id, {
      displayName: form.displayName.trim(),
      category: form.category.trim(),
      timeline: form.timeline.trim(),
      sourceUrl: form.sourceUrl.trim(),
      description: form.description.trim(),
    })
    if (detailsResponse?.requirement) {
      replaceRequirementInList(detailsResponse.requirement)
    }

    // 2. Update Groom tracking
    const groomResponse = await updatePartyRequirement(
      item._id,
      'groom',
      {
        status: form.groom.status,
        dateAcquired: fromDateInputValue(form.groom.dateAcquired),
        notes: form.groom.notes,
      },
      form.groom.pendingFile ?? undefined
    )
    if (groomResponse?.requirement) {
      replaceRequirementInList(groomResponse.requirement)
    }

    // 3. Update Bride tracking
    const brideResponse = await updatePartyRequirement(
      item._id,
      'bride',
      {
        status: form.bride.status,
        dateAcquired: fromDateInputValue(form.bride.dateAcquired),
        notes: form.bride.notes,
      },
      form.bride.pendingFile ?? undefined
    )
    if (brideResponse?.requirement) {
      replaceRequirementInList(brideResponse.requirement)
    }

    isRequirementModalOpen.value = false
    toast.add({
      title: 'Requirement Saved',
      description: 'Document details and tracking updated successfully.',
      color: 'success',
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not save requirement', error })
  } finally {
    isSavingModal.value = false
  }
}

// Open modal to add custom requirement
function openAddRequirementModal(defaultCategory: string = 'Church Requirements') {
  addRequirementForm.value = {
    displayName: '',
    category: defaultCategory,
    timeline: '6 Months Before',
    sourceUrl: '',
    description: '',
  }
  isAddRequirementModalOpen.value = true
}

async function handleCreateRequirement() {
  if (mutationsDisabled.value || !addRequirementForm.value.displayName.trim()) {
    toast.add({ title: 'Validation Error', description: 'Please enter a requirement name.', color: 'error' })
    return
  }

  try {
    const response = await createRequirement({
      eventId: eventId.value || 'mock-event-id',
      displayName: addRequirementForm.value.displayName.trim(),
      category: addRequirementForm.value.category.trim() || 'Church Requirements',
      timeline: addRequirementForm.value.timeline.trim() || '6 Months Before',
      sourceUrl: addRequirementForm.value.sourceUrl.trim(),
      description: addRequirementForm.value.description.trim(),
    })
    if (response?.requirement) {
      requirements.value = [...requirements.value, response.requirement]
    }
    isAddRequirementModalOpen.value = false
    toast.add({
      title: 'Requirement Created',
      description: `${addRequirementForm.value.displayName} added to checklist.`,
      color: 'success',
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not create requirement', error })
  }
}

// Delete modal
function openDeleteModal(item: ChurchRequirementRecord) {
  deletingRequirement.value = item
  isDeleteModalOpen.value = true
}

async function confirmDeleteRequirement() {
  if (mutationsDisabled.value || !deletingRequirement.value) return

  const targetId = deletingRequirement.value._id

  try {
    await deleteRequirement(targetId)
    requirements.value = requirements.value.filter((item) => item._id !== targetId)
    isDeleteModalOpen.value = false
    deletingRequirement.value = null
    toast.add({
      title: 'Requirement Deleted',
      description: 'Requirement was removed from the list.',
      color: 'neutral',
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not delete requirement', error })
  }
}

onMounted(async () => {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    navigateTo('/')
    return
  }

  const allowed = await requireEventFeature(EVENT_FEATURE.CHURCH_REQUIREMENTS)
  if (!allowed) {
    return
  }

  try {
    await loadEventData()

    if (!isWeddingEvent.value) {
      toast.add({
        title: 'Not a wedding event',
        description: 'Church requirements are only available for wedding events.',
        color: 'error',
      })
      navigateTo({
        path: resolveEventDashboardPath(eventRecord.value),
        query: eventId.value ? { eventId: eventId.value } : undefined,
      })
      return
    }

    await loadChurchRequirementsData()
  } finally {
    finishPageTransition()
  }
})

watch(eventId, async () => {
  await loadEventData()
  if (isWeddingEvent.value) {
    await loadChurchRequirementsData()
  }
})
</script>

<template>
  <div
    class="church-requirements-page-root w-full min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-4 lg:overflow-hidden bg-bread-50/30"
  >
    <!-- Navbar Teleport Actions (Matching Suppliers layout) -->
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            icon="i-lucide-plus"
            color="yellow"
            :disabled="mutationsDisabled || isSubmitting"
            @click="openAddRequirementModal()"
          >
            Add Requirement
          </UButton>
          <UButton
            icon="i-lucide-file-down"
            color="neutral"
            variant="outline"
            :loading="isExporting"
            :disabled="!eventId || isExporting"
            @click="exportEventPdf(eventId, 'church-requirements')"
          >
            Export PDF
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- ================= LEFT DIVISION (col-span-1): Event Details & Requirements Overview ================= -->
    <aside
      class="col-span-1 lg:col-span-1 w-full bg-white border-b lg:border-b-0 lg:border-r border-bread-200/80 shadow-xs flex flex-col justify-between lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] z-20 overflow-y-auto p-4 sm:p-5 lg:p-6 space-y-6"
    >
      <div class="space-y-6">
        <!-- 1. Event Details -->
        <div class="space-y-2">
          <div>
            <h1
              class="font-serif text-xl sm:text-2xl font-bold text-highlighted leading-tight tracking-tight wrap-break-word"
            >
              {{ eventTitle || "Jane & John's Wedding" }}
            </h1>
          </div>

          <div class="flex items-center gap-3 pt-1 text-xs text-toast-700 font-sans min-w-0">
            <div v-if="eventDateLabel" class="flex items-center gap-1.5 shrink-0">
              <UIcon name="i-lucide-calendar" class="size-3.5 text-toast-500 shrink-0" />
              <span>{{ eventDateLabel }}</span>
            </div>
            <span v-if="eventDateLabel && eventRecord?.venue" class="text-toast-300">•</span>
            <div v-if="eventRecord?.venue" class="flex items-center gap-1.5 min-w-0 truncate">
              <UIcon name="i-lucide-map-pin" class="size-3.5 text-toast-500 shrink-0" />
              <span class="truncate">{{ eventRecord.venue }}</span>
            </div>
          </div>
        </div>

        <!-- 2. Requirements Overview (Matching Suppliers Budget Overview) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between pb-1">
            <h2 class="font-bold font-serif text-sm text-highlighted">
              Requirements Overview
            </h2>
            <span class="text-xs text-muted font-sans font-medium">
              {{ totalRequirementsCount }} items
            </span>
          </div>

          <!-- Metric Cards -->
          <div class="space-y-2.5">
            <!-- Total Requirements Card -->
            <div
              class="bg-yellow-50/70 border border-yellow-200/70 rounded-xl p-3 flex items-center justify-between"
            >
              <div>
                <span class="text-[11px] font-semibold text-yellow-800 font-sans block">Total Documents</span>
                <span class="text-xl sm:text-2xl font-bold font-serif text-yellow-950 tracking-tight mt-0.5 block">
                  {{ totalRequirementsCount }}
                </span>
              </div>
              <div class="size-9 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-700 shrink-0">
                <UIcon name="i-lucide-scroll" class="size-5" />
              </div>
            </div>

            <!-- Acquired & Pending (2 columns, matching Paid & Remaining in Suppliers) -->
            <div class="grid grid-cols-2 gap-2">
              <!-- Acquired Checks -->
              <div
                class="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3 flex flex-col justify-between"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-semibold text-emerald-700 font-sans">Acquired</span>
                  <UIcon name="i-lucide-check-circle-2" class="size-4 text-emerald-600" />
                </div>
                <span class="text-lg sm:text-xl font-bold font-serif text-emerald-950 tracking-tight mt-1">
                  {{ acquiredChecksCount }}
                </span>
              </div>

              <!-- Pending Checks -->
              <div
                class="bg-yellow-50/70 border border-yellow-200/70 rounded-xl p-3 flex flex-col justify-between"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-semibold text-yellow-800 font-sans">Pending</span>
                  <UIcon name="i-lucide-hourglass" class="size-4 text-yellow-600" />
                </div>
                <span class="text-lg sm:text-xl font-bold font-serif text-yellow-950 tracking-tight mt-1">
                  {{ pendingChecksCount }}
                </span>
              </div>
            </div>
          </div>

          <!-- Progress Card (Matching Suppliers Payment Progress) -->
          <div class="bg-toast-50/70 border border-bread-200/60 rounded-xl p-3.5 space-y-2">
            <div class="flex items-center justify-between text-xs font-sans">
              <span class="font-semibold text-toast-800">Acquisition Progress</span>
              <span class="font-bold font-serif text-black text-sm">{{ progressPercentage }}%</span>
            </div>
            <UProgress :model-value="progressPercentage" color="yellow" size="xs" />
            <div class="flex items-center justify-between text-[11px] text-muted font-sans pt-0.5">
              <span>{{ acquiredChecksCount }} of {{ totalPartyChecks }} checks ready</span>
              <span v-if="pendingChecksCount > 0" class="text-yellow-800 font-medium">
                {{ pendingChecksCount }} checks pending
              </span>
              <span v-else class="text-emerald-700 font-medium">All documents ready!</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Left Panel Bottom Links (Matching Suppliers) -->
      <div class="space-y-2 pt-4">
        <UButton
          icon="i-lucide-file-down"
          color="neutral"
          variant="outline"
          size="sm"
          block
          class="w-full justify-center"
          :loading="isExporting"
          :disabled="!eventId || isExporting"
          @click="exportEventPdf(eventId, 'church-requirements')"
        >
          Export PDF
        </UButton>
        <UButton
          icon="i-lucide-plus"
          color="yellow"
          size="md"
          block
          class="w-full font-semibold shadow-xs justify-center py-2.5 transition-all hover:shadow hover:brightness-105 active:scale-[0.99] cursor-pointer"
          :disabled="mutationsDisabled || isSubmitting"
          @click="openAddRequirementModal()"
        >
          Add Custom Requirement
        </UButton>
      </div>
    </aside>

    <!-- ================= RIGHT DIVISION (col-span-3): Scrollable Requirements View ================= -->
    <main
      class="col-span-1 lg:col-span-3 w-full h-full lg:h-[calc(100vh-64px)] flex flex-col min-h-0 overflow-hidden bg-toast-50/30"
    >
      <!-- Top Sticky Toolbar with UTabs and Search -->
      <header
        class="bg-white/95 backdrop-blur border-b border-bread-200/80 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10"
      >
        <div class="flex items-center gap-3">
          <UTabs
            v-model="activeTab"
            :items="tabItems"
            value-key="value"
            color="yellow"
            :content="false"
          />
        </div>

        <div class="flex items-center gap-3">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            type="search"
            placeholder="Search requirements..."
            class="w-full sm:w-64"
          />
        </div>
      </header>

      <!-- Scrollable Main Content -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <!-- Loading State -->
        <div
          v-if="isPageLoading"
          class="flex items-center justify-center py-16 text-muted"
        >
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-yellow-600" />
          <span class="ml-2 text-sm font-medium">Loading church requirements...</span>
        </div>

        <div v-else class="space-y-6">
          <UAlert
            v-if="isEventCancelled"
            color="warning"
            variant="subtle"
            title="Event cancelled"
            description="Church requirement updates are disabled for a cancelled event."
          />

          <!-- Global empty state if no requirements exist at all -->
          <div
            v-if="isRequirementListEmpty"
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-200 bg-white/70 px-6 py-14 text-center"
          >
            <div class="size-12 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center mb-3">
              <UIcon name="i-lucide-scroll" class="size-6" />
            </div>
            <p class="text-base font-semibold text-highlighted">No church requirements found</p>
            <p class="mt-1 max-w-sm text-sm text-muted">
              Add your own custom requirements or create a wedding event to load default parish checklist items.
            </p>
            <UButton
              v-if="!mutationsDisabled"
              class="mt-5"
              icon="i-lucide-plus"
              color="yellow"
              :disabled="isSubmitting"
              @click="openAddRequirementModal()"
            >
              Add Requirement
            </UButton>
          </div>

          <!-- ================= TAB 1: TRACKED REQUIREMENTS ================= -->
          <div v-else-if="activeTab === 'tracked'" class="space-y-8">
            <!-- Empty state for Tracked tab -->
            <div
              v-if="trackedRequirements.length === 0"
              class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-200 bg-white/70 px-6 py-14 text-center"
            >
              <div class="size-12 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center mb-3">
                <UIcon name="i-lucide-bookmark" class="size-6" />
              </div>
              <p class="text-base font-semibold text-highlighted">No tracked requirements yet</p>
              <p class="mt-1 max-w-sm text-sm text-muted">
                You haven't actioned any requirements yet. Switch to the "To Action" tab to update status, dates, or documents.
              </p>
              <div class="mt-5 flex flex-wrap items-center justify-center gap-3">
                <UButton
                  color="yellow"
                  variant="subtle"
                  icon="i-lucide-list-todo"
                  @click="activeTab = 'checklist'"
                >
                  Browse To Action Checklist
                </UButton>
                <UButton
                  v-if="!mutationsDisabled"
                  color="yellow"
                  icon="i-lucide-plus"
                  :disabled="isSubmitting"
                  @click="openAddRequirementModal()"
                >
                  Add Custom Requirement
                </UButton>
              </div>
            </div>

            <!-- Grouped Tracked Requirements in 3-column grid -->
            <template v-else>
              <section
                v-for="section in displayedTrackedGrouped"
                :key="section.category"
                class="space-y-4"
              >
                <!-- Category Header -->
                <div class="flex items-center justify-between pb-1 border-b border-bread-200/70">
                  <div class="flex items-center gap-2.5">
                    <h2 class="text-xl font-bold font-serif text-highlighted">
                      {{ section.category }}
                    </h2>
                    <UBadge color="yellow" variant="subtle" size="xs">
                      {{ section.timelines.reduce((acc, t) => acc + t.items.length, 0) }} tracked
                    </UBadge>
                  </div>
                </div>

                <!-- 3-Column Responsive Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <template v-for="timeline in section.timelines" :key="timeline.timeline">
                    <template v-for="item in timeline.items" :key="item._id">
                      <div
                        class="group p-4 rounded-xl border border-bread-200/90 bg-white hover:border-yellow-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3 text-left"
                      >
                        <div>
                          <!-- Top: Title & Edit Button -->
                          <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0 flex-1">
                              <h3
                                class="text-base sm:text-lg font-bold font-serif text-highlighted group-hover:text-yellow-700 transition-colors truncate"
                                :title="item.displayName"
                              >
                                {{ item.displayName }}
                              </h3>
                              <p
                                class="text-xs text-yellow-700 font-medium mt-0.5 truncate flex items-center gap-1.5"
                                :title="item.category"
                              >
                                <UIcon name="i-lucide-folder" class="size-3.5 shrink-0 text-yellow-500" />
                                <span class="truncate">{{ item.category }}</span>
                                <span v-if="item.timeline" class="text-toast-300">•</span>
                                <span v-if="item.timeline" class="text-toast-500">{{ item.timeline }}</span>
                              </p>
                            </div>

                            <!-- Edit button in top right -->
                            <div class="flex items-center gap-1 shrink-0">
                              <UButton
                                icon="i-lucide-pencil"
                                color="yellow"
                                variant="soft"
                                size="xs"
                                aria-label="Edit requirement"
                                @click="openRequirementModal(item)"
                              />
                            </div>
                          </div>

                          <!-- Description & Source link -->
                          <div v-if="item.description || item.sourceUrl" class="mt-2 text-xs text-muted">
                            <p v-if="item.description" class="line-clamp-2 leading-relaxed" :title="item.description">
                              {{ item.description }}
                            </p>
                            <a
                              v-if="item.sourceUrl"
                              :href="item.sourceUrl"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-1"
                            >
                              <UIcon name="i-lucide-external-link" class="size-3" />
                              Source link
                            </a>
                          </div>

                          <!-- Groom & Bride Tracking Cards -->
                          <div class="mt-3 pt-3 border-t border-bread-100 grid grid-cols-2 gap-2 text-xs">
                            <!-- Groom Box -->
                            <div class="bg-bread-50/70 rounded-lg p-2.5 border border-bread-100/70 space-y-1.5">
                              <div class="flex items-center justify-between">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-toast-600 flex items-center gap-1">
                                  <UIcon name="i-lucide-user" class="size-3 text-toast-500" />
                                  Groom
                                </span>
                                <UBadge
                                  :color="getStatusBadgeColor(item.groom?.status ?? 'required')"
                                  variant="subtle"
                                  size="xs"
                                  class="text-[10px] capitalize"
                                >
                                  {{ formatRequirementStatusLabel(item.groom?.status ?? 'required') }}
                                </UBadge>
                              </div>
                              <div v-if="item.groom?.dateAcquired" class="text-[10px] text-muted flex items-center gap-1">
                                <UIcon name="i-lucide-calendar" class="size-3" />
                                {{ toDateInputValue(item.groom.dateAcquired) }}
                              </div>
                              <div v-if="item.groom?.attachedFile" class="pt-0.5">
                                <a
                                  :href="item.groom.attachedFile.fileURL"
                                  target="_blank"
                                  class="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline truncate max-w-full font-medium"
                                  :title="item.groom.attachedFile.fileName"
                                >
                                  <UIcon name="i-lucide-paperclip" class="size-3 shrink-0" />
                                  <span class="truncate">{{ item.groom.attachedFile.fileName }}</span>
                                </a>
                              </div>
                            </div>

                            <!-- Bride Box -->
                            <div class="bg-bread-50/70 rounded-lg p-2.5 border border-bread-100/70 space-y-1.5">
                              <div class="flex items-center justify-between">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-toast-600 flex items-center gap-1">
                                  <UIcon name="i-lucide-user-check" class="size-3 text-toast-500" />
                                  Bride
                                </span>
                                <UBadge
                                  :color="getStatusBadgeColor(item.bride?.status ?? 'required')"
                                  variant="subtle"
                                  size="xs"
                                  class="text-[10px] capitalize"
                                >
                                  {{ formatRequirementStatusLabel(item.bride?.status ?? 'required') }}
                                </UBadge>
                              </div>
                              <div v-if="item.bride?.dateAcquired" class="text-[10px] text-muted flex items-center gap-1">
                                <UIcon name="i-lucide-calendar" class="size-3" />
                                {{ toDateInputValue(item.bride.dateAcquired) }}
                              </div>
                              <div v-if="item.bride?.attachedFile" class="pt-0.5">
                                <a
                                  :href="item.bride.attachedFile.fileURL"
                                  target="_blank"
                                  class="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline truncate max-w-full font-medium"
                                  :title="item.bride.attachedFile.fileName"
                                >
                                  <UIcon name="i-lucide-paperclip" class="size-3 shrink-0" />
                                  <span class="truncate">{{ item.bride.attachedFile.fileName }}</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Card Bottom: Manage Details -->
                        <div class="pt-2 border-t border-bread-100 flex items-center justify-end">
                          <UButton
                            size="xs"
                            color="yellow"
                            variant="ghost"
                            icon="i-lucide-sliders-horizontal"
                            @click="openRequirementModal(item)"
                          >
                            Update Tracking
                          </UButton>
                        </div>
                      </div>
                    </template>
                  </template>
                </div>
              </section>
            </template>
          </div>

          <!-- ================= TAB 2: TO ACTION / CHECKLIST ================= -->
          <div v-else-if="activeTab === 'checklist'" class="space-y-8">
            <!-- Empty state for Checklist tab -->
            <div
              v-if="checklistRequirements.length === 0"
              class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-200 bg-white/70 px-6 py-14 text-center"
            >
              <div class="size-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <UIcon name="i-lucide-check-circle-2" class="size-6" />
              </div>
              <p class="text-base font-semibold text-highlighted">All checklist documents actioned!</p>
              <p class="mt-1 max-w-sm text-sm text-muted">
                Wonderful! Every church requirement is now being actively tracked. You can add custom requirements anytime.
              </p>
              <div class="mt-5 flex flex-wrap items-center justify-center gap-3">
                <UButton
                  color="yellow"
                  variant="subtle"
                  icon="i-lucide-bookmark-check"
                  @click="activeTab = 'tracked'"
                >
                  View Tracked Documents
                </UButton>
                <UButton
                  v-if="!mutationsDisabled"
                  color="yellow"
                  icon="i-lucide-plus"
                  :disabled="isSubmitting"
                  @click="openAddRequirementModal()"
                >
                  Add Custom Requirement
                </UButton>
              </div>
            </div>

            <!-- Categories with "Add [[Category]] Requirement" button (matching Suppliers "Add [[supplier type]]") -->
            <template v-else>
              <section
                v-for="section in displayedChecklistGrouped"
                :key="section.category"
                class="space-y-4"
              >
                <!-- Category Header with Clean "Add [[category]] Requirement" Button -->
                <div class="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-bread-200/70">
                  <div class="flex items-center gap-2.5">
                    <h2 class="text-xl font-bold font-serif text-highlighted">
                      {{ section.category }}
                    </h2>
                    <UBadge color="neutral" variant="subtle" size="xs">
                      {{ section.timelines.reduce((acc, t) => acc + t.items.length, 0) }} to action
                    </UBadge>
                  </div>

                  <UButton
                    icon="i-lucide-plus"
                    color="yellow"
                    variant="subtle"
                    size="sm"
                    :disabled="mutationsDisabled || isSubmitting"
                    @click="openAddRequirementModal(section.category)"
                  >
                    Add {{ section.category }} Item
                  </UButton>
                </div>

                <!-- 3-Column Grid of Clean Checklist Items (matching Suppliers No Assignment items) -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <template v-for="timeline in section.timelines" :key="timeline.timeline">
                    <template v-for="item in timeline.items" :key="item._id">
                      <div
                        class="group p-4 rounded-xl border border-bread-200/90 bg-white hover:border-yellow-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3 text-left"
                      >
                        <div class="space-y-1">
                          <h3
                            class="text-sm font-semibold text-highlighted group-hover:text-yellow-700 transition-colors truncate"
                            :title="item.displayName"
                          >
                            {{ item.displayName }}
                          </h3>
                          <div class="flex items-center gap-2 text-xs text-muted">
                            <span>{{ item.category }}</span>
                            <span v-if="item.timeline">•</span>
                            <span v-if="item.timeline">{{ item.timeline }}</span>
                          </div>
                          <p v-if="item.description" class="text-xs text-toast-500 line-clamp-2 mt-1">
                            {{ item.description }}
                          </p>
                        </div>

                        <div class="flex items-center justify-between pt-2 border-t border-bread-100">
                          <span class="text-[11px] text-muted font-sans">Not yet tracked</span>
                          <UButton
                            size="xs"
                            color="yellow"
                            variant="soft"
                            icon="i-lucide-plus"
                            @click="openRequirementModal(item)"
                          >
                            Add Details
                          </UButton>
                        </div>
                      </div>
                    </template>
                  </template>
                </div>
              </section>
            </template>
          </div>

          <!-- ================= TAB 3: ALL DOCUMENTS ================= -->
          <div v-else class="space-y-8">
            <section
              v-for="section in displayedAllGrouped"
              :key="section.category"
              class="space-y-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-bread-200/70">
                <div class="flex items-center gap-2.5">
                  <h2 class="text-xl font-bold font-serif text-highlighted">
                    {{ section.category }}
                  </h2>
                  <UBadge color="yellow" variant="subtle" size="xs">
                    {{ section.timelines.reduce((acc, t) => acc + t.items.length, 0) }} total
                  </UBadge>
                </div>
                <UButton
                  icon="i-lucide-plus"
                  color="yellow"
                  variant="subtle"
                  size="sm"
                  :disabled="mutationsDisabled || isSubmitting"
                  @click="openAddRequirementModal(section.category)"
                >
                  Add {{ section.category }} Item
                </UButton>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <template v-for="timeline in section.timelines" :key="timeline.timeline">
                  <template v-for="item in timeline.items" :key="item._id">
                    <div
                      class="group p-4 rounded-xl border border-bread-200/90 bg-white hover:border-yellow-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3 text-left"
                    >
                      <div>
                        <div class="flex items-start justify-between gap-2">
                          <div class="min-w-0 flex-1">
                            <h3
                              class="text-base sm:text-lg font-bold font-serif text-highlighted group-hover:text-yellow-700 transition-colors truncate"
                              :title="item.displayName"
                            >
                              {{ item.displayName }}
                            </h3>
                            <p class="text-xs text-yellow-700 font-medium mt-0.5 truncate flex items-center gap-1.5">
                              <UIcon name="i-lucide-folder" class="size-3.5 shrink-0 text-yellow-500" />
                              <span class="truncate">{{ item.category }}</span>
                              <span v-if="item.timeline" class="text-toast-300">•</span>
                              <span v-if="item.timeline" class="text-toast-500">{{ item.timeline }}</span>
                            </p>
                          </div>
                          <div class="flex items-center gap-1 shrink-0">
                            <UButton
                              icon="i-lucide-pencil"
                              color="yellow"
                              variant="soft"
                              size="xs"
                              aria-label="Edit requirement"
                              @click="openRequirementModal(item)"
                            />
                          </div>
                        </div>

                        <div v-if="item.description" class="mt-2 text-xs text-muted line-clamp-2">
                          {{ item.description }}
                        </div>

                        <div class="mt-3 pt-3 border-t border-bread-100 grid grid-cols-2 gap-2 text-xs">
                          <div class="bg-bread-50/70 rounded-lg p-2.5 border border-bread-100/70 space-y-1">
                            <div class="flex items-center justify-between">
                              <span class="text-[10px] font-bold uppercase tracking-wider text-toast-600">Groom</span>
                              <UBadge
                                :color="getStatusBadgeColor(item.groom?.status ?? 'required')"
                                variant="subtle"
                                size="xs"
                                class="text-[10px] capitalize"
                              >
                                {{ formatRequirementStatusLabel(item.groom?.status ?? 'required') }}
                              </UBadge>
                            </div>
                            <div v-if="item.groom?.attachedFile" class="text-[10px] text-blue-600 truncate font-medium">
                              <UIcon name="i-lucide-paperclip" class="size-3 inline" />
                              {{ item.groom.attachedFile.fileName }}
                            </div>
                          </div>

                          <div class="bg-bread-50/70 rounded-lg p-2.5 border border-bread-100/70 space-y-1">
                            <div class="flex items-center justify-between">
                              <span class="text-[10px] font-bold uppercase tracking-wider text-toast-600">Bride</span>
                              <UBadge
                                :color="getStatusBadgeColor(item.bride?.status ?? 'required')"
                                variant="subtle"
                                size="xs"
                                class="text-[10px] capitalize"
                              >
                                {{ formatRequirementStatusLabel(item.bride?.status ?? 'required') }}
                              </UBadge>
                            </div>
                            <div v-if="item.bride?.attachedFile" class="text-[10px] text-blue-600 truncate font-medium">
                              <UIcon name="i-lucide-paperclip" class="size-3 inline" />
                              {{ item.bride.attachedFile.fileName }}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div class="pt-2 border-t border-bread-100 flex items-center justify-end">
                        <UButton
                          size="xs"
                          color="yellow"
                          variant="ghost"
                          icon="i-lucide-sliders-horizontal"
                          @click="openRequirementModal(item)"
                        >
                          Manage Tracking
                        </UButton>
                      </div>
                    </div>
                  </template>
                </template>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>

    <!-- Unified Requirement Details & Edit Modal (Matching Suppliers Modal) -->
    <UModal
      v-model:open="isRequirementModalOpen"
      :title="`Manage ${selectedRequirementForModal?.displayName || 'Requirement'}`"
      :ui="churchRequirementModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSavingModal"
    >
      <template #body>
        <div v-if="selectedRequirementForModal" class="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          <!-- Section 1: Requirement Information -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-toast-800 pb-1 border-b border-toast-200">
              General Document Info
            </h4>

            <UFormField label="Requirement Name" required>
              <UInput
                v-model="requirementModalForm.displayName"
                class="w-full"
                placeholder="e.g. Birth Certificate (PSA)"
                :disabled="mutationsDisabled || isSavingModal"
              />
            </UFormField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UFormField label="Category">
                <UInput
                  v-model="requirementModalForm.category"
                  class="w-full"
                  placeholder="e.g. Church Requirements"
                  :disabled="mutationsDisabled || isSavingModal"
                />
              </UFormField>

              <UFormField label="Timeline">
                <USelect
                  v-model="requirementModalForm.timeline"
                  :items="TIMELINE_OPTIONS"
                  class="w-full"
                  :disabled="mutationsDisabled || isSavingModal"
                />
              </UFormField>
            </div>

            <UFormField label="Source URL / Helpful Link">
              <UInput
                v-model="requirementModalForm.sourceUrl"
                class="w-full"
                placeholder="https://psahelpline.ph"
                :disabled="mutationsDisabled || isSavingModal"
              />
            </UFormField>

            <UFormField label="Description / Guidelines">
              <UTextarea
                v-model="requirementModalForm.description"
                :rows="2"
                class="w-full"
                placeholder="Details, parish guidelines, or requirements notes..."
                :disabled="mutationsDisabled || isSavingModal"
              />
            </UFormField>
          </div>

          <!-- Section 2: Groom's Tracking -->
          <div class="space-y-3 p-3.5 rounded-xl border border-bread-200/80 bg-bread-50/50">
            <div class="flex items-center justify-between pb-1 border-b border-bread-200">
              <span class="text-xs font-bold text-toast-900 flex items-center gap-1.5">
                <UIcon name="i-lucide-user" class="size-3.5 text-yellow-600" />
                Groom's Documents &amp; Status
              </span>
              <UBadge :color="getStatusBadgeColor(requirementModalForm.groom.status)" variant="subtle" size="xs">
                {{ formatRequirementStatusLabel(requirementModalForm.groom.status) }}
              </UBadge>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UFormField label="Status">
                <USelect
                  v-model="requirementModalForm.groom.status"
                  :items="statusSelectItems"
                  class="w-full"
                  :disabled="mutationsDisabled || isSavingModal"
                />
              </UFormField>

              <UFormField label="Date Acquired">
                <UInput
                  v-model="requirementModalForm.groom.dateAcquired"
                  type="date"
                  class="w-full"
                  :disabled="mutationsDisabled || isSavingModal"
                />
              </UFormField>
            </div>

            <UFormField label="Groom Notes">
              <UInput
                v-model="requirementModalForm.groom.notes"
                placeholder="e.g. Requested online, reference #12345"
                class="w-full"
                :disabled="mutationsDisabled || isSavingModal"
              />
            </UFormField>

            <!-- Groom File Upload / View -->
            <UFormField label="Document Attachment">
              <div class="space-y-2 text-xs">
                <div v-if="requirementModalForm.groom.existingFile && !requirementModalForm.groom.pendingFile" class="flex items-center justify-between p-2 rounded-lg bg-white border border-bread-200">
                  <a
                    :href="requirementModalForm.groom.existingFile.fileURL"
                    target="_blank"
                    class="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-medium truncate max-w-64"
                  >
                    <UIcon name="i-lucide-file-text" class="size-4 shrink-0" />
                    <span class="truncate">{{ requirementModalForm.groom.existingFile.fileName }}</span>
                  </a>
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    title="Remove file"
                    :disabled="isSavingModal"
                    @click="handleRemoveModalFile('groom')"
                  />
                </div>

                <div v-if="requirementModalForm.groom.pendingFile" class="text-xs text-yellow-700 font-medium flex items-center gap-1">
                  <UIcon name="i-lucide-upload" class="size-3.5" />
                  <span>Ready to upload: {{ requirementModalForm.groom.pendingFile.name }}</span>
                </div>

                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  class="block w-full file:mr-3 file:rounded-md file:border-0 file:bg-yellow-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-yellow-900 cursor-pointer"
                  :disabled="mutationsDisabled || isSavingModal"
                  @change="onModalFileSelected('groom', $event)"
                />
              </div>
            </UFormField>
          </div>

          <!-- Section 3: Bride's Tracking -->
          <div class="space-y-3 p-3.5 rounded-xl border border-bread-200/80 bg-bread-50/50">
            <div class="flex items-center justify-between pb-1 border-b border-bread-200">
              <span class="text-xs font-bold text-toast-900 flex items-center gap-1.5">
                <UIcon name="i-lucide-user-check" class="size-3.5 text-yellow-600" />
                Bride's Documents &amp; Status
              </span>
              <UBadge :color="getStatusBadgeColor(requirementModalForm.bride.status)" variant="subtle" size="xs">
                {{ formatRequirementStatusLabel(requirementModalForm.bride.status) }}
              </UBadge>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UFormField label="Status">
                <USelect
                  v-model="requirementModalForm.bride.status"
                  :items="statusSelectItems"
                  class="w-full"
                  :disabled="mutationsDisabled || isSavingModal"
                />
              </UFormField>

              <UFormField label="Date Acquired">
                <UInput
                  v-model="requirementModalForm.bride.dateAcquired"
                  type="date"
                  class="w-full"
                  :disabled="mutationsDisabled || isSavingModal"
                />
              </UFormField>
            </div>

            <UFormField label="Bride Notes">
              <UInput
                v-model="requirementModalForm.bride.notes"
                placeholder="e.g. Certified true copy picked up from parish office"
                class="w-full"
                :disabled="mutationsDisabled || isSavingModal"
              />
            </UFormField>

            <!-- Bride File Upload / View -->
            <UFormField label="Document Attachment">
              <div class="space-y-2 text-xs">
                <div v-if="requirementModalForm.bride.existingFile && !requirementModalForm.bride.pendingFile" class="flex items-center justify-between p-2 rounded-lg bg-white border border-bread-200">
                  <a
                    :href="requirementModalForm.bride.existingFile.fileURL"
                    target="_blank"
                    class="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-medium truncate max-w-64"
                  >
                    <UIcon name="i-lucide-file-text" class="size-4 shrink-0" />
                    <span class="truncate">{{ requirementModalForm.bride.existingFile.fileName }}</span>
                  </a>
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    title="Remove file"
                    :disabled="isSavingModal"
                    @click="handleRemoveModalFile('bride')"
                  />
                </div>

                <div v-if="requirementModalForm.bride.pendingFile" class="text-xs text-yellow-700 font-medium flex items-center gap-1">
                  <UIcon name="i-lucide-upload" class="size-3.5" />
                  <span>Ready to upload: {{ requirementModalForm.bride.pendingFile.name }}</span>
                </div>

                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  class="block w-full file:mr-3 file:rounded-md file:border-0 file:bg-yellow-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-yellow-900 cursor-pointer"
                  :disabled="mutationsDisabled || isSavingModal"
                  @change="onModalFileSelected('bride', $event)"
                />
              </div>
            </UFormField>
          </div>

          <!-- Modal Footer Actions (Matching Suppliers Modal) -->
          <div class="mt-6 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-bread-100">
            <div>
              <UButton
                label="Delete Requirement"
                color="error"
                variant="ghost"
                size="sm"
                icon="i-lucide-trash-2"
                :disabled="mutationsDisabled || isSavingModal"
                @click="() => { const r = selectedRequirementForModal; isRequirementModalOpen = false; if (r) openDeleteModal(r); }"
              />
            </div>
            <div class="flex items-center gap-2 ml-auto">
              <UButton
                label="Cancel"
                color="neutral"
                variant="outline"
                :disabled="isSavingModal"
                @click="isRequirementModalOpen = false"
              />
              <UButton
                label="Save Changes"
                color="yellow"
                :loading="isSavingModal"
                :disabled="mutationsDisabled || isSavingModal"
                @click="handleSaveRequirementModal"
              />
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Add Custom Requirement Modal (Matching Add Supplier Modal) -->
    <UModal
      v-model:open="isAddRequirementModalOpen"
      title="Add Custom Church Requirement"
      :ui="churchRequirementModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSubmitting"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="Category" required>
            <USelect
              v-model="addRequirementForm.category"
              :items="categoryList"
              class="w-full"
              :disabled="isSubmitting"
            />
          </UFormField>

          <UFormField label="Requirement Name" required>
            <UInput
              v-model="addRequirementForm.displayName"
              placeholder="e.g. Parish Confirmation Clearance"
              class="w-full"
              :disabled="isSubmitting"
            />
          </UFormField>

          <UFormField label="Timeline">
            <USelect
              v-model="addRequirementForm.timeline"
              :items="TIMELINE_OPTIONS"
              class="w-full"
              :disabled="isSubmitting"
            />
          </UFormField>

          <UFormField label="Source URL / Reference Link">
            <UInput
              v-model="addRequirementForm.sourceUrl"
              placeholder="https://..."
              class="w-full"
              :disabled="isSubmitting"
            />
          </UFormField>

          <UFormField label="Description">
            <UTextarea
              v-model="addRequirementForm.description"
              :rows="3"
              placeholder="Guidelines or requirements notes..."
              class="w-full"
              :disabled="isSubmitting"
            />
          </UFormField>

          <div class="mt-6 flex items-center justify-end gap-2 pt-2 border-t border-bread-100">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isSubmitting"
              @click="isAddRequirementModalOpen = false"
            />
            <UButton
              label="Create Requirement"
              color="yellow"
              :loading="isSubmitting"
              :disabled="!addRequirementForm.displayName.trim() || isSubmitting"
              @click="handleCreateRequirement"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal (Matching Suppliers Delete Modal) -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Delete Requirement"
      :ui="churchRequirementModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSubmitting"
    >
      <template #body>
        <p class="mb-4 text-sm text-muted">
          Are you sure you want to delete
          <span class="font-bold text-highlighted">{{ deletingRequirement?.displayName }}</span>?
          This cannot be undone.
        </p>
        <div class="flex justify-end gap-2 pt-2 border-t border-bread-100">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="isSubmitting"
            @click="isDeleteModalOpen = false"
          />
          <UButton
            label="Delete"
            color="error"
            :loading="isSubmitting"
            @click="confirmDeleteRequirement"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
