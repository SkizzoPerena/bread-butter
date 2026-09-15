<script lang="ts" setup>
import { DateFormatter } from '@internationalized/date'
import type {
  ChartSlice,
  EventRecord,
  SelectedEventDetail,
  TasksSummary,
  GuestRecord,
  RsvpSummary,
} from '~/types/event'
import { isWeddingEventType, formatEventPriceTier } from '~/types/event'
import { reportApiError } from '~/types/auth'
import {
  isEventFullyPaid,
  isTierUpgradePending,
  getPendingUpgradeTargetName,
} from '~/types/payment'
import {
  type DashboardAction,
  getAllowedFeaturesForEvent,
  isDashboardActionAllowed,
  resolveEventTierCode,
  resolveEventDashboardPath,
} from '~/utils/eventTierFeatures'

definePageMeta({
  layout: 'event-navbar',
})

const toast = useToast()
const route = useRoute()
const { fetchEvent, getCachedEvent } = useEvents()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()

const df = new DateFormatter('en-US', {
  dateStyle: 'medium',
})

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const tasksSummary = ref<TasksSummary | null>(null)
const guestList = ref<GuestRecord[]>([])
const rsvpSummary = ref<RsvpSummary | null>(null)
const isLoadingEvent = ref(false)

const isUpgradePending = computed(() => isTierUpgradePending(eventRecord.value))
const pendingUpgradeTargetName = computed(() => getPendingUpgradeTargetName(eventRecord.value))
const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')
const isWeddingEvent = computed(() =>
  isWeddingEventType(eventRecord.value?.eventType ?? 'WEDDING')
)

const isButterTier = computed(() => {
  if (!eventRecord.value) return false
  return resolveEventTierCode(eventRecord.value) === 'BUTTER'
})

async function loadEventData() {
  if (eventId.value) {
    const cached = getCachedEvent(eventId.value)
    if (cached) {
      const cachedTier = resolveEventTierCode(cached)
      if (cachedTier === 'BREAD') {
        await navigateTo({ path: '/event/dashboard-bread', query: route.query }, { replace: true })
        return
      }
      const targetPath = resolveEventDashboardPath(cached)
      if (route.path !== targetPath && (route.path === '/user/event-dashboard' || route.path === '/event/dashboard-butter' || route.path === '/event/dashboard-bread-butter')) {
        await navigateTo({ path: targetPath, query: route.query }, { replace: true })
        return
      }
    }
  }

  if (!eventId.value && !isUiOnlyMode.value) {
    // Set fallback display in event navbar
    setActiveEvent({
      _id: 'mock-event-id',
      eventName: "Jane & John's Wedding",
    })
    return
  }

  isLoadingEvent.value = true
  try {
    const detail = await loadPageData<SelectedEventDetail>({
      mock: () => ({
        event: {
          _id: 'mock-event-id',
          eventType: 'WEDDING',
          eventName: "Jane & John's Wedding",
          description: 'Mock event',
          venue: 'Manila Cathedral & Palacio de Memoria',
          eventDate: '2026-05-18T00:00:00.000Z',
          status: 'ONGOING',
          coverImageURL: null,
          latestPayment: null,
          priceTier: {
            _id: 'mock-tier-id',
            code: 'bread_butter',
            name: 'Bread + Butter',
            pricePhp: 10000,
            isEnabled: true,
          },
          tierPricePhp: 10000,
          allowedFeatures: getAllowedFeaturesForEvent({
            priceTier: {
              _id: 'mock-tier-id',
              code: 'bread_butter',
              name: 'Bread + Butter',
              pricePhp: 10000,
              isEnabled: true,
            },
            tierPricePhp: 10000,
          }),
        },
        guestList: [],
        rsvpSummary: null,
        tasks: {
          totalTasks: 21,
          byStatus: {
            'not-started': 4,
            waiting: 2,
            'in-progress': 6,
            'on-hold': 1,
            completed: 8,
          },
          preview: {
            page: 1,
            limit: 5,
            subtasksLimit: 2,
            tasks: [],
          },
        },
      }),
      fetch: async () => fetchEvent(eventId.value, true),
    })

    if (detail.event) {
      const tier = resolveEventTierCode(detail.event)
      if (tier === 'BREAD') {
        await navigateTo({ path: '/event/dashboard-bread', query: route.query }, { replace: true })
        return
      }
      const targetPath = resolveEventDashboardPath(detail.event)
      if (route.path !== targetPath && (route.path === '/user/event-dashboard' || route.path === '/event/dashboard-butter' || route.path === '/event/dashboard-bread-butter')) {
        await navigateTo({ path: targetPath, query: route.query }, { replace: true })
        return
      }
    }

    eventRecord.value = detail.event
    setActiveEvent(detail.event)
    tasksSummary.value = detail.tasks
    guestList.value = detail.guestList || []
    rsvpSummary.value = detail.rsvpSummary || null
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

// 1. Topmost Container Metrics
const eventDateFormatted = computed(() => {
  if (eventRecord.value?.eventDate) {
    return df.format(new Date(eventRecord.value.eventDate))
  }
  return 'May 18, 2026'
})

const daysRemaining = computed(() => {
  if (eventRecord.value?.eventDate) {
    const diff = new Date(eventRecord.value.eventDate).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }
  return 64
})

const priceTierLabel = computed(() => {
  if (eventRecord.value) {
    return formatEventPriceTier(eventRecord.value)
  }
  return 'Bread + Butter'
})

const tierPrice = computed(() => {
  if (typeof eventRecord.value?.tierPricePhp === 'number') {
    return eventRecord.value.tierPricePhp
  }
  if (typeof eventRecord.value?.priceTier === 'object' && eventRecord.value.priceTier?.pricePhp) {
    return eventRecord.value.priceTier.pricePhp
  }
  return 10000
})

const amountPaid = computed(() => {
  if (eventRecord.value) {
    if (isEventFullyPaid(eventRecord.value)) return tierPrice.value
    if (typeof eventRecord.value.latestPayment?.amount === 'number') {
      return eventRecord.value.latestPayment.amount
    }
  }
  return 6500
})

const balanceDue = computed(() => {
  return Math.max(0, tierPrice.value - amountPaid.value)
})

// 2. Tasks & 5-Status Breakdown
const taskStatusBreakdown = computed(() => {
  const byStatus = tasksSummary.value?.byStatus
  if (byStatus && Object.keys(byStatus).length > 0) {
    const notStarted = byStatus['not-started'] ?? byStatus.TODO ?? 4
    const waiting = byStatus.waiting ?? 2
    const inProgress = byStatus['in-progress'] ?? byStatus.ONGOING ?? 6
    const onHold = byStatus['on-hold'] ?? 1
    const completed = byStatus.completed ?? byStatus.COMPLETED ?? 8

    return [
      { key: 'not-started', label: 'Not Started', count: notStarted, colorClass: 'bg-slate-500', color: 'bg-slate-500', hex: '#64748b' },
      { key: 'waiting', label: 'Waiting', count: waiting, colorClass: 'bg-orange-500', color: 'bg-orange-500', hex: '#f97316' },
      { key: 'in-progress', label: 'In Progress', count: inProgress, colorClass: 'bg-blue-500', color: 'bg-blue-500', hex: '#3b82f6' },
      { key: 'on-hold', label: 'On Hold', count: onHold, colorClass: 'bg-yellow-500', color: 'bg-yellow-500', hex: '#eab308' },
      { key: 'completed', label: 'Completed', count: completed, colorClass: 'bg-green-500', color: 'bg-green-500', hex: '#00C16A' },
    ]
  }
  return [
    { key: 'not-started', label: 'Not Started', count: 4, colorClass: 'bg-slate-500', color: 'bg-slate-500', hex: '#64748b' },
    { key: 'waiting', label: 'Waiting', count: 2, colorClass: 'bg-orange-500', color: 'bg-orange-500', hex: '#f97316' },
    { key: 'in-progress', label: 'In Progress', count: 6, colorClass: 'bg-blue-500', color: 'bg-blue-500', hex: '#3b82f6' },
    { key: 'on-hold', label: 'On Hold', count: 1, colorClass: 'bg-yellow-500', color: 'bg-yellow-500', hex: '#eab308' },
    { key: 'completed', label: 'Completed', count: 8, colorClass: 'bg-green-500', color: 'bg-green-500', hex: '#00C16A' },
  ]
})

const totalTasks = computed(() => {
  return taskStatusBreakdown.value.reduce((sum, item) => sum + item.count, 0)
})

const completedTasksCount = computed(() => {
  return taskStatusBreakdown.value.find((s) => s.key === 'completed')?.count ?? 8
})

const taskCompletionPercent = computed(() => {
  if (totalTasks.value === 0) return 0
  return Math.round((completedTasksCount.value / totalTasks.value) * 100)
})

const taskStatusChartData = computed<ChartSlice[]>(() => {
  return taskStatusBreakdown.value.map((s) => ({
    label: s.label,
    value: s.count,
  }))
})

const TASK_STATUS_COLORS = computed(() => {
  return taskStatusBreakdown.value.map((s) => s.hex)
})

// 3. Guests & RSVP Metrics
const confirmedGuestsCount = computed(() => {
  if (rsvpSummary.value?.going) return rsvpSummary.value.going
  if (guestList.value.length > 0) {
    const count = guestList.value.filter((g) => g.rsvp?.status === 'GOING').length
    if (count > 0) return count
  }
  return 84
})

const totalInvitedCount = computed(() => {
  if (rsvpSummary.value?.totalSent) return rsvpSummary.value.totalSent
  if (guestList.value.length > 0) return guestList.value.length
  return 120
})

const rsvpResponseRate = computed(() => {
  if (rsvpSummary.value && totalInvitedCount.value > 0) {
    const responded = (rsvpSummary.value.going || 0) + (rsvpSummary.value.notGoing || 0)
    return Math.round((responded / totalInvitedCount.value) * 100)
  }
  return 80
})

// 4. Financial Snapshot Metrics
const targetBudget = computed(() => 850000)
const forecastSpend = computed(() => 810000)
const budgetRemaining = computed(() => Math.max(0, targetBudget.value - amountPaid.value))
const remainingPayable = computed(() => Math.max(0, forecastSpend.value - amountPaid.value))

const budgetUsedPercent = computed(() => {
  if (targetBudget.value === 0) return 0
  return Math.round((amountPaid.value / targetBudget.value) * 100)
})

const budgetStatus = computed(() => {
  if (forecastSpend.value <= targetBudget.value) {
    return {
      label: 'Within Budget',
      color: 'success' as const,
    }
  }
  return {
    label: 'Over Budget',
    color: 'error' as const,
  }
})

// 5. Planning Health Metrics
const overdueTasksCount = computed(() => {
  if (tasksSummary.value?.preview?.tasks) {
    const now = new Date()
    const overdue = tasksSummary.value.preview.tasks.filter((t) =>
      t.deadline && new Date(t.deadline) < now && t.status !== 'COMPLETED'
    )
    if (overdue.length > 0) return overdue.length
  }
  return 0
})

const overdueTasksCountText = computed(() => {
  return overdueTasksCount.value === 0
    ? '0 Tasks'
    : `${overdueTasksCount.value} Tasks`
})

const onTrackTasksCount = computed(() => {
  return Math.max(0, totalTasks.value - overdueTasksCount.value)
})

const onTrackTasksPercent = computed(() => {
  if (totalTasks.value === 0) return 100
  return Math.round((onTrackTasksCount.value / totalTasks.value) * 100)
})

const totalConfirmedGuests = computed(() => confirmedGuestsCount.value)

const guestsWithoutTables = computed(() => {
  if (guestList.value.length > 0) {
    return guestList.value.filter((g) => !g.tableCode).length
  }
  return 12
})

const seatedGuestsCount = computed(() => {
  return Math.max(0, totalConfirmedGuests.value - guestsWithoutTables.value)
})

const guestsSeatedPercent = computed(() => {
  if (totalConfirmedGuests.value === 0) return 0
  return Math.round((seatedGuestsCount.value / totalConfirmedGuests.value) * 100)
})

const totalRequirements = computed(() => {
  if (eventRecord.value?.questions && eventRecord.value.questions.length > 0) {
    return eventRecord.value.questions.length
  }
  return 10
})

const completedRequirements = computed(() => 8)

const requirementsCompletionPercent = computed(() => {
  if (totalRequirements.value === 0) return 0
  return Math.round((completedRequirements.value / totalRequirements.value) * 100)
})

const planningHealthStatus = computed(() => {
  if (overdueTasksCount.value === 0) {
    return {
      label: 'Healthy',
      color: 'success' as const,
    }
  }
  return {
    label: 'Attention',
    color: 'error' as const,
  }
})

// 6. Quick Navigation Items & Feature Gating
type QuickNavItem = {
  label: string
  icon: string
  action: DashboardAction
  description: string
  weddingOnly?: boolean
  bgClass: string
  hoverClass: string
  ringClass: string
  textClass: string
}

const QUICK_NAV_ITEMS: QuickNavItem[] = [
  {
    label: 'Website',
    icon: 'i-lucide-globe',
    action: 'website',
    description: 'Design and publish your personalized wedding website.',
    bgClass: 'bg-blue-500/10',
    hoverClass: 'group-hover:bg-blue-500/20',
    ringClass: 'ring-1 ring-inset ring-blue-500/25 group-focus-visible:ring-2 group-focus-visible:ring-blue-500',
    textClass: 'text-blue-600',
  },
  {
    label: 'Invitation',
    icon: 'i-lucide-send',
    action: 'invitation',
    description: 'Create elegant digital invites and distribute via email.',
    bgClass: 'bg-violet-500/10',
    hoverClass: 'group-hover:bg-violet-500/20',
    ringClass: 'ring-1 ring-inset ring-violet-500/25 group-focus-visible:ring-2 group-focus-visible:ring-violet-500',
    textClass: 'text-violet-600',
  },
  {
    label: 'RSVP',
    icon: 'i-lucide-mail',
    action: 'rsvp',
    description: 'Track guest responses, attendance headcounts, and meals.',
    bgClass: 'bg-teal-500/10',
    hoverClass: 'group-hover:bg-teal-500/20',
    ringClass: 'ring-1 ring-inset ring-teal-500/25 group-focus-visible:ring-2 group-focus-visible:ring-teal-500',
    textClass: 'text-teal-600',
  },
  {
    label: 'Guest List',
    icon: 'i-lucide-users',
    action: 'guestList',
    description: 'Manage guest contacts, tables, and dietary preferences.',
    bgClass: 'bg-orange-500/10',
    hoverClass: 'group-hover:bg-orange-500/20',
    ringClass: 'ring-1 ring-inset ring-orange-500/25 group-focus-visible:ring-2 group-focus-visible:ring-orange-500',
    textClass: 'text-orange-600',
  },
  {
    label: 'Gifts',
    icon: 'i-lucide-gift',
    action: 'wishlist',
    description: 'Organize wishlists, gift registry links, and monetary gifts.',
    bgClass: 'bg-pink-500/10',
    hoverClass: 'group-hover:bg-pink-500/20',
    ringClass: 'ring-1 ring-inset ring-pink-500/25 group-focus-visible:ring-2 group-focus-visible:ring-pink-500',
    textClass: 'text-pink-600',
  },
  {
    label: 'Playlist',
    icon: 'i-lucide-music',
    action: 'playlist',
    description: 'Curate reception tunes, entry songs, and dance tracks.',
    bgClass: 'bg-lime-500/15',
    hoverClass: 'group-hover:bg-lime-500/25',
    ringClass: 'ring-1 ring-inset ring-lime-600/30 group-focus-visible:ring-2 group-focus-visible:ring-lime-600',
    textClass: 'text-lime-700',
  },
  {
    label: 'Tasks',
    icon: 'i-lucide-list-todo',
    action: 'tasks',
    description: 'Checklist of milestones, deadlines, and responsibilities.',
    bgClass: 'bg-red-500/10',
    hoverClass: 'group-hover:bg-red-500/20',
    ringClass: 'ring-1 ring-inset ring-red-500/25 group-focus-visible:ring-2 group-focus-visible:ring-red-500',
    textClass: 'text-red-600',
  },
  {
    label: 'Schedules',
    icon: 'i-lucide-calendar',
    action: 'schedules',
    description: 'Coordinate day-of itineraries and ceremony schedules.',
    bgClass: 'bg-cyan-500/10',
    hoverClass: 'group-hover:bg-cyan-500/20',
    ringClass: 'ring-1 ring-inset ring-cyan-500/25 group-focus-visible:ring-2 group-focus-visible:ring-cyan-500',
    textClass: 'text-cyan-700',
  },
  {
    label: 'Suppliers',
    icon: 'i-lucide-briefcase',
    action: 'suppliers',
    description: 'Manage photographer, caterer, and florist contacts.',
    bgClass: 'bg-fuchsia-500/10',
    hoverClass: 'group-hover:bg-fuchsia-500/20',
    ringClass: 'ring-1 ring-inset ring-fuchsia-500/25 group-focus-visible:ring-2 group-focus-visible:ring-fuchsia-500',
    textClass: 'text-fuchsia-600',
  },
  {
    label: 'Requirements',
    icon: 'i-lucide-church',
    action: 'churchRequirements',
    weddingOnly: true,
    description: 'Track canonical and legal document submissions.',
    bgClass: 'bg-yellow-500/15',
    hoverClass: 'group-hover:bg-yellow-500/25',
    ringClass: 'ring-1 ring-inset ring-yellow-600/30 group-focus-visible:ring-2 group-focus-visible:ring-yellow-600',
    textClass: 'text-yellow-700',
  },
  {
    label: 'Payments',
    icon: 'i-lucide-credit-card',
    action: 'payments',
    description: 'Review invoice balance, payment proofs, and tiers.',
    bgClass: 'bg-emerald-500/10',
    hoverClass: 'group-hover:bg-emerald-500/20',
    ringClass: 'ring-1 ring-inset ring-emerald-500/25 group-focus-visible:ring-2 group-focus-visible:ring-emerald-500',
    textClass: 'text-emerald-600',
  },
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    action: 'settings',
    description: 'Configure event preferences and permissions.',
    bgClass: 'bg-slate-500/10',
    hoverClass: 'group-hover:bg-slate-500/20',
    ringClass: 'ring-1 ring-inset ring-slate-500/25 group-focus-visible:ring-2 group-focus-visible:ring-slate-500',
    textClass: 'text-slate-600',
  },
]

function isDashboardItemBlocked(item: QuickNavItem): boolean {
  if (item.action === 'settings') {
    return false
  }
  if (!eventRecord.value && isUiOnlyMode.value) {
    return false
  }
  return !isDashboardActionAllowed(eventRecord.value, item.action)
}

function getActiveEventQueryId(): string {
  return eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
}

function openWebsiteMaker() {
  if (isEventCancelled.value) return
  const id = getActiveEventQueryId()
  if (!id) {
    toast.add({ title: 'Missing event', description: 'Open an event from your dashboard first.', color: 'error' })
    return
  }
  navigateTo({ path: '/website-maker', query: { eventId: id } })
}

function openInvitationMaker() {
  if (isEventCancelled.value) return
  const id = getActiveEventQueryId()
  if (!id) {
    toast.add({ title: 'Missing event', description: 'Open an event from your dashboard first.', color: 'error' })
    return
  }
  navigateTo({ path: '/invitation-maker', query: { eventId: id } })
}

function openGuestList() {
  const id = getActiveEventQueryId()
  if (!id) {
    toast.add({ title: 'Missing event', description: 'Open an event from your dashboard first.', color: 'error' })
    return
  }
  navigateTo({ path: '/event/guests', query: { eventId: id } })
}

function openTasksDashboard() {
  const id = getActiveEventQueryId()
  if (!id) {
    toast.add({ title: 'Missing event', description: 'Open an event from your dashboard first.', color: 'error' })
    return
  }
  navigateTo({ path: '/event/tasks', query: { eventId: id } })
}

function openRsvpDashboard() {
  const id = getActiveEventQueryId()
  if (!id) {
    toast.add({ title: 'Missing event', description: 'Open an event from your dashboard first.', color: 'error' })
    return
  }
  navigateTo({ path: '/event/rsvp', query: { eventId: id } })
}

function openEventSettings() {
  const id = getActiveEventQueryId()
  if (!id) {
    toast.add({ title: 'Missing event', description: 'Open an event from your dashboard first.', color: 'error' })
    return
  }
  navigateTo({ path: '/event/settings', query: { eventId: id } })
}

function openPayments() {
  const id = getActiveEventQueryId()
  if (!id) {
    toast.add({ title: 'Missing event', description: 'Open an event from your dashboard first.', color: 'error' })
    return
  }
  navigateTo({ path: '/event/payment-review', query: { eventId: id } })
}

function openSchedulesDashboard() {
  const id = getActiveEventQueryId()
  if (!id) {
    toast.add({ title: 'Missing event', description: 'Open an event from your dashboard first.', color: 'error' })
    return
  }
  navigateTo({ path: '/event/schedules', query: { eventId: id } })
}

function openWishlistDashboard() {
  const id = getActiveEventQueryId()
  if (!id) {
    toast.add({ title: 'Missing event', description: 'Open an event from your dashboard first.', color: 'error' })
    return
  }
  navigateTo({ path: '/event/wishlist', query: { eventId: id } })
}

function openEventPlaylist() {
  const id = getActiveEventQueryId()
  if (!id) {
    toast.add({ title: 'Missing event', description: 'Open an event from your dashboard first.', color: 'error' })
    return
  }
  navigateTo({ path: '/event/playlist', query: { eventId: id } })
}

function openChurchRequirementsDashboard() {
  const id = getActiveEventQueryId()
  if (!id) {
    toast.add({ title: 'Missing event', description: 'Open an event from your dashboard first.', color: 'error' })
    return
  }
  navigateTo({ path: '/event/requirements', query: { eventId: id } })
}

function openSuppliersDashboard() {
  const id = getActiveEventQueryId()
  if (!id) {
    toast.add({ title: 'Missing event', description: 'Open an event from your dashboard first.', color: 'error' })
    return
  }
  navigateTo({ path: '/event/suppliers', query: { eventId: id } })
}

function openUpgradePage() {
  const id = getActiveEventQueryId()
  if (!id) {
    toast.add({ title: 'Missing event', description: 'Open an event from your dashboard first.', color: 'error' })
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

const DESKTOP_ONLY_ACTIONS: DashboardAction[] = ['website', 'invitation', 'guestList']
const isDesktopOnlyModalOpen = ref(false)
const selectedDesktopOnlyFeature = ref<QuickNavItem | null>(null)

const isUpgradeModalOpen = ref(false)
const selectedLockedFeature = ref<QuickNavItem | null>(null)

function openUpgradeModal() {
  selectedLockedFeature.value = null
  isUpgradeModalOpen.value = true
}

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
}

function navigateFromModal(item: QuickNavItem | null) {
  if (!item) return
  if (item.action === 'website') openWebsiteMaker()
  else if (item.action === 'invitation') openInvitationMaker()
  else if (item.action === 'guestList') openGuestList()
}

function onQuickNavItemClick(item: QuickNavItem) {
  isHoverTooltipVisible.value = false
  hoveredDashboardItem.value = null

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

  switch (item.action) {
    case 'website':
      openWebsiteMaker()
      break
    case 'invitation':
      openInvitationMaker()
      break
    case 'guestList':
      openGuestList()
      break
    case 'tasks':
      openTasksDashboard()
      break
    case 'rsvp':
      openRsvpDashboard()
      break
    case 'settings':
      openEventSettings()
      break
    case 'payments':
      openPayments()
      break
    case 'schedules':
      openSchedulesDashboard()
      break
    case 'wishlist':
      openWishlistDashboard()
      break
    case 'playlist':
      openEventPlaylist()
      break
    case 'churchRequirements':
      openChurchRequirementsDashboard()
      break
    case 'suppliers':
      openSuppliersDashboard()
      break
  }
}

// Hover pop-up tooltip state (Desktop View, cursor tracking, non-blocking click)
const hoveredDashboardItem = ref<QuickNavItem | null>(null)
const cursorPosition = ref({ x: 0, y: 0 })
const isHoverTooltipVisible = ref(false)

function onDashboardItemMouseEnter(event: MouseEvent, item: QuickNavItem) {
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
  const x = cursorPosition.value.x
  const y = cursorPosition.value.y

  if (typeof window === 'undefined') {
    return { left: `${x - 18}px`, top: `${y}px`, arrowTop: '50%' }
  }

  const minY = 85
  const maxY = window.innerHeight - 85
  const clampedY = Math.max(minY, Math.min(maxY, y))
  const arrowOffset = Math.max(-45, Math.min(45, y - clampedY))

  return {
    left: `${x - 18}px`,
    top: `${clampedY}px`,
    arrowTop: `calc(50% + ${arrowOffset}px)`,
  }
})

function getQuickNavSolidBgClass(item: QuickNavItem): string {
  const map: Record<string, string> = {
    Website: 'bg-blue-500',
    Invitation: 'bg-violet-500',
    RSVP: 'bg-teal-500',
    'Guest List': 'bg-orange-500',
    Gifts: 'bg-pink-500',
    Playlist: 'bg-lime-500',
    Tasks: 'bg-red-500',
    Schedules: 'bg-cyan-500',
    Suppliers: 'bg-fuchsia-500',
    Requirements: 'bg-yellow-500',
    Payments: 'bg-emerald-500',
    Settings: 'bg-slate-500',
  }
  return map[item.label] || 'bg-toast-600'
}
</script>

<template>
  <div class="h-[calc(100vh-64px)] flex flex-col w-full bg-bread-400 overflow-y-auto lg:overflow-hidden">
    <!-- Navbar Actions Teleport -->
    <ClientOnly>
      <Teleport to="#event-navbar-actions">
        <div class="flex items-center gap-2">
          <UButton v-if="isUpgradePending" icon="i-lucide-clock" color="warning" variant="soft" size="sm"
            class="font-semibold" disabled>
            Upgrade pending
          </UButton>
          <UButton v-else-if="isButterTier" icon="i-lucide-sparkles" color="warning" variant="soft" size="sm"
            class="font-semibold text-black" @click="openUpgradeModal">
            Upgrade
          </UButton>
          <UBadge color="warning" variant="solid" size="xl" class="text-black rounded-full shadow-sm font-medium">
            {{ priceTierLabel }}
          </UBadge>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- Main UPageGrid Layout: 3:1 column split (Integrated Shell with Independent Left Scroll) -->
    <UPageGrid class="grid-cols-1 lg:grid-cols-4 gap-0 w-full flex-1 lg:h-full lg:overflow-hidden items-stretch">
      <!-- ================= LEFT DIVISION: col-span-3 (Workspace, fits screen without scrollbars) ================= -->
      <section
        class="lg:col-span-3 p-3 sm:p-3.5 lg:p-4 flex flex-col gap-3.5 sm:gap-4 bg-toast-50/20 h-full overflow-y-auto lg:overflow-hidden justify-between">
        <!-- 1. Topmost Container: 4 Columns -->
        <div class="white-bread-container p-3 sm:p-3.5 lg:p-4 shadow-sm shrink-0">
          <div
            class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-bread-200/60">
            <!-- Column 1: Days to Event -->
            <div class="space-y-1 pt-1 sm:pt-0 sm:pr-3">
              <div class="flex items-center gap-1 text-muted text-xs font-medium">
                <span>Days to Event</span>
                <UIcon name="i-lucide-calendar-heart" class="size-3.5 text-red-500 shrink-0" />
              </div>
              <div class="text-xl sm:text-2xl font-bold font-serif text-highlighted tracking-tight">
                {{ daysRemaining }} Days
              </div>
              <div class="text-[10px] sm:text-[11px] text-muted truncate">
                {{ eventDateFormatted }}
              </div>
            </div>

            <!-- Column 2: Task Completion -->
            <div class="space-y-1 pt-1 sm:pt-0 sm:px-3">
              <div class="flex items-center gap-1 text-muted text-xs font-medium">
                <span>Task Completion</span>
                <UIcon name="i-lucide-check-circle-2" class="size-3.5 text-green-500 shrink-0" />
              </div>
              <div class="text-xl sm:text-2xl font-bold font-serif text-highlighted tracking-tight">
                {{ taskCompletionPercent }}%
              </div>
              <div class="flex items-center gap-1.5">
                <UProgress :model-value="taskCompletionPercent" color="success" size="2xs" class="flex-1" />
                <span class="text-[10px] text-muted whitespace-nowrap">{{ completedTasksCount }}/{{ totalTasks }}</span>
              </div>
            </div>

            <!-- Column 3: Confirmed Guests -->
            <div class="space-y-1 pt-1 sm:pt-0 sm:px-3">
              <div class="flex items-center gap-1 text-muted text-xs font-medium">
                <span>Confirmed Guests</span>
                <UIcon name="i-lucide-users" class="size-3.5 text-teal-500 shrink-0" />
              </div>
              <div class="text-xl sm:text-2xl font-bold font-serif text-highlighted tracking-tight">
                {{ confirmedGuestsCount }}
              </div>
              <div class="text-[10px] sm:text-[11px] text-muted truncate">
                {{ totalInvitedCount }} Invited · {{ rsvpResponseRate }}% RSVP
              </div>
            </div>

            <!-- Column 4: Remaining Balance -->
            <div class="space-y-1 pt-1 sm:pt-0 sm:pl-3">
              <div class="flex items-center gap-1 text-muted text-xs font-medium">
                <span>Remaining Balance</span>
                <UIcon name="i-lucide-wallet" class="size-3.5 text-amber-600 shrink-0" />
              </div>
              <div class="text-xl sm:text-2xl font-bold font-serif text-highlighted tracking-tight">
                ₱{{ balanceDue.toLocaleString() }}
              </div>
              <div class="text-[10px] sm:text-[11px] text-muted truncate">
                ₱{{ amountPaid.toLocaleString() }} Paid · {{ priceTierLabel }}
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Main Workspace Split: Left = Tasks by Status (Pie Chart), Right = Financial Snapshot & Planning Health stacked -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 flex-1 w-full items-stretch min-h-0">
          <!-- Left Column: Tasks by Status with Pie Chart -->
          <div
            class="white-bread-container p-3 sm:p-3.5 lg:p-4 shadow-sm flex flex-col justify-between h-full w-full min-h-0">
            <div class="flex items-center justify-between gap-3 border-b border-bread-200/60 pb-2 shrink-0">
              <div>
                <h2 class="text-2xl font-bold font-serif text-highlighted leading-tight">Tasks by Status</h2>
                <p class="text-[11px] text-muted">
                  Classified into 5 operational statuses
                </p>
              </div>
              <UBadge variant="subtle" size="sm" color="neutral" class="font-medium shrink-0">
                {{ totalTasks }} Total Tasks
              </UBadge>
            </div>

            <!-- Pie Chart Visual (Scales to fill all vacant space in container) -->
            <div
              class="flex flex-col items-center justify-center w-full min-h-0 flex-1 py-1.5 overflow-hidden relative">
              <PieChart :data="taskStatusChartData" :colors="TASK_STATUS_COLORS" :show-legend="false" size="fill"
                class="w-full h-full flex-1 min-h-0" chart-class="w-full h-full flex-1 min-h-0" />
            </div>

            <!-- 5-Status Classification: Space-efficient Grid -->
            <div class="space-y-1.5 pt-2 border-t border-bread-200/60 shrink-0 w-full">
              <div class="flex items-center justify-between text-[11px] font-semibold text-muted px-0.5">
                <span>Classification</span>
                <span>Count & Share</span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 w-full">
                <div v-for="(status, idx) in taskStatusBreakdown" :key="status.key"
                  class="flex items-center justify-between px-2 py-1.5 rounded-md bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/50 transition-colors"
                  :class="idx === 4 ? 'col-span-2 sm:col-span-1' : ''">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="size-2 rounded-full shrink-0" :class="status.colorClass" />
                    <span class="text-[11px] font-medium text-highlighted truncate">{{ status.label }}</span>
                  </div>
                  <div class="flex items-center gap-1 shrink-0 ml-1">
                    <span class="text-[11px] font-bold text-highlighted">{{ status.count }}</span>
                    <span class="text-[9px] text-muted">({{ Math.round((status.count / totalTasks) * 100) }}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Stacked Containers (Occupies all vertical & horizontal vacant space with uniform gap) -->
          <div class="flex flex-col gap-3.5 sm:gap-4 h-full w-full min-h-0">
            <!-- Top Container: Financial Snapshot (flex-1 to occupy half of vacant vertical space) -->
            <div
              class="white-bread-container p-3 sm:p-3.5 lg:p-4 shadow-sm flex flex-col justify-between flex-1 w-full min-h-0">
              <div class="flex items-center justify-between border-b border-bread-200/60 pb-2 shrink-0">
                <div>
                  <h3 class="text-2xl font-bold font-serif text-highlighted leading-tight">Financial Snapshot</h3>
                  <p class="text-[11px] text-muted">Budget, expenses & forecast metrics</p>
                </div>
                <!-- Budget Status (Badge) -->
                <UBadge :color="budgetStatus.color" variant="subtle" size="sm" class="font-semibold text-xs">
                  {{ budgetStatus.label }}
                </UBadge>
              </div>

              <!-- Financial Metrics Grid: Target Budget, Forecast, Amount Paid, Remaining Payable, Budget Remaining, Budget Used % -->
              <div class="grid grid-cols-3 gap-2 sm:gap-2.5 py-1.5 flex-1 items-stretch w-full min-h-0">
                <!-- 1. Target Budget -->
                <div
                  class="h-full flex flex-col justify-between p-2.5 sm:p-3 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-xs sm:text-sm font-semibold text-toast-700 truncate">Target Budget</span>
                    <UIcon name="i-lucide-target" class="size-3.5 text-red-500 shrink-0" />
                  </div>
                  <div class="text-base sm:text-lg lg:text-xl font-bold font-serif text-black tracking-tight truncate">
                    ₱{{ targetBudget.toLocaleString() }}
                  </div>
                  <div class="text-xs text-muted truncate">
                    Allocated budget limit
                  </div>
                </div>

                <!-- 2. Forecast -->
                <div
                  class="h-full flex flex-col justify-between p-2.5 sm:p-3 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-xs sm:text-sm font-semibold text-toast-700 truncate">Forecast</span>
                    <UIcon name="i-lucide-trending-up" class="size-3.5 text-blue-500 shrink-0" />
                  </div>
                  <div class="text-base sm:text-lg lg:text-xl font-bold font-serif text-black tracking-tight truncate">
                    ₱{{ forecastSpend.toLocaleString() }}
                  </div>
                  <div class="text-xs text-muted truncate">
                    Projected total spend
                  </div>
                </div>

                <!-- 3. Amount Paid -->
                <div
                  class="h-full flex flex-col justify-between p-2.5 sm:p-3 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-xs sm:text-sm font-semibold text-toast-700 truncate">Amount Paid</span>
                    <UIcon name="i-lucide-check-circle" class="size-3.5 text-green-500 shrink-0" />
                  </div>
                  <div class="text-base sm:text-lg lg:text-xl font-bold font-serif text-black tracking-tight truncate">
                    ₱{{ amountPaid.toLocaleString() }}
                  </div>
                  <div class="text-xs text-muted truncate">
                    Disbursed to suppliers
                  </div>
                </div>

                <!-- 4. Remaining Payable -->
                <div
                  class="h-full flex flex-col justify-between p-2.5 sm:p-3 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-xs sm:text-sm font-semibold text-toast-700 truncate">Remaining Payable</span>
                    <UIcon name="i-lucide-clock" class="size-3.5 text-amber-500 shrink-0" />
                  </div>
                  <div class="text-base sm:text-lg lg:text-xl font-bold font-serif text-black tracking-tight truncate">
                    ₱{{ remainingPayable.toLocaleString() }}
                  </div>
                  <div class="text-xs text-muted truncate">
                    Pending payment due
                  </div>
                </div>

                <!-- 5. Budget Remaining -->
                <div
                  class="h-full flex flex-col justify-between p-2.5 sm:p-3 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-xs sm:text-sm font-semibold text-toast-700 truncate">Budget Remaining</span>
                    <UIcon name="i-lucide-wallet" class="size-3.5 text-emerald-500 shrink-0" />
                  </div>
                  <div class="text-base sm:text-lg lg:text-xl font-bold font-serif text-black tracking-tight truncate">
                    ₱{{ budgetRemaining.toLocaleString() }}
                  </div>
                  <div class="text-xs text-muted truncate">
                    Available target balance
                  </div>
                </div>

                <!-- 6. Budget Used % -->
                <div
                  class="h-full flex flex-col justify-between p-2.5 sm:p-3 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-xs sm:text-sm font-semibold text-toast-700 truncate">Budget Used %</span>
                    <UIcon name="i-lucide-pie-chart" class="size-3.5 text-indigo-500 shrink-0" />
                  </div>
                  <div class="text-base sm:text-lg lg:text-xl font-bold font-serif text-black tracking-tight truncate">
                    {{ budgetUsedPercent }}%
                  </div>
                  <div class="w-full">
                    <UProgress :model-value="budgetUsedPercent" color="neutral" size="2xs" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom Container: Planning Health (flex-1 to occupy other half of vacant vertical space) -->
            <div
              class="white-bread-container p-3 sm:p-3.5 lg:p-4 shadow-sm flex flex-col justify-between flex-1 w-full min-h-0">
              <div class="flex items-center justify-between border-b border-bread-200/60 pb-2 shrink-0">
                <div>
                  <h3 class="text-2xl font-bold font-serif text-highlighted leading-tight">Planning Health</h3>
                  <p class="text-[11px] text-muted">Operational & readiness indicators</p>
                </div>
                <UBadge :color="planningHealthStatus.color" variant="subtle" size="sm" class="font-semibold text-xs">
                  {{ planningHealthStatus.label }}
                </UBadge>
              </div>

              <!-- 3 Required Planning Health Indicators: Space-efficient Grid (flex-1 to fill card) -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 py-1.5 flex-1 items-stretch w-full min-h-0">
                <!-- 1. Overdue tasks -->
                <div
                  class="h-full flex flex-col justify-between p-3 sm:p-3.5 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-xs sm:text-sm font-semibold text-toast-700 truncate">Overdue tasks</span>
                    <UIcon :name="overdueTasksCount === 0 ? 'i-lucide-check-circle-2' : 'i-lucide-alert-triangle'"
                      :class="overdueTasksCount === 0 ? 'text-green-500' : 'text-red-500'" class="size-4 shrink-0" />
                  </div>
                  <div class="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-black tracking-tight truncate">
                    {{ overdueTasksCountText }}
                  </div>
                  <div class="space-y-1 w-full">
                    <UProgress :model-value="onTrackTasksPercent" :color="overdueTasksCount === 0 ? 'success' : 'error'"
                      size="2xs" />
                    <div class="text-[11px] text-muted flex justify-between">
                      <span>{{ onTrackTasksCount }}/{{ totalTasks }} on schedule</span>
                      <span>{{ onTrackTasksPercent }}%</span>
                    </div>
                  </div>
                </div>

                <!-- 2. Requirements completion -->
                <div
                  class="h-full flex flex-col justify-between p-3 sm:p-3.5 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-xs sm:text-sm font-semibold text-toast-700 truncate">Requirements</span>
                    <UIcon name="i-lucide-file-check-2" class="size-4 text-teal-600 shrink-0" />
                  </div>
                  <div class="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-black tracking-tight truncate">
                    {{ completedRequirements }}/{{ totalRequirements }}
                    <span class="text-xs sm:text-sm font-semibold text-teal-600 font-sans ml-1.5">({{
                      requirementsCompletionPercent }}%)</span>
                  </div>
                  <div class="space-y-1 w-full">
                    <UProgress :model-value="requirementsCompletionPercent" color="success" size="2xs" />
                    <div class="text-[11px] text-muted flex justify-between">
                      <span>{{ completedRequirements }} fulfilled</span>
                      <span>{{ totalRequirements - completedRequirements }} pending</span>
                    </div>
                  </div>
                </div>

                <!-- 3. Guests without tables -->
                <div
                  class="h-full flex flex-col justify-between p-3 sm:p-3.5 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-xs sm:text-sm font-semibold text-toast-700 truncate">Without tables</span>
                    <UIcon name="i-lucide-users" class="size-4 text-red-600 shrink-0" />
                  </div>
                  <div class="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-black tracking-tight truncate">
                    {{ guestsWithoutTables }}
                    <span class="text-xs sm:text-sm font-normal text-muted font-sans">Guests</span>
                  </div>
                  <div class="space-y-1 w-full">
                    <UProgress :model-value="guestsSeatedPercent" color="success" size="2xs" />
                    <div class="text-[11px] text-muted flex justify-between">
                      <span>{{ seatedGuestsCount }}/{{ totalConfirmedGuests }} Seated</span>
                      <span>{{ guestsSeatedPercent }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================= RIGHT DIVISION: col-span-1 Quick Navigation ================= -->
      <UDashboardPanel
        class="lg:col-span-1 lg:h-full min-h-0 bg-white border-t lg:border-t-0 lg:border-l border-bread-200/90 shadow-sm flex flex-col z-20 shrink-0 lg:overflow-hidden p-3 sm:p-3.5 lg:p-4"
        :ui="{ root: 'min-h-0 lg:h-full flex flex-col overflow-hidden p-3 sm:p-3.5 lg:p-4' }">
        <div class="my-auto flex flex-col items-center justify-center w-full px-1 sm:px-2">
          <!-- Panel Header -->
          <div class="pb-3 sm:pb-4 flex items-center gap-2 shrink-0 text-center justify-center">
            <h2 class="text-2xl font-serif text-toast-500 font-bold">Quick Navigation</h2>
          </div>

          <!-- 3-Column App Launcher Grid -->
          <div class="grid grid-cols-3 gap-2 sm:gap-2.5 w-full">
            <button v-for="item in QUICK_NAV_ITEMS" :key="item.label" type="button"
              class="group relative flex flex-col items-center justify-center w-full aspect-square p-2 rounded-xl shadow-xs transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none select-none cursor-pointer"
              :class="[item.bgClass, item.ringClass, item.hoverClass, item.textClass]"
              @click="onQuickNavItemClick(item)" @mouseenter="onDashboardItemMouseEnter($event, item)"
              @mousemove="onDashboardItemMouseMove($event)" @mouseleave="onDashboardItemMouseLeave">
              <!-- Feature Lock Indicator if blocked -->
              <div v-if="isDashboardItemBlocked(item)"
                class="absolute top-1.5 right-1.5 size-4 rounded-full bg-black/40 text-white flex items-center justify-center">
                <UIcon name="i-lucide-lock" class="size-2.5 text-white" />
              </div>
              <UIcon :name="item.icon"
                class="size-7 sm:size-8 shrink-0 mb-1 transition-transform duration-200 group-hover:scale-110" />
              <span
                class="text-xs font-semibold leading-tight text-center wrap-break-word line-clamp-2 px-0.5 tracking-tight">
                {{ item.label }}
              </span>
            </button>
          </div>
        </div>
      </UDashboardPanel>
    </UPageGrid>

    <!-- Desktop-only Feature Recommendation Modal for Mobile -->
    <UModal v-model:open="isDesktopOnlyModalOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div v-if="selectedDesktopOnlyFeature"
              class="size-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0"
              :class="[selectedDesktopOnlyFeature.bgClass, selectedDesktopOnlyFeature.ringClass, selectedDesktopOnlyFeature.textClass]">
              <UIcon :name="selectedDesktopOnlyFeature.icon" class="size-6" />
            </div>
            <div>
              <h3 class="text-lg font-bold font-serif text-highlighted">
                {{ selectedDesktopOnlyFeature?.label }}
              </h3>
              <p class="text-xs text-muted">Desktop Recommended</p>
            </div>
          </div>

          <p class="text-sm text-muted">
            {{ selectedDesktopOnlyFeature?.description }} For the most comfortable experience and full design canvas,
            this tool is best enjoyed on a desktop or laptop.
          </p>

          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="soft" @click="isDesktopOnlyModalOpen = false">
              Cancel
            </UButton>
            <UButton color="primary"
              @click="isDesktopOnlyModalOpen = false; navigateFromModal(selectedDesktopOnlyFeature)">
              Continue Anyway
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Upgrade Pop-up Modal for Locked Items -->
    <EventUpgradeModal v-model:open="isUpgradeModalOpen" :item="selectedLockedFeature" :event="eventRecord"
      :event-id="eventId" />

    <!-- Desktop Hover Tooltip Pop-up (Constantly positioned on the left side of cursor, non-blocking click) -->
    <ClientOnly>
      <Teleport to="body">
        <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
          <div v-if="isHoverTooltipVisible && hoveredDashboardItem" id="dashboard-item-cursor-tooltip" role="tooltip"
            aria-hidden="true" class="hidden md:block fixed z-9999 pointer-events-none select-none w-84" :style="{
              left: tooltipPosition.left,
              top: tooltipPosition.top,
              transform: 'translate(-100%, -50%)',
            }">
            <div class="relative rounded-xl bg-toast-500 text-bread-50 p-4 shadow-xl ring-1 ring-white/20">
              <!-- Small pointer indicator pointing right towards cursor -->
              <div
                class="absolute -right-1.5 w-3 h-3 bg-toast-500 rotate-45 border-t border-r border-white/20 -translate-y-1/2"
                :style="{ top: tooltipPosition.arrowTop }" />

              <div class="flex items-center gap-2.5 mb-2">
                <div class="size-6.5 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                  :class="getQuickNavSolidBgClass(hoveredDashboardItem)">
                  <UIcon :name="hoveredDashboardItem.icon" class="size-4 text-white" />
                </div>
                <div class="font-semibold text-sm tracking-wide text-white flex-1 truncate">
                  {{ hoveredDashboardItem.label }}
                </div>
                <UBadge v-if="isDashboardItemBlocked(hoveredDashboardItem)" color="warning" size="xs" variant="solid"
                  class="text-[10px] text-black font-semibold">
                  Upgrade
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
  </div>
</template>

<style scoped></style>
