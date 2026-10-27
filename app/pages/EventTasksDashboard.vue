<script lang="ts" setup>
import { DateFormatter } from '@internationalized/date'
import type { EventRecord, TasksSummary } from '~/types/event'
import type { TaskRecord, TaskStatus } from '~/types/task'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { useEventTasksManager } from '~/composables/useEventTasksManager'
import { EVENT_FEATURE } from '~/utils/eventTierFeatures'
import { groupTasksByDeadlineMonth } from '~/utils/taskDeadlineGroups'
import { isParentTask } from '~/utils/taskListUpdates'
import { mapTaskPriority, PRIORITY_FILTER_OPTIONS } from '~/utils/taskPriority'
import type { PriorityFilterValue } from '~/utils/taskPriority'
import {
  calendarDateFromDateValue,
  calendarDateToUtcIso,
  parseIsoToCalendarDate,
} from '~/utils/taskFormat'

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
const { fetchEvent, updateCachedTasksSummary } = useEvents()
const { requireEventFeature } = useEventFeatureGate()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { finishPageTransition } = usePageTransition()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const tasksSummary = ref<TasksSummary | null>(null)
const isLoadingEvent = ref(false)

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')
const eventTitle = computed(() => eventRecord.value?.eventName ?? '')

const eventDateLabel = computed(() => {
  const dateValue = eventRecord.value?.eventDate
  return dateValue ? df.format(new Date(dateValue)) : ''
})

// Use the robust tasks manager composable
const {
  tasks,
  assignees,
  assigneeSelectItems,
  isLoading,
  updatingTaskId,
  searchQuery,
  priorityFilter,
  sortBy,
  isFormOpen,
  editingTask,
  isDetailsOpen,
  selectedTask,
  isRemoveModalOpen,
  taskForRemove,
  isRemoveSubmitting,
  isManageAssigneesOpen,
  mutationsDisabled,
  filteredTasks,
  openCreateModal,
  openDetailsModal,
  openEditModal,
  openManageAssigneesModal,
  openRemoveModal,
  closeRemoveModal,
  handleStatusChange,
  handlePriorityChange,
  handleDeadlineChange,
  handleFormSaved,
  handleAssigneesChanged,
  confirmRemoveTask,
} = useEventTasksManager({
  eventId,
  isEventCancelled,
  tasksSummary,
  onSummarySync: (value) => {
    tasksSummary.value = value
    if (eventId.value) {
      updateCachedTasksSummary(eventId.value, value)
    }
  },
})

// Status filtering tab
type StatusFilterTab = 'ALL' | 'TODO' | 'ONGOING' | 'COMPLETED'
const activeStatusTab = ref<StatusFilterTab>('ALL')

const statusTabOptions: { key: StatusFilterTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'TODO', label: 'To Do' },
  { key: 'ONGOING', label: 'Ongoing' },
  { key: 'COMPLETED', label: 'Completed' },
]

// Separate Important Filter (Orthogonal to status tabs and priority)
const importantOnlyFilter = ref(false)

// Important tasks state tracking (Separate metric from Priority)
const importantTaskIds = ref<Set<string>>(new Set())

function getStorageKey(id: string): string {
  return `bpb_important_tasks_${id}`
}

function loadImportantTaskIds() {
  if (!import.meta.client) return
  const id = eventId.value || 'mock-event-id'
  try {
    const raw = localStorage.getItem(getStorageKey(id))
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) {
        importantTaskIds.value = new Set(arr)
        return
      }
    }
  } catch (err) {
    console.error('Failed to load important tasks from localStorage', err)
  }

  // Fallback / seed from tasks if not set in localStorage
  const initial = new Set<string>()
  for (const t of tasks.value) {
    if (t.isImportant) {
      initial.add(t._id)
    }
  }
  importantTaskIds.value = initial
}

function saveImportantTaskIds() {
  if (!import.meta.client) return
  const id = eventId.value || 'mock-event-id'
  try {
    localStorage.setItem(getStorageKey(id), JSON.stringify(Array.from(importantTaskIds.value)))
  } catch (err) {
    console.error('Failed to save important tasks to localStorage', err)
  }
}

function isTaskImportant(task: TaskRecord): boolean {
  if (importantTaskIds.value.has(task._id)) return true
  return Boolean(task.isImportant)
}

function toggleTaskImportant(task: TaskRecord) {
  if (mutationsDisabled.value) return
  const current = isTaskImportant(task)
  const next = !current
  const updatedSet = new Set(importantTaskIds.value)
  if (next) {
    updatedSet.add(task._id)
  } else {
    updatedSet.delete(task._id)
  }
  importantTaskIds.value = updatedSet
  task.isImportant = next
  saveImportantTaskIds()

  toast.add({
    title: next ? 'Marked as Important' : 'Removed from Important',
    description: `"${task.title}" has been ${next ? 'starred' : 'unstarred'}.`,
    color: next ? 'warning' : 'neutral',
  })
}

// Watch tasks so if localStorage was not set yet, we seed it from tasks
watch(
  tasks,
  (newTasks) => {
    if (!import.meta.client) return
    const id = eventId.value || 'mock-event-id'
    const stored = localStorage.getItem(getStorageKey(id))
    if (!stored) {
      const set = new Set<string>()
      for (const t of newTasks) {
        if (t.isImportant) {
          set.add(t._id)
        }
      }
      importantTaskIds.value = set
    }
  },
  { immediate: true }
)

// Metric Computations for Left Side
const totalTaskCount = computed(() => {
  return tasks.value.filter(isParentTask).length
})

const todoCount = computed(() => {
  return tasks.value.filter(isParentTask).filter((t) => t.status === 'TODO').length
})

const ongoingCount = computed(() => {
  return tasks.value.filter(isParentTask).filter((t) => t.status === 'ONGOING').length
})

const completedCount = computed(() => {
  return tasks.value.filter(isParentTask).filter((t) => t.status === 'COMPLETED').length
})

const importantCount = computed(() => {
  return tasks.value.filter(isParentTask).filter((t) => isTaskImportant(t)).length
})

// Priority Computations (1 Low, 2 Medium, 3 High)
const highPriorityCount = computed(() => {
  return tasks.value.filter(isParentTask).filter((t) => t.priority >= 3).length
})

const mediumPriorityCount = computed(() => {
  return tasks.value.filter(isParentTask).filter((t) => t.priority === 2).length
})

const lowPriorityCount = computed(() => {
  return tasks.value.filter(isParentTask).filter((t) => t.priority <= 1).length
})

function getPriorityDotClass(priority: number): string {
  if (priority >= 3) return 'bg-red-500'
  if (priority === 2) return 'bg-amber-500'
  return 'bg-blue-500'
}

function getPriorityDropdownItems(task: TaskRecord) {
  return [
    [
      {
        label: 'High Priority',
        icon: 'i-lucide-arrow-up',
        color: 'error' as const,
        onSelect: () => handlePriorityChange({ taskId: task._id, priority: 3 }),
      },
      {
        label: 'Medium Priority',
        icon: 'i-lucide-minus',
        color: 'warning' as const,
        onSelect: () => handlePriorityChange({ taskId: task._id, priority: 2 }),
      },
      {
        label: 'Low Priority',
        icon: 'i-lucide-arrow-down',
        color: 'info' as const,
        onSelect: () => handlePriorityChange({ taskId: task._id, priority: 1 }),
      },
    ],
  ]
}

function getTaskActionMenuItems(task: TaskRecord) {
  return [
    [
      {
        label: 'Edit task',
        icon: 'i-lucide-pencil',
        disabled: mutationsDisabled.value,
        onSelect: () => openEditModal(task),
      },
      {
        label: 'Delete task',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        disabled: mutationsDisabled.value || task.status !== 'TODO',
        onSelect: () => openRemoveModal(task),
      },
    ],
  ]
}

const overdueCount = computed(() => {
  const now = Date.now()
  return tasks.value
    .filter(isParentTask)
    .filter(
      (t) =>
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED' &&
        t.deadline &&
        new Date(t.deadline).getTime() < now
    ).length
})

const completionRate = computed(() => {
  if (totalTaskCount.value === 0) return 0
  return Math.round((completedCount.value / totalTaskCount.value) * 100)
})

// Tasks filtered by search, priority filter, active status tab, & separate important filter
const displayedTasks = computed(() => {
  let list = filteredTasks.value
  if (activeStatusTab.value !== 'ALL') {
    list = list.filter((t) => t.status === activeStatusTab.value)
  }
  if (importantOnlyFilter.value) {
    list = list.filter((t) => isTaskImportant(t))
  }
  return list
})

const hasActiveFilters = computed(() => {
  return Boolean(
    searchQuery.value.trim().length > 0 ||
    activeStatusTab.value !== 'ALL' ||
    priorityFilter.value !== 'all' ||
    importantOnlyFilter.value
  )
})

function clearAllFilters() {
  searchQuery.value = ''
  activeStatusTab.value = 'ALL'
  priorityFilter.value = 'all'
  importantOnlyFilter.value = false
}

// Deadline month groupings ("Due this month", "Due in n months", "Overdue", etc.)
const deadlineGroups = computed(() => {
  return groupTasksByDeadlineMonth(displayedTasks.value)
})

// Collapsible Group State
const collapsedGroups = ref<Record<string, boolean>>({})

function toggleGroupCollapse(key: string) {
  collapsedGroups.value = {
    ...collapsedGroups.value,
    [key]: !collapsedGroups.value[key],
  }
}

function isGroupCollapsed(key: string): boolean {
  return Boolean(collapsedGroups.value[key])
}

const areAllGroupsCollapsed = computed(() => {
  if (deadlineGroups.value.length === 0) return false
  return deadlineGroups.value.every((g) => Boolean(collapsedGroups.value[g.key]))
})

function toggleAllGroups() {
  const next = !areAllGroupsCollapsed.value
  const updated: Record<string, boolean> = {}
  for (const group of deadlineGroups.value) {
    updated[group.key] = next
  }
  collapsedGroups.value = updated
}

// UTable Columns: Task name, Due date, Actions (Task created removed)
const columns = [
  {
    accessorKey: 'title',
    header: 'Task name',
    meta: {
      class: {
        th: 'w-full text-start font-sans',
        td: 'w-full max-w-0 overflow-hidden text-start font-sans',
      },
    },
  },
  {
    accessorKey: 'deadline',
    header: 'Due date',
    meta: {
      class: {
        th: 'w-px whitespace-nowrap text-start font-sans',
        td: 'w-px whitespace-nowrap text-start font-sans',
      },
    },
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    meta: {
      class: {
        th: 'w-px whitespace-nowrap text-end font-sans',
        td: 'w-px whitespace-nowrap text-end font-sans',
      },
    },
  },
]

// Formatting Helpers
function formatTaskDateStr(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    return df.format(new Date(dateStr))
  } catch {
    return '—'
  }
}

const maxTaskDeadline = computed(() => {
  const iso = eventRecord.value?.eventDate
  if (!iso) return undefined
  return parseIsoToCalendarDate(iso) ?? undefined
})

function onTaskDeadlineSelected(task: TaskRecord, value: unknown) {
  const calDate = calendarDateFromDateValue(value as import('@internationalized/date').DateValue | null)
  if (!calDate) return
  const iso = calendarDateToUtcIso(calDate)
  if (task.deadline === iso) return

  const eventIso = eventRecord.value?.eventDate
  if (eventIso) {
    const eventTime = new Date(eventIso).getTime()
    const selectedTime = new Date(iso).getTime()
    if (!Number.isNaN(eventTime) && !Number.isNaN(selectedTime) && selectedTime > eventTime) {
      toast.add({
        title: 'Invalid due date',
        description: 'Task due date cannot be after the event date.',
        color: 'error',
      })
      return
    }
  }

  handleDeadlineChange({ taskId: task._id, deadline: iso })
}

function isTaskOverdue(task: TaskRecord): boolean {
  if (task.status === 'COMPLETED' || task.status === 'CANCELLED' || !task.deadline) {
    return false
  }
  return new Date(task.deadline).getTime() < Date.now()
}

function isDueThisWeek(dateStr?: string | null): boolean {
  if (!dateStr) return false
  const time = new Date(dateStr).getTime()
  const now = Date.now()
  const diff = time - now
  return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000
}

function getGroupIcon(key: string): string {
  if (key === 'overdue') return 'i-lucide-alert-triangle'
  if (key === 'completed') return 'i-lucide-check-circle-2'
  if (key === 'month-0') return 'i-lucide-calendar-clock'
  if (key === 'none') return 'i-lucide-calendar-off'
  return 'i-lucide-calendar'
}

function getGroupBadgeColor(key: string): 'error' | 'warning' | 'info' | 'success' | 'neutral' {
  if (key === 'overdue') return 'error'
  if (key === 'completed') return 'success'
  if (key === 'none') return 'neutral'

  if (key.startsWith('month-')) {
    const offset = parseInt(key.slice(6), 10)
    if (isNaN(offset)) return 'neutral'
    if (offset <= 2) {
      return 'error' // this month & upcoming: red
    }
    if (offset >= 3 && offset <= 6) {
      return 'warning' // 3 months to 6 months: yellow
    }
    if (offset >= 7) {
      return 'info' // 7 months onwards: blue
    }
  }

  return 'neutral'
}

function getGroupIconClass(key: string): string {
  if (key === 'overdue') return 'text-red-500'
  if (key === 'completed') return 'text-emerald-500'
  if (key === 'none') return 'text-toast-400'

  if (key.startsWith('month-')) {
    const offset = parseInt(key.slice(6), 10)
    if (!isNaN(offset)) {
      if (offset <= 2) return 'text-red-500'
      if (offset >= 3 && offset <= 6) return 'text-amber-500'
      if (offset >= 7) return 'text-blue-500'
    }
  }

  return 'text-toast-500'
}

function getCompletedCountInGroup(groupTasks: TaskRecord[]): number {
  return groupTasks.filter((t) => t.status === 'COMPLETED').length
}

function getCompletedSubtasksCount(task: TaskRecord): number {
  if (!task.subtasks) return 0
  return task.subtasks.filter((s) => s.status === 'COMPLETED').length
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
          description: 'Wedding planning checklist and milestone tasks.',
          venue: 'Manila Cathedral & Palacio de Memoria',
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
          totalTasks: 4,
          byStatus: { TODO: 1, ONGOING: 2, COMPLETED: 1 },
          preview: { page: 1, limit: 5, subtasksLimit: 2, tasks: [] },
        },
      }),
    })
    eventRecord.value = detail.event
    setActiveEvent(detail.event)
    tasksSummary.value = detail.tasks
    loadImportantTaskIds()
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
    finishPageTransition()
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

  const allowed = await requireEventFeature(EVENT_FEATURE.TASKS)
  if (!allowed) {
    return
  }

  if (route.query.priority === 'high' || route.query.priority === 'medium' || route.query.priority === 'low') {
    priorityFilter.value = route.query.priority as PriorityFilterValue
  }

  if (route.query.important === 'true') {
    importantOnlyFilter.value = true
  }

  loadImportantTaskIds()
  loadEventData()
})

watch(eventId, () => {
  loadImportantTaskIds()
  loadEventData()
})
</script>

<template>
  <div
    class="tasks-page-root w-full min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-4 lg:overflow-hidden bg-bread-50/30">
    <!-- Navbar Teleport Actions -->
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <UButton icon="i-lucide-plus" color="red" :disabled="isEventCancelled" @click="openCreateModal">
          Add Task
        </UButton>
      </Teleport>
    </ClientOnly>

    <!-- ================= LEFT DIVISION (col-span-1): Event Details & General Info ================= -->
    <aside
      class="col-span-1 lg:col-span-1 w-full bg-white border-b lg:border-b-0 shadow-xs flex flex-col justify-between lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] z-20 overflow-y-auto p-4 sm:p-5 lg:p-6 space-y-6">
      <div class="space-y-6">
        <!-- 1. Event Details -->
        <div class="space-y-2">
          <div>
            <h1
              class="font-serif text-xl sm:text-2xl font-bold text-highlighted leading-tight tracking-tight wrap-break-word">
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


        <!-- 3. General Information (Task Metrics) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between pb-1">
            <h2 class="font-bold font-serif text-sm text-highlighted">
              Task Overview
            </h2>
            <span class="text-xs text-muted font-sans font-medium">
              {{ totalTaskCount }} total
            </span>
          </div>

          <!-- Status Metrics Tiles (Slate, Purple, Green) -->
          <div class="grid grid-cols-3 gap-2">
            <!-- To Do -->
            <button type="button"
              class="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between transition-all hover:bg-slate-100/70 text-left cursor-pointer"
              :class="activeStatusTab === 'TODO' ? 'ring-2 ring-slate-400 bg-slate-100/90 shadow-xs' : ''"
              @click="activeStatusTab = activeStatusTab === 'TODO' ? 'ALL' : 'TODO'">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-slate-700 font-sans">To Do</span>
                <UIcon name="i-lucide-list-todo" class="size-3.5 text-slate-500" />
              </div>
              <span class="text-xl sm:text-2xl font-bold font-serif text-slate-900 tracking-tight mt-1">
                {{ todoCount }}
              </span>
            </button>

            <!-- Ongoing (Purple) -->
            <button type="button"
              class="bg-purple-50/70 border border-purple-200/70 rounded-xl p-2.5 flex flex-col justify-between transition-all hover:bg-purple-100/60 text-left cursor-pointer"
              :class="activeStatusTab === 'ONGOING' ? 'ring-2 ring-purple-400 bg-purple-100/80 shadow-xs' : ''"
              @click="activeStatusTab = activeStatusTab === 'ONGOING' ? 'ALL' : 'ONGOING'">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-purple-700 font-sans">Ongoing</span>
                <UIcon name="i-lucide-loader" class="size-3.5 text-purple-500" />
              </div>
              <span class="text-xl sm:text-2xl font-bold font-serif text-purple-900 tracking-tight mt-1">
                {{ ongoingCount }}
              </span>
            </button>

            <!-- Completed (Green) -->
            <button type="button"
              class="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-2.5 flex flex-col justify-between transition-all hover:bg-emerald-50 text-left cursor-pointer"
              :class="activeStatusTab === 'COMPLETED' ? 'ring-2 ring-emerald-400 bg-emerald-100/60 shadow-xs' : ''"
              @click="activeStatusTab = activeStatusTab === 'COMPLETED' ? 'ALL' : 'COMPLETED'">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-emerald-700 font-sans">Done</span>
                <UIcon name="i-lucide-check-circle-2" class="size-3.5 text-emerald-500" />
              </div>
              <span class="text-xl sm:text-2xl font-bold font-serif text-emerald-800 tracking-tight mt-1">
                {{ completedCount }}
              </span>
            </button>
          </div>

          <!-- Priority Breakdown (High, Medium, Low + Important below) -->
          <div class="space-y-2.5 pt-1">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-highlighted font-sans">Priority Levels</span>
              <button v-if="priorityFilter !== 'all' || importantOnlyFilter" type="button"
                class="text-[11px] text-toast-600 hover:text-toast-900 font-semibold cursor-pointer underline"
                @click="priorityFilter = 'all'; importantOnlyFilter = false">
                Reset
              </button>
            </div>

            <!-- 3 columns: High, Medium, Low -->
            <div class="grid grid-cols-3 gap-2">
              <!-- High Priority -->
              <button type="button"
                class="border rounded-xl p-2.5 flex flex-col justify-between transition-all text-left cursor-pointer min-w-0"
                :class="priorityFilter === 'high' ? 'bg-red-100/80 border-red-400 ring-2 ring-red-400 shadow-xs' : 'bg-red-50/60 border-red-200/60 hover:bg-red-50'"
                :title="priorityFilter === 'high' ? 'Click to show all priorities' : 'Filter by High priority'"
                @click="priorityFilter = priorityFilter === 'high' ? 'all' : 'high'">
                <div class="flex items-center justify-between gap-0.5">
                  <span class="text-[11px] font-semibold text-red-700 font-sans truncate">High</span>
                  <span class="size-1.5 rounded-full bg-red-500 shrink-0" />
                </div>
                <span class="text-xl sm:text-2xl font-bold font-serif text-red-800 tracking-tight mt-1">
                  {{ highPriorityCount }}
                </span>
              </button>

              <!-- Medium Priority -->
              <button type="button"
                class="border rounded-xl p-2.5 flex flex-col justify-between transition-all text-left cursor-pointer min-w-0"
                :class="priorityFilter === 'medium' ? 'bg-amber-100/80 border-amber-400 ring-2 ring-amber-400 shadow-xs' : 'bg-amber-50/60 border-amber-200/60 hover:bg-amber-50'"
                :title="priorityFilter === 'medium' ? 'Click to show all priorities' : 'Filter by Medium priority'"
                @click="priorityFilter = priorityFilter === 'medium' ? 'all' : 'medium'">
                <div class="flex items-center justify-between gap-0.5">
                  <span class="text-[11px] font-semibold text-amber-700 font-sans truncate">Medium</span>
                  <span class="size-1.5 rounded-full bg-amber-500 shrink-0" />
                </div>
                <span class="text-xl sm:text-2xl font-bold font-serif text-amber-800 tracking-tight mt-1">
                  {{ mediumPriorityCount }}
                </span>
              </button>

              <!-- Low Priority (Blue) -->
              <button type="button"
                class="border rounded-xl p-2.5 flex flex-col justify-between transition-all text-left cursor-pointer min-w-0"
                :class="priorityFilter === 'low' ? 'bg-blue-100/80 border-blue-400 ring-2 ring-blue-400 shadow-xs' : 'bg-blue-50/60 border-blue-200/60 hover:bg-blue-50'"
                :title="priorityFilter === 'low' ? 'Click to show all priorities' : 'Filter by Low priority'"
                @click="priorityFilter = priorityFilter === 'low' ? 'all' : 'low'">
                <div class="flex items-center justify-between gap-0.5">
                  <span class="text-[11px] font-semibold text-blue-700 font-sans truncate">Low</span>
                  <span class="size-1.5 rounded-full bg-blue-500 shrink-0" />
                </div>
                <span class="text-xl sm:text-2xl font-bold font-serif text-blue-800 tracking-tight mt-1">
                  {{ lowPriorityCount }}
                </span>
              </button>
            </div>

            <!-- Important Tasks (Spans full width below High-Medium-Low) -->
            <button type="button"
              class="w-full border rounded-xl p-2.5 sm:p-3 flex items-center justify-between transition-all text-left cursor-pointer"
              :class="importantOnlyFilter ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-400 shadow-xs' : 'bg-amber-50/70 border-amber-200/70 hover:bg-amber-100/50'"
              :title="importantOnlyFilter ? 'Important filter active (click to clear)' : 'Filter by Important tasks'"
              @click="importantOnlyFilter = !importantOnlyFilter">
              <div class="flex items-center gap-2.5">
                <div
                  class="size-8 rounded-lg bg-amber-100 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0">
                  <UIcon name="i-lucide-star" class="size-4 fill-amber-400 text-amber-500" />
                </div>
                <div>
                  <span class="text-xs font-semibold text-amber-950 block font-sans">Important Tasks</span>
                  <span class="text-[11px] text-amber-700 font-sans">
                    {{ importantOnlyFilter ? 'Filter active (click to clear)' : 'Starred items' }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1.5">
                <span v-if="importantOnlyFilter"
                  class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500 text-white leading-none">
                  Active
                </span>
                <span class="text-xl sm:text-2xl font-bold font-serif text-amber-800 tracking-tight">
                  {{ importantCount }}
                </span>
              </div>
            </button>
          </div>

          <!-- Completion Progress Card -->
          <div class="bg-toast-50/70 border border-bread-200/60 rounded-xl p-3.5 space-y-2">
            <div class="flex items-center justify-between text-xs font-sans">
              <span class="font-semibold text-toast-800">Completion</span>
              <span class="font-bold font-serif text-black text-sm">{{ completionRate }}%</span>
            </div>
            <UProgress :model-value="completionRate" color="success" size="xs" />
            <div class="flex items-center justify-between text-[11px] text-muted font-sans pt-0.5">
              <span>{{ completedCount }} of {{ totalTaskCount }} finished</span>
              <span v-if="overdueCount > 0" class="text-red-600 font-semibold">
                {{ overdueCount }} overdue
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Left Panel Bottom Links -->
      <div class="pt-4 ">
        <UButton icon="i-lucide-users" color="neutral" variant="outline" size="sm" block class="w-full justify-center"
          :disabled="mutationsDisabled || (!eventId && !isUiOnlyMode)" @click="openManageAssigneesModal">
          Manage Assignees
        </UButton>
      </div>
      <div>
        <UButton icon="i-lucide-plus" color="red" size="md" block
          class="w-full font-semibold shadow-xs justify-center py-2.5 transition-all hover:shadow hover:brightness-105 active:scale-[0.99] cursor-pointer"
          :disabled="isEventCancelled" @click="openCreateModal">
          Add New Task
        </UButton>
      </div>
    </aside>

    <!-- ================= RIGHT DIVISION (col-span-3): Scrollable Tasks View ================= -->
    <main
      class="col-span-1 lg:col-span-3 w-full h-full lg:h-[calc(100vh-64px)] flex flex-col min-h-0 overflow-hidden bg-toast-50/30">
      <!-- Top Sticky Toolbar -->
      <header
        class="bg-white/95 backdrop-blur border-b border-bread-200/80 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
        <!-- Search and Filters -->
        <div class="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <UInput v-model="searchQuery" icon="i-lucide-search" type="search"
            placeholder="Search tasks by name or details..." class="w-full sm:w-56 md:w-64" />

          <!-- Status Filter Pills: All, To Do, Ongoing, Completed -->
          <div
            class="hidden sm:inline-flex items-center p-0.5 bg-toast-100/70 border border-bread-200/50 rounded-lg text-xs font-medium font-sans">
            <button v-for="tab in statusTabOptions" :key="tab.key" type="button"
              class="px-2.5 py-1 rounded-md transition-all cursor-pointer select-none inline-flex items-center gap-1.5"
              :class="activeStatusTab === tab.key ? 'bg-white text-highlighted shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
              @click="activeStatusTab = tab.key">
              <span v-if="tab.key === 'TODO'" class="size-1.5 rounded-full bg-slate-500" />
              <span v-else-if="tab.key === 'ONGOING'" class="size-1.5 rounded-full bg-purple-500" />
              <span v-else-if="tab.key === 'COMPLETED'" class="size-1.5 rounded-full bg-emerald-500" />
              {{ tab.label }}
            </button>
          </div>

          <!-- Separate Important Filter Button -->
          <button type="button"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium font-sans transition-all cursor-pointer border select-none shrink-0"
            :class="importantOnlyFilter
              ? 'bg-amber-100 border-amber-400 text-amber-900 font-semibold shadow-xs ring-1 ring-amber-400'
              : 'bg-white border-bread-200/80 text-toast-700 hover:bg-bread-50 hover:text-toast-900'"
            :title="importantOnlyFilter ? 'Showing only Important tasks (click to show all)' : 'Filter by Important tasks'"
            @click="importantOnlyFilter = !importantOnlyFilter">
            <UIcon name="i-lucide-star" class="size-3.5 shrink-0"
              :class="importantOnlyFilter ? 'fill-amber-500 text-amber-500' : 'fill-amber-400/50 text-amber-500'" />
            <span>Important</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full font-semibold leading-tight"
              :class="importantOnlyFilter ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'">
              {{ importantCount }}
            </span>
            <UIcon v-if="importantOnlyFilter" name="i-lucide-x"
              class="size-3 text-amber-700 hover:text-amber-950 ml-0.5 shrink-0" />
          </button>

          <!-- Priority Filter Dropdown -->
          <div class="flex items-center gap-1.5">
            <USelect v-model="priorityFilter" :items="PRIORITY_FILTER_OPTIONS" value-key="value" label-key="label"
              icon="i-lucide-flag" class="w-[132px] text-xs font-sans shrink-0" size="sm" />
          </div>
        </div>

        <!-- Right Action Controls -->
        <div class="flex items-center gap-2 shrink-0">
          <UButton icon="i-lucide-filter-x" color="neutral" variant="ghost" size="sm"
            class="font-sans transition-colors"
            :class="hasActiveFilters ? 'cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-muted/50'"
            :disabled="!hasActiveFilters" @click="clearAllFilters">
            Clear all filters
          </UButton>

          <UButton :icon="areAllGroupsCollapsed ? 'i-lucide-chevrons-down-up' : 'i-lucide-chevrons-up-down'"
            color="neutral" variant="ghost" size="sm" class="cursor-pointer font-sans" @click="toggleAllGroups">
            {{ areAllGroupsCollapsed ? 'Expand All' : 'Collapse All' }}
          </UButton>
        </div>
      </header>

      <!-- Scrollable Tasks Body -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 min-h-0">
        <!-- Event Cancelled Warning -->
        <UAlert v-if="mutationsDisabled" color="warning" variant="subtle" title="Event cancelled"
          description="Tasks cannot be edited or added while this event is cancelled." class="mb-2" />

        <!-- Loading State -->
        <div v-if="isLoading || isLoadingEvent" class="flex flex-col items-center justify-center py-20 text-muted">
          <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
          <p class="mt-3 text-sm font-medium">Loading your tasks...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="deadlineGroups.length === 0"
          class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-300 bg-white/70 px-6 py-16 text-center shadow-xs">
          <div class="size-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-3">
            <UIcon name="i-lucide-list-todo" class="size-6" />
          </div>
          <h3 class="text-base font-semibold text-highlighted">No tasks found</h3>
          <p class="text-xs text-muted max-w-sm mt-1">
            {{ hasActiveFilters ?
              'No tasks matched your current search or filter criteria. Try clearing filters.'
              : 'Add your first task to start planning your event milestones.' }}
          </p>
          <div class="flex items-center gap-2 mt-4">
            <UButton v-if="hasActiveFilters" color="neutral" variant="outline" size="sm" @click="clearAllFilters">
              Clear Filters
            </UButton>
            <UButton icon="i-lucide-plus" color="red" size="sm" :disabled="isEventCancelled" @click="openCreateModal">
              Add Task
            </UButton>
          </div>
        </div>

        <!-- Task Groups by Deadline Month -->
        <div v-else class="space-y-1">
          <div v-for="group in deadlineGroups" :key="group.key"
            class="rounded-xl border border-bread-400 bg-white overflow-hidden shadow-xs transition-all duration-200">
            <!-- Collapsible Group Header -->
            <div
              class="flex items-center justify-between px-4 py-3.5 bg-white hover:bg-bread-50/50 cursor-pointer select-none transition-colors"
              :class="!isGroupCollapsed(group.key) ? 'border-b border-bread-400' : ''"
              @click="toggleGroupCollapse(group.key)">
              <div class="flex items-center gap-2.5 min-w-0">
                <UIcon :name="getGroupIcon(group.key)" :class="getGroupIconClass(group.key)" class="size-4 shrink-0" />
                <h3 class="font-semibold text-sm text-highlighted truncate font-sans">
                  {{ group.label }}
                </h3>
                <UBadge :color="getGroupBadgeColor(group.key)" variant="subtle" size="sm"
                  class="font-semibold text-xs shrink-0">
                  {{ group.tasks.length }}
                </UBadge>
              </div>

              <div class="flex items-center gap-3 shrink-0">
                <span class="text-xs text-muted font-sans hidden sm:inline">
                  {{ getCompletedCountInGroup(group.tasks) }}/{{ group.tasks.length }} completed
                </span>
                <UIcon name="i-lucide-chevron-down" class="size-4 text-toast-400 transition-transform duration-200"
                  :class="isGroupCollapsed(group.key) ? '-rotate-90' : ''" />
              </div>
            </div>

            <!-- Group Content: Nuxt UI UTable -->
            <div v-show="!isGroupCollapsed(group.key)" class="overflow-x-auto bg-white">
              <UTable :data="group.tasks" :columns="columns" class="w-full font-sans" :ui="{
                base: 'w-full table-auto font-sans',
                thead: 'border-b border-bread-200/60 bg-bread-50/40 font-sans',
                th: 'text-[11px] font-semibold uppercase tracking-wider text-muted py-2.5 px-3 sm:px-4 font-sans',
                td: 'py-2.5 px-3 sm:px-4 text-sm font-sans border-b border-bread-100/60 align-middle',
                tr: 'cursor-pointer hover:bg-toast-50/70 transition-colors group font-sans'
              }">
                <!-- Header override for right-aligned Actions -->
                <template #actions-header>
                  <div class="text-end">Actions</div>
                </template>

                <!-- 1. Task Name Column (takes remaining space, truncate/bounded to prevent pushing other columns) -->
                <template #title-cell="{ row }">
                  <div class="font-sans flex flex-col gap-0.5 min-w-0 w-full py-0.5 cursor-pointer overflow-hidden"
                    @click="openDetailsModal(row.original)">
                    <div class="font-sans flex items-center gap-1.5 min-w-0 max-w-full">
                      <svg v-if="isTaskImportant(row.original)"
                        class="size-3.5 text-yellow-400 fill-yellow-400 shrink-0" viewBox="0 0 24 24"
                        fill="currentColor" title="Important task">
                        <polygon
                          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span
                        class="font-sans font-medium text-sm text-highlighted group-hover:text-primary-700 transition-colors truncate min-w-0"
                        :class="row.original.status === 'COMPLETED' ? 'line-through text-muted' : ''"
                        :title="row.original.title">
                        {{ row.original.title }}
                      </span>
                    </div>

                    <p v-if="row.original.details" class="font-sans text-xs text-muted truncate max-w-full"
                      :title="row.original.details">
                      {{ row.original.details }}
                    </p>

                    <div class="font-sans flex items-center gap-2.5 text-[11px] text-muted mt-0.5 truncate max-w-full">
                      <!-- Priority Badge with Quick Dropdown Menu -->
                      <UDropdownMenu :items="getPriorityDropdownItems(row.original)" :disabled="mutationsDisabled"
                        :content="{ align: 'start' }">
                        <button type="button"
                          class="inline-flex items-center cursor-pointer transition-transform hover:scale-105 shrink-0"
                          :title="`Priority: ${mapTaskPriority(row.original.priority).label}. Click to change.`"
                          :disabled="mutationsDisabled" @click.stop>
                          <UBadge :color="mapTaskPriority(row.original.priority).color" variant="subtle" size="xs"
                            class="font-medium cursor-pointer">
                            <span class="size-1.5 rounded-full mr-1 shrink-0"
                              :class="getPriorityDotClass(row.original.priority)" />
                            {{ mapTaskPriority(row.original.priority).label }}
                            <UIcon name="i-lucide-chevron-down" class="size-2.5 ml-0.5 opacity-60" />
                          </UBadge>
                        </button>
                      </UDropdownMenu>

                      <!-- Important Badge if marked as Important -->
                      <UBadge v-if="isTaskImportant(row.original)" color="warning" variant="subtle" size="xs"
                        class="font-medium shrink-0 inline-flex items-center gap-1">
                        <svg class="size-2.5 fill-amber-500 text-amber-500 shrink-0" viewBox="0 0 24 24"
                          fill="currentColor">
                          <polygon
                            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        Important
                      </UBadge>

                      <span v-if="row.original.assignee?.name" class="inline-flex items-center gap-1 shrink-0">
                        <UIcon name="i-lucide-user" class="size-3 text-toast-400" />
                        {{ row.original.assignee.name }}
                      </span>
                      <span v-if="row.original.subtasks && row.original.subtasks.length > 0"
                        class="font-sans inline-flex items-center gap-1 shrink-0">
                        <UIcon name="i-lucide-check-square" class="size-3 text-toast-400" />
                        {{ getCompletedSubtasksCount(row.original) }}/{{ row.original.subtasks.length }} subtasks
                      </span>
                    </div>
                  </div>
                </template>

                <!-- 2. Due Date Column: Editable inline without modal -->
                <template #deadline-cell="{ row }">
                  <div class="whitespace-nowrap py-0.5 text-start" @click.stop>
                    <UPopover :disabled="mutationsDisabled">
                      <button
                        type="button"
                        class="group/date inline-flex flex-col text-start px-2 py-1 -mx-2 -my-1 rounded-md transition-colors cursor-pointer hover:bg-bread-100/70 select-none focus:outline-none focus:ring-1 focus:ring-toast-400"
                        :class="mutationsDisabled ? 'cursor-not-allowed opacity-75' : ''"
                        :disabled="mutationsDisabled"
                        title="Click to edit due date"
                      >
                        <div v-if="row.original.deadline" class="flex flex-col">
                          <span
                            class="text-xs font-medium inline-flex items-center gap-1.5"
                            :class="isTaskOverdue(row.original)
                              ? 'text-red-600 font-semibold'
                              : row.original.status === 'COMPLETED'
                              ? 'line-through text-muted'
                              : 'text-highlighted group-hover/date:text-toast-800'"
                          >
                            <UIcon
                              v-if="isTaskOverdue(row.original)"
                              name="i-lucide-alert-circle"
                              class="size-3.5 shrink-0 text-red-500"
                            />
                            <UIcon
                              v-else
                              name="i-lucide-calendar"
                              class="size-3 shrink-0 text-toast-400 group-hover/date:text-toast-600"
                            />
                            {{ formatTaskDateStr(row.original.deadline) }}
                            <UIcon
                              name="i-lucide-pencil"
                              class="size-2.5 opacity-0 group-hover/date:opacity-100 transition-opacity text-toast-500"
                            />
                          </span>
                          <span
                            v-if="isTaskOverdue(row.original)"
                            class="text-[10px] text-red-600 font-medium"
                          >
                            Overdue
                          </span>
                          <span
                            v-else-if="isDueThisWeek(row.original.deadline) && row.original.status !== 'COMPLETED'"
                            class="text-[10px] text-amber-600 font-medium"
                          >
                            Due this week
                          </span>
                        </div>
                        <span
                          v-else
                          class="text-xs text-muted/70 inline-flex items-center gap-1 group-hover/date:text-toast-800"
                        >
                          <UIcon name="i-lucide-calendar-plus" class="size-3 text-toast-400" />
                          <span>Set due date</span>
                        </span>
                      </button>

                      <template #content="{ close }">
                        <div class="p-2 space-y-2 bg-white rounded-lg shadow-lg">
                          <div class="px-2 pt-1 flex items-center justify-between text-xs font-semibold text-toast-900 border-b border-bread-200 pb-1.5">
                            <span class="inline-flex items-center gap-1">
                              <UIcon name="i-lucide-calendar" class="size-3.5 text-toast-600" />
                              Change Due Date
                            </span>
                            <span v-if="eventDateLabel" class="text-[10px] text-muted font-normal">
                              Event: {{ eventDateLabel }}
                            </span>
                          </div>
                          <UCalendar
                            :model-value="parseIsoToCalendarDate(row.original.deadline)"
                            :max-value="maxTaskDeadline"
                            class="p-1"
                            @update:model-value="(value) => {
                              onTaskDeadlineSelected(row.original, value)
                              close()
                            }"
                          />
                        </div>
                      </template>
                    </UPopover>
                  </div>
                </template>

                <!-- 3. Actions Column: Status transition, Star button, & Three-dot menu -->
                <template #actions-cell="{ row }">
                  <div class="flex items-center justify-end gap-1.5 py-0.5 whitespace-nowrap shrink-0" @click.stop>
                    <!-- If TODO: Mark Ongoing & Mark Done -->
                    <template v-if="row.original.status === 'TODO'">
                      <UButton size="xs" color="purple" variant="soft" icon="i-lucide-play"
                        class="font-medium cursor-pointer" :loading="updatingTaskId === row.original._id"
                        :disabled="mutationsDisabled"
                        @click.stop="handleStatusChange({ taskId: row.original._id, status: 'ONGOING' })">
                        Ongoing
                      </UButton>
                      <UButton size="xs" color="success" variant="soft" icon="i-lucide-check"
                        class="font-medium cursor-pointer" :loading="updatingTaskId === row.original._id"
                        :disabled="mutationsDisabled"
                        @click.stop="handleStatusChange({ taskId: row.original._id, status: 'COMPLETED' })">
                        Done
                      </UButton>
                    </template>

                    <!-- If ONGOING: Mark Done & Revert to To Do -->
                    <template v-else-if="row.original.status === 'ONGOING'">
                      <UButton size="xs" color="success" variant="solid" icon="i-lucide-check"
                        class="font-medium cursor-pointer" :loading="updatingTaskId === row.original._id"
                        :disabled="mutationsDisabled"
                        @click.stop="handleStatusChange({ taskId: row.original._id, status: 'COMPLETED' })">
                        Done
                      </UButton>
                      <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-rotate-ccw"
                        class="text-xs cursor-pointer text-muted hover:text-highlighted" title="Move back to To Do"
                        :disabled="mutationsDisabled"
                        @click.stop="handleStatusChange({ taskId: row.original._id, status: 'TODO' })">
                        To Do
                      </UButton>
                    </template>

                    <!-- If COMPLETED: Done badge & Reopen -->
                    <template v-else-if="row.original.status === 'COMPLETED'">
                      <UBadge size="xs" color="success" variant="subtle" icon="i-lucide-check-circle"
                        class="shrink-0 font-medium">
                        Done
                      </UBadge>
                      <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-rotate-ccw"
                        class="text-xs text-muted hover:text-highlighted cursor-pointer shrink-0" title="Reopen task"
                        :disabled="mutationsDisabled"
                        @click.stop="handleStatusChange({ taskId: row.original._id, status: 'ONGOING' })">
                        Reopen
                      </UButton>
                    </template>

                    <!-- Star Button (Square Aspect Ratio, Solid Yellow when Important) -->
                    <button type="button"
                      class="size-7 aspect-square rounded-md flex items-center justify-center transition-all cursor-pointer shrink-0"
                      :class="isTaskImportant(row.original)
                        ? 'bg-yellow-400 hover:bg-yellow-300 text-white shadow-xs border border-yellow-500/40 active:scale-95'
                        : 'bg-white hover:bg-yellow-50/80 text-toast-400 hover:text-yellow-600 border border-bread-200/80 active:scale-95'"
                      :title="isTaskImportant(row.original) ? 'Unstar task (Remove Important)' : 'Star task (Mark as Important)'"
                      :disabled="mutationsDisabled" @click.stop="toggleTaskImportant(row.original)">
                      <svg v-if="isTaskImportant(row.original)"
                        class="size-3.5 fill-white text-white transition-transform" viewBox="0 0 24 24"
                        fill="currentColor">
                        <polygon
                          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <UIcon v-else name="i-lucide-star" class="size-3.5 transition-transform text-toast-400" />
                    </button>

                    <!-- Three-dot dropdown menu (rightmost side) -->
                    <UDropdownMenu :items="getTaskActionMenuItems(row.original)" :content="{ align: 'end' }"
                      :disabled="mutationsDisabled">
                      <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-more-vertical"
                        class="cursor-pointer text-muted hover:text-highlighted shrink-0" title="Task actions"
                        :disabled="mutationsDisabled" @click.stop />
                    </UDropdownMenu>
                  </div>
                </template>
              </UTable>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Task Details Modal (Opens when row is clicked) -->
    <TaskDetailsModal v-model:open="isDetailsOpen" :task="selectedTask" />

    <!-- Task Create & Edit Modal -->
    <TaskFormModal v-model:open="isFormOpen" :event-id="eventId" :event-record="eventRecord" :task="editingTask"
      :assignee-select-items="assigneeSelectItems" :disabled="mutationsDisabled" @saved="handleFormSaved" />

    <!-- Manage Assignees Modal -->
    <ManageAssigneesModal v-model:open="isManageAssigneesOpen" :event-id="eventId" :assignees="assignees"
      :disabled="mutationsDisabled" @changed="handleAssigneesChanged" />

    <!-- Task Removal Confirmation Modal -->
    <UModal v-model:open="isRemoveModalOpen" title="Delete Task" :ui="{
      header: 'bg-red-500 border-none',
      title: 'text-white font-serif text-xl',
      content: 'border-none ring-transparent w-full max-w-md',
      overlay: 'bg-toast-900/40',
    }" :close="{ variant: 'link', class: 'rounded-full text-white' }">
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-highlighted">
            Are you sure you want to delete
            <span class="font-semibold text-toast-900">"{{ taskForRemove?.title }}"</span>?
          </p>
          <p class="text-xs text-muted">
            This action cannot be undone. If this task contains subtasks, they will be promoted or removed.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-2 w-full">
          <UButton color="neutral" variant="outline" size="sm" :disabled="isRemoveSubmitting" @click="closeRemoveModal">
            Cancel
          </UButton>
          <UButton color="error" size="sm" :loading="isRemoveSubmitting" @click="confirmRemoveTask">
            Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
