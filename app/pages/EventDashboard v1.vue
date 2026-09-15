<script lang="ts" setup>
import { DateFormatter } from '@internationalized/date'
import { isWeddingEventType, formatEventPriceTier } from '~/types/event'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { getTaskTrackerMetrics } from '~/utils/taskListUpdates'
import { defaultCover, resolveEventCoverImageUrl } from '~/utils/eventImage'
import demoCoverImage from '~/assets/bpb-images/wedding-1.jpg'
import type { TaskStatus } from '~/types/task'
import { getAssigneeLabel } from '~/utils/taskAssignee'
import type { EventRecord, TasksSummary, SelectedEventDetail } from '~/types/event'
import { isEventFullyPaid, isTierUpgradePending, getPendingUpgradeStatusLabel, getPendingUpgradeTargetName } from '~/types/payment'
import {
  EVENT_FEATURE,
  type DashboardAction,
  getAllowedFeaturesForEvent,
  isDashboardActionAllowed,
  isEventFeatureAllowed,
  resolveEventTierCode,
  resolveEventDashboardPath,
} from '~/utils/eventTierFeatures'

const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
})

definePageMeta({
  layout: 'event-navbar',
})

const toast = useToast()
const route = useRoute()
const { fetchEvent, getCachedEvent } = useEvents()
const { updateTaskStatus } = useTasks()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const tasksSummary = ref<TasksSummary | null>(null)
const isLoadingEvent = ref(false)

const isUpgradePending = computed(() => isTierUpgradePending(eventRecord.value))

const pendingUpgradeTargetName = computed(() => getPendingUpgradeTargetName(eventRecord.value))

const useDemoFallbacks = computed(() => !eventId.value || isUiOnlyMode.value)

const isWeddingEvent = computed(() =>
  isWeddingEventType(eventRecord.value?.eventType ?? (useDemoFallbacks.value ? 'WEDDING' : ''))
)

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')

const eventTitle = computed(() => {
  if (eventRecord.value?.eventName) {
    return eventRecord.value.eventName
  }
  if (eventId.value && isLoadingEvent.value) {
    return ''
  }
  if (useDemoFallbacks.value) {
    return "Jane & John's Wedding"
  }
  return ''
})

const eventVenue = computed(() => {
  if (eventRecord.value?.venue) {
    return eventRecord.value.venue
  }
  if (eventId.value && isLoadingEvent.value) {
    return ''
  }
  if (useDemoFallbacks.value) {
    return 'Manila Cathedral'
  }
  return ''
})

const eventDateLabel = computed(() => {
  const dateValue = eventRecord.value?.eventDate
  if (dateValue) {
    return df.format(new Date(dateValue))
  }
  if (eventId.value && isLoadingEvent.value) {
    return ''
  }
  if (useDemoFallbacks.value) {
    return 'May 18, 2026'
  }
  return ''
})

const eventCoverUrl = computed(() => {
  if (eventRecord.value?.coverImageURL) {
    return resolveEventCoverImageUrl(eventRecord.value.coverImageURL)
  }
  if (useDemoFallbacks.value) {
    return demoCoverImage
  }
  return null
})

const taskTracker = computed(() => {
  if (tasksSummary.value) {
    const { ongoing, completed, activeTotal } = getTaskTrackerMetrics(tasksSummary.value.byStatus)
    if (activeTotal === 0) {
      return { label: 'No Tasks Yet', percent: 0, isEmpty: true }
    }
    return {
      label: `${completed} / ${activeTotal}`,
      percent: Math.round((completed / activeTotal) * 100),
      isEmpty: false,
    }
  }
  if (useDemoFallbacks.value) {
    return { label: '2 / 4', percent: 50, isEmpty: false }
  }
  return { label: 'No Tasks Yet', percent: 0, isEmpty: true }
})

const tabItems = computed(() => {
  const todoCount = tasksSummary.value?.byStatus?.TODO || 0
  const ongoingCount = tasksSummary.value?.byStatus?.ONGOING || 0
  const completedCount = tasksSummary.value?.byStatus?.COMPLETED || 0
  return [
    { label: `To Do (${todoCount})`, value: 0 },
    { label: `Ongoing (${ongoingCount})`, value: 1 },
    { label: `Completed (${completedCount})`, value: 2 }
  ]
})

const selectedTab = ref(0)
const updatingPreviewTaskId = ref<string | null>(null)

const todoTasks = computed(() => {
  return tasksSummary.value?.preview.tasks.filter((t: { status?: string }) => t.status === 'TODO') || []
})

const ongoingTasks = computed(() => {
  return tasksSummary.value?.preview.tasks.filter((t: { status?: string }) => t.status === 'ONGOING') || []
})

const completedTasks = computed(() => {
  return tasksSummary.value?.preview.tasks.filter((t: { status?: string }) => t.status === 'COMPLETED') || []
})

function getPriorityLabel(priority: number) {
  if (priority === 1) return 'Urgent'
  if (priority === 2) return 'Medium'
  return 'Low'
}

function getPriorityColor(priority: number) {
  if (priority === 1) return 'error' as const
  if (priority === 2) return 'secondary' as const
  return 'success' as const
}

async function changeTaskStatus(
  taskParam: { _id: string; status: string },
  status: Extract<TaskStatus, 'TODO' | 'ONGOING' | 'COMPLETED'>
) {
  if (isEventCancelled.value || !tasksSummary.value) {
    return
  }

  const task = tasksSummary.value.preview.tasks.find((entry) => entry._id === taskParam._id)
  if (!task || task.status === status) {
    return
  }

  const previousStatus = task.status as Extract<TaskStatus, 'TODO' | 'ONGOING' | 'COMPLETED'>
  const byStatus = tasksSummary.value.byStatus

  byStatus[previousStatus] = Math.max(0, (byStatus[previousStatus] ?? 0) - 1)
  task.status = status
  byStatus[status] = (byStatus[status] ?? 0) + 1

  updatingPreviewTaskId.value = task._id
  try {
    await updateTaskStatus(task._id, status)
    toast.add({ title: 'Task status updated', color: 'success' })
  } catch (error) {
    byStatus[status] = Math.max(0, (byStatus[status] ?? 0) - 1)
    task.status = previousStatus
    byStatus[previousStatus] = (byStatus[previousStatus] ?? 0) + 1
    reportApiError(toast, { title: 'Could not update task status', error })
  } finally {
    updatingPreviewTaskId.value = null
  }
}

const taskPriorities = ['Urgent', 'Medium', 'Low']
const modelValue = ref()

function onCoverImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = defaultCover
}

async function loadEventData() {
  if (eventId.value) {
    const cached = getCachedEvent(eventId.value)
    if (cached) {
      const cachedTier = resolveEventTierCode(cached)
      if (cachedTier !== 'BREAD') {
        const targetPath = resolveEventDashboardPath(cached)
        await navigateTo({ path: targetPath, query: route.query }, { replace: true })
        return
      }
    }
  }

  if (!eventId.value && !isUiOnlyMode.value) {
    return
  }

  isLoadingEvent.value = true
  eventRecord.value = null
  tasksSummary.value = null
  try {
    const detail = await loadPageData<SelectedEventDetail>({
      mock: () => ({
        event: {
          _id: 'mock-event-id',
          eventType: 'WEDDING',
          eventName: "Jane & John's Wedding",
          description: 'Mock event',
          venue: 'Manila Cathedral',
          eventDate: '2026-05-18T00:00:00.000Z',
          status: 'ONGOING',
          coverImageURL: null,
          latestPayment: null,
          priceTier: {
            _id: 'mock-tier-id',
            code: 'bread',
            name: 'Bread',
            pricePhp: 5000,
            isEnabled: true,
          },
          tierPricePhp: 5000,
          allowedFeatures: getAllowedFeaturesForEvent({
            priceTier: {
              _id: 'mock-tier-id',
              code: 'bread',
              name: 'Bread',
              pricePhp: 5000,
              isEnabled: true,
            },
            tierPricePhp: 5000,
          }),
        },
        guestList: [],
        rsvpSummary: null,
        tasks: {
          totalTasks: 4,
          byStatus: { TODO: 1, ONGOING: 2, COMPLETED: 1 },
          preview: {
            page: 1,
            limit: 5,
            subtasksLimit: 2,
            tasks: [
              {
                _id: 'mock-task-0',
                title: 'Book a live band',
                details: 'Find and book a live band for the reception.',
                status: 'TODO',
                priority: 2,
                deadline: '2026-08-15T00:00:00.000Z',
              },
              {
                _id: 'mock-task-1',
                title: 'Book a photo booth',
                details: 'Find and book a photo booth service for the reception.',
                status: 'ONGOING',
                priority: 1,
                deadline: '2026-06-15T00:00:00.000Z',
                assignee: { _id: 'mock-assignee-1', name: 'Florist' },
              },
              {
                _id: 'mock-task-2',
                title: 'Finalize catering menu',
                details: 'Confirm final menu choices with the caterer.',
                status: 'ONGOING',
                priority: 3,
                deadline: '2026-07-01T00:00:00.000Z',
                assignee: { _id: 'mock-assignee-2', name: 'Caterer' },
              },
              {
                _id: 'mock-task-3',
                title: 'Send wedding invitations',
                details: 'Design, print, and mail invitations.',
                status: 'COMPLETED',
                priority: 2,
                deadline: '2026-05-01T00:00:00.000Z',
              },
            ],
          },
        },
      }),
      fetch: async () => fetchEvent(eventId.value, true),
    })

    if (detail.event) {
      const tier = resolveEventTierCode(detail.event)
      if (tier !== 'BREAD') {
        const targetPath = resolveEventDashboardPath(detail.event)
        await navigateTo({ path: targetPath, query: route.query }, { replace: true })
        return
      }
    }

    eventRecord.value = detail.event
    setActiveEvent(detail.event)
    tasksSummary.value = detail.tasks
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
  }
}

onMounted(() => {
  loadEventData()
})

watch(eventId, () => {
  loadEventData()
})

function openWebsiteMaker() {
  if (isEventCancelled.value) {
    return
  }
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/website-maker', query: { eventId: id } })
}

function openUpgradePage() {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }

  if (!isUiOnlyMode.value && eventRecord.value && !isEventFullyPaid(eventRecord.value)) {
    navigateTo({ path: '/event/payment-review', query: { eventId: id } })
    return
  }

  if (!isUiOnlyMode.value && isUpgradePending.value) {
    toast.add({
      title: 'Upgrade pending review',
      description: pendingUpgradeTargetName.value
        ? `Your upgrade to ${pendingUpgradeTargetName.value} is being verified.`
        : 'Your upgrade payment is being verified.',
      color: 'warning',
    })
    navigateTo({ path: '/event/upgrade', query: { eventId: id } })
    return
  }

  navigateTo({ path: '/event/upgrade', query: { eventId: id } })
}

function openInvitationMaker() {
  if (isEventCancelled.value) {
    return
  }
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/invitation-maker', query: { eventId: id } })
}

function openGuestList() {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/event/guests', query: { eventId: id } })
}

function openTasksDashboard() {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/event/tasks', query: { eventId: id } })
}

function openRsvpDashboard() {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/event/rsvp', query: { eventId: id } })
}

function openEventSettings() {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/event/settings', query: { eventId: id } })
}

function openPayments() {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/event/payment-review', query: { eventId: id } })
}

function openSchedulesDashboard() {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/event/schedules', query: { eventId: id } })
}

function openWishlistDashboard() {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/event/wishlist', query: { eventId: id } })
}

function openEventPlaylist() {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/event/playlist', query: { eventId: id } })
}

function openChurchRequirementsDashboard() {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/event/requirements', query: { eventId: id } })
}

function openSuppliersDashboard() {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }
  navigateTo({ path: '/event/suppliers', query: { eventId: id } })
}

type DashboardItem = {
  label: string
  icon: string
  action: DashboardAction
  description: string
  weddingOnly?: boolean
  bgClass: string
  hoverClass: string
  ringClass: string
}

const DASHBOARD_ITEM_CATALOG: DashboardItem[] = [
  // Row 1: Public Presence & Communication (The Event Story)
  {
    label: 'Website',
    icon: 'i-lucide-globe',
    action: 'website',
    description: 'Create, customize, and publish your personalized event website and story.',
    bgClass: 'bg-blue-500',
    hoverClass: 'group-hover:bg-blue-600',
    ringClass: 'group-focus-visible:ring-blue-500',
  },
  {
    label: 'Invitation',
    icon: 'i-lucide-send',
    action: 'invitation',
    description: 'Design digital invitation cards and send announcements to guests.',
    bgClass: 'bg-violet-500',
    hoverClass: 'group-hover:bg-violet-600',
    ringClass: 'group-focus-visible:ring-violet-500',
  },
  {
    label: 'RSVP',
    icon: 'i-lucide-mail',
    action: 'rsvp',
    description: 'Track guest confirmations, headcounts, meal preferences, and attendance.',
    bgClass: 'bg-teal-500',
    hoverClass: 'group-hover:bg-teal-600',
    ringClass: 'group-focus-visible:ring-teal-500',
  },

  // Row 2: Guest Management & Experience
  {
    label: 'Guest List',
    icon: 'i-lucide-users',
    action: 'guestList',
    description: 'Manage invitees, companion allocations, contact info, and seating tables.',
    bgClass: 'bg-orange-500',
    hoverClass: 'group-hover:bg-orange-600',
    ringClass: 'group-focus-visible:ring-orange-500',
  },
  {
    label: 'Gifts',
    icon: 'i-lucide-gift',
    action: 'wishlist',
    description: 'Curate gift wishlists, registry items, and preferred contribution links.',
    bgClass: 'bg-pink-500',
    hoverClass: 'group-hover:bg-pink-600',
    ringClass: 'group-focus-visible:ring-pink-500',
  },
  {
    label: 'Playlist',
    icon: 'i-lucide-music',
    action: 'playlist',
    description: 'Organize song requests, special dance music, and reception playlists.',
    bgClass: 'bg-lime-500',
    hoverClass: 'group-hover:bg-lime-600',
    ringClass: 'group-focus-visible:ring-lime-500',
  },

  // Row 3: Planning, Logistics & Execution
  {
    label: 'Tasks',
    icon: 'i-lucide-list-todo',
    action: 'tasks',
    description: 'Track wedding planning milestones, to-do items, and team deadlines.',
    bgClass: 'bg-red-500',
    hoverClass: 'group-hover:bg-red-600',
    ringClass: 'group-focus-visible:ring-red-500',
  },
  {
    label: 'Schedules',
    icon: 'i-lucide-calendar',
    action: 'schedules',
    description: 'Coordinate day-of timelines, bridal prep rundowns, and ceremony itineraries.',
    bgClass: 'bg-cyan-500',
    hoverClass: 'group-hover:bg-cyan-600',
    ringClass: 'group-focus-visible:ring-cyan-500',
  },
  {
    label: 'Suppliers',
    icon: 'i-lucide-briefcase',
    action: 'suppliers',
    description: 'Organize vendor contacts, contracts, category details, and bookings.',
    bgClass: 'bg-fuchsia-500',
    hoverClass: 'group-hover:bg-fuchsia-600',
    ringClass: 'group-focus-visible:ring-fuchsia-500',
  },

  // Row 4: Compliance, Financials & Administration
  {
    label: 'Requirements',
    icon: 'i-lucide-church',
    action: 'churchRequirements',
    description: 'Track essential canonical, legal, and church document requirements.',
    weddingOnly: true,
    bgClass: 'bg-yellow-500',
    hoverClass: 'group-hover:bg-yellow-600',
    ringClass: 'group-focus-visible:ring-yellow-500',
  },
  {
    label: 'Payments',
    icon: 'i-lucide-credit-card',
    action: 'payments',
    description: 'Review subscription packages, upgrade options, invoices, and billing.',
    bgClass: 'bg-emerald-500',
    hoverClass: 'group-hover:bg-emerald-600',
    ringClass: 'group-focus-visible:ring-emerald-500',
  },
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    action: 'settings',
    description: 'Configure event dates, venue location, guest permissions, and preferences.',
    bgClass: 'bg-slate-500',
    hoverClass: 'group-hover:bg-slate-600',
    ringClass: 'group-focus-visible:ring-slate-500',
  },
]

function isDashboardItemBlocked(item: DashboardItem): boolean {
  if (item.action === 'settings') {
    return false
  }
  return !isDashboardActionAllowed(eventRecord.value, item.action)
}

const dashboardItems = computed(() => {
  const filtered = DASHBOARD_ITEM_CATALOG.filter((item) => {
    if (item.weddingOnly && !isWeddingEvent.value) {
      return false
    }
    return true
  })

  // Place unlocked items first, and locked features at the bottom
  const unlocked = filtered.filter((item) => !isDashboardItemBlocked(item))
  const locked = filtered.filter((item) => isDashboardItemBlocked(item))

  return [...unlocked, ...locked]
})

const DESKTOP_ONLY_ACTIONS: DashboardAction[] = ['website', 'invitation', 'guestList']
const isDesktopOnlyModalOpen = ref(false)
const selectedDesktopOnlyFeature = ref<DashboardItem | null>(null)

const isUpgradeModalOpen = ref(false)
const selectedLockedFeature = ref<DashboardItem | null>(null)

function openUpgradeModal() {
  selectedLockedFeature.value = null
  isUpgradeModalOpen.value = true
}

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
}

const showTasksChecklist = computed(() =>
  isEventFeatureAllowed(eventRecord.value, EVENT_FEATURE.TASKS)
)

function handleDashboardItemClick(item: DashboardItem) {
  isHoverTooltipVisible.value = false
  if (isDashboardItemBlocked(item)) {
    selectedLockedFeature.value = item
    isUpgradeModalOpen.value = true
    return
  }

  if (isMobileViewport() && DESKTOP_ONLY_ACTIONS.includes(item.action)) {
    selectedDesktopOnlyFeature.value = item
    isDesktopOnlyModalOpen.value = true
    return
  }

  if (
    (item.action === 'website' || item.action === 'invitation') &&
    (isEventCancelled.value || (!eventId.value && !isUiOnlyMode.value))
  ) {
    return
  }

  if (item.action === 'website') {
    openWebsiteMaker()
  } else if (item.action === 'invitation') {
    openInvitationMaker()
  } else if (item.action === 'guestList') {
    openGuestList()
  } else if (item.action === 'tasks') {
    openTasksDashboard()
  } else if (item.action === 'rsvp') {
    openRsvpDashboard()
  } else if (item.action === 'settings') {
    openEventSettings()
  } else if (item.action === 'payments') {
    openPayments()
  } else if (item.action === 'schedules') {
    openSchedulesDashboard()
  } else if (item.action === 'wishlist') {
    openWishlistDashboard()
  } else if (item.action === 'playlist') {
    openEventPlaylist()
  } else if (item.action === 'churchRequirements') {
    openChurchRequirementsDashboard()
  } else if (item.action === 'suppliers') {
    openSuppliersDashboard()
  }
}

function handleDashboardItemKeydown(event: KeyboardEvent, item: DashboardItem) {
  if (event.key === 'Enter') {
    handleDashboardItemClick(item)
  }
}

// Hover pop-up tooltip state (Desktop View, cursor tracking, non-blocking click)
const hoveredDashboardItem = ref<DashboardItem | null>(null)
const cursorPosition = ref({ x: 0, y: 0 })
const isHoverTooltipVisible = ref(false)

function onDashboardItemMouseEnter(event: MouseEvent, item: DashboardItem) {
  if (isMobileViewport()) return
  hoveredDashboardItem.value = item
  cursorPosition.value = { x: event.clientX, y: event.clientY }
  isHoverTooltipVisible.value = true
}

function onDashboardItemMouseMove(event: MouseEvent) {
  if (isMobileViewport() || !isHoverTooltipVisible.value) return
  cursorPosition.value = { x: event.clientX, y: event.clientY }
}

function onDashboardItemMouseLeave() {
  isHoverTooltipVisible.value = false
  hoveredDashboardItem.value = null
}

const tooltipPosition = computed(() => {
  const offset = 34
  const x = cursorPosition.value.x
  const y = cursorPosition.value.y

  if (typeof window === 'undefined') {
    return { left: `${x}px`, top: `${y + offset}px`, isFlipped: false }
  }

  const minX = 165
  const maxX = window.innerWidth - 165
  const clampedX = Math.max(minX, Math.min(maxX, x))

  // If cursor is near bottom of viewport, flip above
  const isFlipped = y > window.innerHeight - 150
  const topY = isFlipped ? y - 20 : y + offset

  return {
    left: `${clampedX}px`,
    top: `${topY}px`,
    isFlipped,
  }
})

const planBadgeColor = computed<'warning' | 'primary' | 'neutral' | 'success' | 'error'>(() => {
  // Color-coded based on the event package / price tier (warning for all packages for now)
  const tierName = (typeof eventRecord.value?.priceTier === 'object' ? eventRecord.value?.priceTier?.name : '') || ''
  if (tierName.toLowerCase().includes('portion 1')) return 'warning'
  if (tierName.toLowerCase().includes('portion 2')) return 'warning'
  if (tierName.toLowerCase().includes('portion 3')) return 'warning'
  return 'warning'
})

</script>

<template>
  <UMain :class="showTasksChecklist ? 'bg-toast-50' : 'bg-white'"
    class="h-[calc(100vh-64px)] overflow-hidden flex flex-col">
    <ClientOnly>
      <Teleport to="#event-navbar-actions">
        <div v-if="eventRecord" class="flex items-center gap-2">
          <UButton v-if="isUpgradePending" icon="i-lucide-clock" color="warning" variant="soft" size="sm"
            class="font-semibold" disabled>
            Upgrade pending
          </UButton>
          <UButton v-else icon="i-lucide-sparkles" color="warning" variant="soft" size="sm" class="font-semibold"
            @click="openUpgradeModal">
            Upgrade
          </UButton>
          <UBadge :color="planBadgeColor" variant="solid" size="lg" class="text-black rounded-full shadow-sm">
            {{ formatEventPriceTier(eventRecord) }}
          </UBadge>
        </div>
      </Teleport>
    </ClientOnly>

    <UContainer v-if="isUpgradePending" class="pt-3 shrink-0">
      <UAlert color="warning" variant="subtle" icon="i-lucide-clock" title="Upgrade pending verification" :description="pendingUpgradeTargetName
        ? `Your upgrade to ${pendingUpgradeTargetName} is being reviewed. Your current plan stays active until admin approval.`
        : 'Your upgrade payment is being reviewed. Your current plan stays active until admin approval.'" />
    </UContainer>

    <!-- Layout when Tasks Checklist is active (Butter & Bread + Butter packages) -->
    <UPageGrid v-if="showTasksChecklist" class="h-full overflow-hidden">
      <UContainer class="white-bread-container h-full flex flex-col col-span-2 overflow-hidden"
        style="border-radius: 0;">
        <div class="flex flex-1 items-center justify-center min-h-0 py-2 sm:py-4 px-3 sm:px-4 w-full">
          <div
            class="grid grid-cols-3 gap-x-3 sm:gap-x-6 md:gap-x-8 gap-y-4 sm:gap-y-5 md:gap-y-6 max-w-sm sm:max-w-md md:max-w-lg mx-auto w-full items-center justify-items-center">
            <div v-for="item in dashboardItems" :key="item.label" role="button" :tabindex="0"
              class="group flex flex-col items-center justify-center mx-auto w-full p-1 sm:p-1.5 md:p-2 rounded-xl focus-visible:outline-none text-center cursor-pointer select-none"
              @click="handleDashboardItemClick(item)" @keydown.enter="handleDashboardItemKeydown($event, item)"
              @mouseenter="onDashboardItemMouseEnter($event, item)" @mousemove="onDashboardItemMouseMove($event)"
              @mouseleave="onDashboardItemMouseLeave">
              <div class="relative flex items-center justify-center w-fit mx-auto">
                <div
                  class="size-13 sm:size-15 md:size-16 flex items-center justify-center rounded-full transition-all duration-200 group-focus-visible:ring-2 aspect-square shrink-0 shadow-sm"
                  :class="[
                    item.bgClass,
                    item.ringClass,
                    isDashboardItemBlocked(item)
                      ? 'opacity-70 group-hover:opacity-100 group-hover:scale-105'
                      : [item.hoverClass, 'group-hover:scale-105 group-active:scale-95'],
                  ]">
                  <UIcon :name="item.icon" class="size-6 sm:size-7 md:size-8 text-white shrink-0" />
                </div>
                <div v-if="isDashboardItemBlocked(item)"
                  class="absolute -top-0.5 -right-0.5 bg-amber-500 text-white rounded-full p-1 sm:p-1.5 shadow-md flex items-center justify-center pointer-events-none ring-2 ring-white"
                  title="Upgrade to unlock">
                  <UIcon name="i-lucide-lock" class="size-2.5 sm:size-3.5 block" />
                </div>
              </div>
              <div
                class="font-medium mt-1 sm:mt-1.5 md:mt-2 text-center text-xs sm:text-sm md:text-base leading-tight max-w-20 sm:max-w-none truncate sm:whitespace-normal">
                {{ item.label }}</div>
            </div>
          </div>
        </div>
      </UContainer>

      <!-- Tasks Container (Desktop Only) -->
      <UScrollArea class="hidden md:block h-full py-4 pr-6">
        <UContainer class="space-y-4">
          <UPageCard class="white-bread-container space-y-4 ">
            <div class="flex justify-between items-center">
              <div class="text-xl text-pretty font-semibold text-muted uppercase">Tasks Checklist</div>

              <UModal title="Add New Task" :ui="{
                header: 'bg-toast-400 border-none', title: 'text-white font-serif text-xl',
                content: 'border-none ring-transparent w-1/3',
                overlay: 'bg-toast-900/30'
              }" :close="{
                variant: 'link',
                class: 'rounded-full text-white'
              }" :dismissible="false">
                <UButton icon="i-lucide-list-plus">Add New Task</UButton>
                <template #body>
                  <UForm class="space-y-4">
                    <UFormField label="Task name" name="task-name" required>
                      <UInput class="w-full" placeholder="Set an appointment" />
                    </UFormField>
                    <UFormField label="Description" name="description" required>
                      <UTextarea class="w-full" placeholder="Drop your notes here" />
                    </UFormField>
                    <UFieldGroup class="w-full gap-2">
                      <UFormField label="Priority" name="priority" required class="w-1/2">
                        <USelect :items="taskPriorities" placeholder="Select priority" class="w-full" />
                      </UFormField>
                      <UFormField label="Event Date" name="date" required class="w-1/2">
                        <UPopover>
                          <UButton color="neutral" variant="outline" class="w-full">
                            {{ modelValue ? df.format(modelValue) : 'Select a date' }}
                          </UButton>

                          <template #content="{ close }">
                            <UCalendar v-model="modelValue" class="p-2" @update:model-value="close" />
                          </template>
                        </UPopover>
                      </UFormField>
                    </UFieldGroup>

                    <UFormField class="w-full" label="Supplementary File / Photo">
                      <UFileUpload size="xl" variant="area" label="Drop your image here"
                        description="SVG, PNG, JPG or GIF (max. 2MB)" />
                    </UFormField>
                    <UButton type="submit" block class="mt-4">
                      Add Task
                    </UButton>
                  </UForm>
                </template>
              </UModal>
            </div>

            <UTabs v-model="selectedTab" :items="tabItems" variant="link" :ui="{ content: 'hidden' }" />
          </UPageCard>

          <!-- Content rendering outside the main card container -->
          <div v-show="selectedTab == 0" class="space-y-4">
            <UPageCard v-for="task in todoTasks" :key="task._id" class="white-bread-container">
              <div class="flex justify-between items-start">
                <div class="font-semibold">{{ task.title }}</div>
                <UBadge :color="getPriorityColor(task.priority)" variant="subtle">{{ getPriorityLabel(task.priority) }}
                </UBadge>
              </div>
              <p class="text-sm text-muted mt-1">{{ task.details }}</p>
              <div class="mt-2">
                <UBadge color="neutral" variant="outline" size="sm">
                  <UIcon name="i-lucide-user" class="mr-1 size-3" />
                  {{ getAssigneeLabel(task) }}
                </UBadge>
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                <div class="flex items-center gap-1.5" v-if="task.deadline">
                  <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                  <span>Due: {{ df.format(new Date(task.deadline)) }}</span>
                </div>
              </div>
              <UButton block class="mt-4" :loading="updatingPreviewTaskId === task._id" :disabled="isEventCancelled"
                @click="changeTaskStatus(task, 'ONGOING')">
                Mark as Ongoing
              </UButton>
            </UPageCard>
            <div v-if="todoTasks.length === 0" class="text-sm text-muted text-center py-4">No tasks to do.</div>
          </div>

          <div v-show="selectedTab == 1" class="space-y-4">
            <UPageCard v-for="task in ongoingTasks" :key="task._id" class="white-bread-container">
              <div class="flex justify-between items-start">
                <div class="font-semibold">{{ task.title }}</div>
                <UBadge :color="getPriorityColor(task.priority)" variant="subtle">{{ getPriorityLabel(task.priority) }}
                </UBadge>
              </div>
              <p class="text-sm text-muted mt-1">{{ task.details }}</p>
              <div class="mt-2">
                <UBadge color="neutral" variant="outline" size="sm">
                  <UIcon name="i-lucide-user" class="mr-1 size-3" />
                  {{ getAssigneeLabel(task) }}
                </UBadge>
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                <div class="flex items-center gap-1.5" v-if="task.deadline">
                  <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                  <span>Due: {{ df.format(new Date(task.deadline)) }}</span>
                </div>
              </div>
              <UButton block class="mt-4" :loading="updatingPreviewTaskId === task._id" :disabled="isEventCancelled"
                @click="changeTaskStatus(task, 'COMPLETED')">
                Mark as Complete
              </UButton>
            </UPageCard>
            <div v-if="ongoingTasks.length === 0" class="text-sm text-muted text-center py-4">No ongoing tasks.</div>
          </div>

          <div v-show="selectedTab == 2" class="space-y-4">
            <UPageCard v-for="task in completedTasks" :key="task._id" class="white-bread-container">
              <div class="flex justify-between items-start">
                <div class="font-semibold">{{ task.title }}</div>
                <UBadge :color="getPriorityColor(task.priority)" variant="subtle">{{ getPriorityLabel(task.priority) }}
                </UBadge>
              </div>
              <p class="text-sm text-muted mt-1">{{ task.details }}</p>
              <div class="mt-2">
                <UBadge color="neutral" variant="outline" size="sm">
                  <UIcon name="i-lucide-user" class="mr-1 size-3" />
                  {{ getAssigneeLabel(task) }}
                </UBadge>
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                <div class="flex items-center gap-1.5" v-if="task.deadline">
                  <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                  <span>Completed: {{ df.format(new Date(task.deadline)) }}</span>
                </div>
              </div>
              <UButton block class="mt-4" variant="outline" color="neutral"
                :loading="updatingPreviewTaskId === task._id" :disabled="isEventCancelled"
                @click="changeTaskStatus(task, 'ONGOING')">
                Mark as Ongoing
              </UButton>
            </UPageCard>
            <div v-if="completedTasks.length === 0" class="text-sm text-muted text-center py-4">No completed tasks.
            </div>
          </div>
        </UContainer>
      </UScrollArea>
    </UPageGrid>

    <!-- Layout when package is Bread (No container card, clean background, exact position retained) -->
    <div v-else class="flex flex-1 items-center justify-center h-full overflow-hidden py-2 sm:py-4 px-3 sm:px-4 w-full">
      <div
        class="grid grid-cols-3 gap-x-3 sm:gap-x-6 md:gap-x-8 gap-y-4 sm:gap-y-5 md:gap-y-6 max-w-sm sm:max-w-md md:max-w-lg mx-auto w-full items-center justify-items-center">
        <div v-for="item in dashboardItems" :key="item.label" role="button" :tabindex="0"
          class="group flex flex-col items-center justify-center mx-auto w-full p-1 sm:p-1.5 md:p-2 rounded-xl focus-visible:outline-none text-center cursor-pointer select-none"
          @click="handleDashboardItemClick(item)" @keydown.enter="handleDashboardItemKeydown($event, item)"
          @mouseenter="onDashboardItemMouseEnter($event, item)" @mousemove="onDashboardItemMouseMove($event)"
          @mouseleave="onDashboardItemMouseLeave">
          <div class="relative flex items-center justify-center w-fit mx-auto">
            <div
              class="size-13 sm:size-15 md:size-16 flex items-center justify-center rounded-full transition-all duration-200 group-focus-visible:ring-2 aspect-square shrink-0 shadow-sm"
              :class="[
                item.bgClass,
                item.ringClass,
                isDashboardItemBlocked(item)
                  ? 'opacity-70 group-hover:opacity-100 group-hover:scale-105'
                  : [item.hoverClass, 'group-hover:scale-105 group-active:scale-95'],
              ]">
              <UIcon :name="item.icon" class="size-6 sm:size-7 md:size-8 text-white shrink-0" />
            </div>
            <div v-if="isDashboardItemBlocked(item)"
              class="absolute -top-0.5 -right-0.5 bg-amber-500 text-white rounded-full p-1 sm:p-1.5 shadow-md flex items-center justify-center pointer-events-none ring-2 ring-white"
              title="Upgrade to unlock">
              <UIcon name="i-lucide-lock" class="size-2.5 sm:size-3.5 block" />
            </div>
          </div>
          <div
            class="font-medium mt-1 sm:mt-1.5 md:mt-2 text-center text-xs sm:text-sm md:text-base leading-tight max-w-20 sm:max-w-none truncate sm:whitespace-normal">
            {{ item.label }}</div>
        </div>
      </div>
    </div>

    <!-- Desktop Only Feature Notice Modal (Mobile View) -->
    <UModal v-model:open="isDesktopOnlyModalOpen" :ui="{
      content: 'bread-container max-w-md p-6 space-y-5',
      overlay: 'bg-toast-950/40 backdrop-blur-xs'
    }">
      <template #content>
        <div class="space-y-5 text-toast-900">
          <!-- Header -->
          <div class="space-y-3 text-center">
            <div class="flex justify-between items-start">
              <div class="w-8"></div>
              <div
                class="w-14 h-14 rounded-full bg-toast-600/10 text-toast-700 flex items-center justify-center mx-auto shadow-xs">
                <UIcon name="i-lucide-monitor" class="size-7 text-toast-700" />
              </div>
              <div class="w-8 flex justify-end">
                <UButton icon="i-lucide-x" variant="link" color="neutral"
                  @click="() => { isDesktopOnlyModalOpen = false }" />
              </div>
            </div>

            <div class="space-y-1.5">
              <h3 class="text-xl font-bold font-serif text-toast-900">
                Desktop View Required
              </h3>
              <p class="text-xs sm:text-sm text-toast-800/80 max-w-xs mx-auto leading-relaxed">
                The <span class="font-bold text-toast-900">{{ selectedDesktopOnlyFeature?.label }}</span> feature
                requires a desktop or laptop display due to extensive layouts, design canvases, and data tables that
                cannot be comfortably navigated on mobile screens.
              </p>
            </div>
          </div>

          <!-- Feature Highlight Card -->
          <div class="bg-white/80 border border-toast-300/40 rounded-xl p-3.5 flex items-center gap-3">
            <div class="size-10 rounded-full flex items-center justify-center shrink-0 shadow-xs"
              :class="selectedDesktopOnlyFeature?.bgClass || 'bg-toast-600'">
              <UIcon :name="selectedDesktopOnlyFeature?.icon || 'i-lucide-sparkles'" class="size-5 text-white" />
            </div>
            <div class="text-left flex-1 min-w-0">
              <div class="font-semibold text-sm text-toast-900 truncate">{{ selectedDesktopOnlyFeature?.label }}</div>
              <div class="text-xs text-toast-700/80 leading-tight mt-0.5">
                {{
                  selectedDesktopOnlyFeature?.action === 'website'
                    ? 'Visual website editor, theme customizer & live canvas'
                    : selectedDesktopOnlyFeature?.action === 'invitation'
                      ? 'Card layout designer, typography controls & preview'
                      : 'Comprehensive guest seating arrangement & group tables'
                }}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="pt-1">
            <UButton block color="primary" size="md"
              class="font-bold shadow-sm bg-toast-600 hover:bg-toast-700 text-white"
              @click="() => { isDesktopOnlyModalOpen = false }">
              Understood
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Upgrade Pop-up Modal for Locked Items -->
    <EventUpgradeModal v-model:open="isUpgradeModalOpen" :item="selectedLockedFeature" :event="eventRecord"
      :event-id="eventId" />
    <!-- Desktop Hover Tooltip Pop-up (Positioned directly below cursor, non-blocking click) -->
    <ClientOnly>
      <Teleport to="body">
        <Transition enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 translate-y-1 scale-95" enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 translate-y-1 scale-95">
          <div v-if="isHoverTooltipVisible && hoveredDashboardItem" id="dashboard-item-cursor-tooltip" role="tooltip"
            aria-hidden="true" class="hidden md:block fixed z-9999 pointer-events-none select-none max-w-72 sm:max-w-80"
            :style="{
              left: tooltipPosition.left,
              top: tooltipPosition.top,
              transform: tooltipPosition.isFlipped ? 'translate(-50%, -100%)' : 'translateX(-50%)',
            }">
            <div class="relative rounded-xl bg-toast-500 text-bread-50 p-3.5 shadow-xl ring-1 ring-white/20">
              <!-- Small pointer indicator towards cursor -->
              <div v-if="!tooltipPosition.isFlipped"
                class="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-toast-500 rotate-45 border-t border-l border-white/20" />
              <div v-else
                class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-toast-500 rotate-45 border-b border-r border-white/20" />

              <div class="flex items-center gap-2.5 mb-2">
                <div class="size-6.5 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                  :class="hoveredDashboardItem.bgClass">
                  <UIcon :name="hoveredDashboardItem.icon" class="size-4 text-white" />
                </div>
                <div class="font-semibold text-sm tracking-wide text-white flex-1 truncate">
                  {{ hoveredDashboardItem.label }}
                </div>
                <UBadge v-if="isDashboardItemBlocked(hoveredDashboardItem)" color="warning" variant="solid" size="xs"
                  class="text-xs py-0.5 px-1.5 font-medium text-toast-950">
                  Locked
                </UBadge>
              </div>
              <p class="text-sm text-bread-100/95 leading-relaxed">
                {{ hoveredDashboardItem.description }}
              </p>
            </div>
          </div>
        </Transition>
      </Teleport>
    </ClientOnly>
  </UMain>

</template>

<style></style>
