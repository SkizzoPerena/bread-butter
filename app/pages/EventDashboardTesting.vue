<script lang="ts" setup>
import { DateFormatter } from '@internationalized/date'
import type {
  ChartSlice,
  EventRecord,
  TasksSummary,
  GuestRecord,
  GuestStats,
  RsvpSummary,
  ChurchRequirementSummary,
} from '~/types/event'
import { isWeddingEventType, formatEventPriceTier } from '~/types/event'
import {
  isEventFullyPaid,
  isTierUpgradePending,
  getPendingUpgradeTargetName,
} from '~/types/payment'
import type { SupplierSummary } from '~/types/supplier'
import {
  type DashboardAction,
  getAllowedFeaturesForEvent,
  isDashboardActionAllowed,
  resolveEventTierCode,
} from '~/utils/eventTierFeatures'

definePageMeta({
  layout: 'event-navbar',
  alias: ['/event/dashboard-testing', '/dashboard-testing', '/event-dashboard-testing'],
})

const toast = useToast()
const route = useRoute()
const { setActiveEvent } = useActiveEvent()

const df = new DateFormatter('en-US', {
  dateStyle: 'medium',
})

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : 'testing-event-id'
})

// ============================================================================
// PLACEHOLDER / MOCK DATA (Playground: Edit these values directly to test UI)
// ============================================================================

const eventRecord = ref<EventRecord>({
  _id: 'testing-event-id',
  eventType: 'WEDDING',
  eventName: "Jane & John's Wedding (Testing)",
  description: 'Mock wedding event for testing dashboard components and layout changes.',
  venue: 'Manila Cathedral & Palacio de Memoria',
  eventDate: '2026-05-18T00:00:00.000Z',
  status: 'ONGOING',
  coverImageURL: null,
  latestPayment: null,
  paymentSummary: {
    fee: 10000,
    totalReceived: 6500,
    balanceDue: 3500,
    isFullyPaid: false,
  },
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
})

const tasksSummary = ref<TasksSummary>({
  totalTasks: 21,
  overdueCount: 1,
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
})

const guestList = ref<GuestRecord[]>([])

const rsvpSummary = ref<RsvpSummary>({
  totalSent: 120,
  going: 84,
  notGoing: 12,
  pending: 24,
})

const guestStats = ref<GuestStats>({
  total: 120,
  withoutTable: 12,
  seated: 108,
})

const supplierSummary = ref<SupplierSummary>({
  totalBudget: 500000,
  totalPaid: 250000,
  totalRemaining: 230000,
  supplierCount: 8,
})

const churchRequirementSummary = ref<ChurchRequirementSummary>({
  total: 10,
  completed: 8,
  pending: 2,
})

// Financial Snapshot placeholder metrics
const placeholderTargetBudget = ref(500000)
const placeholderForecast = ref(480000)
const placeholderBudgetRemaining = ref(250000)
const placeholderBudgetUsedPercent = ref(50)

function toNonNegativeNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

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

onMounted(() => {
  setActiveEvent(eventRecord.value)
  nextTick(() => {
    updateVisibleTaskCount()
    if (priorityTasksListRef.value && typeof ResizeObserver !== 'undefined') {
      tasksResizeObserver = new ResizeObserver(() => {
        updateVisibleTaskCount()
      })
      tasksResizeObserver.observe(priorityTasksListRef.value as unknown as Element)
    }
  })
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateVisibleTaskCount)
  }
})

onBeforeUnmount(() => {
  tasksResizeObserver?.disconnect()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateVisibleTaskCount)
  }
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

const amountPaid = computed(() => {
  return toNonNegativeNumber(eventRecord.value?.paymentSummary?.totalReceived)
})

const balanceDue = computed(() => {
  return toNonNegativeNumber(eventRecord.value?.paymentSummary?.balanceDue)
})

// 2. Tasks & 5-Status Breakdown
const taskStatusBreakdown = computed(() => {
  const byStatus = tasksSummary.value?.byStatus
  const notStarted = toNonNegativeNumber(byStatus?.['not-started'] ?? byStatus?.TODO)
  const waiting = toNonNegativeNumber(byStatus?.waiting)
  const inProgress = toNonNegativeNumber(byStatus?.['in-progress'] ?? byStatus?.ONGOING)
  const onHold = toNonNegativeNumber(byStatus?.['on-hold'])
  const completed = toNonNegativeNumber(byStatus?.completed ?? byStatus?.COMPLETED)

  return [
    { key: 'not-started', label: 'Not Started', count: notStarted, colorClass: 'bg-slate-500', color: 'bg-slate-500', hex: '#64748b' },
    { key: 'waiting', label: 'Waiting', count: waiting, colorClass: 'bg-orange-500', color: 'bg-orange-500', hex: '#f97316' },
    { key: 'in-progress', label: 'In Progress', count: inProgress, colorClass: 'bg-blue-500', color: 'bg-blue-500', hex: '#3b82f6' },
    { key: 'on-hold', label: 'On Hold', count: onHold, colorClass: 'bg-yellow-500', color: 'bg-yellow-500', hex: '#eab308' },
    { key: 'completed', label: 'Completed', count: completed, colorClass: 'bg-green-500', color: 'bg-green-500', hex: '#00C16A' },
  ]
})

const totalTasks = computed(() => {
  return taskStatusBreakdown.value.reduce((sum, item) => sum + item.count, 0)
})

const completedTasksCount = computed(() => {
  return taskStatusBreakdown.value.find((s) => s.key === 'completed')?.count ?? 0
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
  return toNonNegativeNumber(rsvpSummary.value?.going)
})

const totalInvitedCount = computed(() => {
  return toNonNegativeNumber(rsvpSummary.value?.totalSent)
})

const rsvpResponseRate = computed(() => {
  if (totalInvitedCount.value <= 0) return 0
  const responded =
    toNonNegativeNumber(rsvpSummary.value?.going) + toNonNegativeNumber(rsvpSummary.value?.notGoing)
  return Math.round((responded / totalInvitedCount.value) * 100)
})

// 4. Financial Snapshot Metrics
const supplierAmountPaid = computed(() => {
  return toNonNegativeNumber(supplierSummary.value?.totalPaid)
})

const remainingPayable = computed(() => {
  return toNonNegativeNumber(supplierSummary.value?.totalRemaining)
})

const budgetStatus = computed(() => {
  return {
    label: 'On Track',
    color: 'success' as const,
  }
})

// 5. Planning Health Metrics
const overdueTasksCount = computed(() => {
  return toNonNegativeNumber(tasksSummary.value?.overdueCount)
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
  return toNonNegativeNumber(guestStats.value?.withoutTable)
})

const seatedGuestsCount = computed(() => {
  return toNonNegativeNumber(guestStats.value?.seated)
})

const guestsSeatedPercent = computed(() => {
  if (totalConfirmedGuests.value === 0) return 0
  return Math.min(100, Math.round((seatedGuestsCount.value / totalConfirmedGuests.value) * 100))
})

const totalRequirements = computed(() => {
  return toNonNegativeNumber(churchRequirementSummary.value?.total)
})

const completedRequirements = computed(() => {
  return toNonNegativeNumber(churchRequirementSummary.value?.completed)
})

const pendingRequirements = computed(() => {
  return toNonNegativeNumber(churchRequirementSummary.value?.pending)
})

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
  if (item.action === 'settings') return false
  return !isDashboardActionAllowed(eventRecord.value, item.action)
}

function getActiveEventQueryId(): string {
  return eventId.value || 'testing-event-id'
}

function openWebsiteMaker() {
  navigateTo({ path: '/website-maker', query: { eventId: getActiveEventQueryId() } })
}

function openInvitationMaker() {
  navigateTo({ path: '/invitation-maker', query: { eventId: getActiveEventQueryId() } })
}

function openGuestList() {
  navigateTo({ path: '/event/guests', query: { eventId: getActiveEventQueryId() } })
}

function openTasksDashboard() {
  navigateTo({ path: '/event/tasks', query: { eventId: getActiveEventQueryId() } })
}

function openRsvpDashboard() {
  navigateTo({ path: '/event/rsvp', query: { eventId: getActiveEventQueryId() } })
}

function openEventSettings() {
  navigateTo({ path: '/event/settings', query: { eventId: getActiveEventQueryId() } })
}

function openPayments() {
  navigateTo({ path: '/event/payment-review', query: { eventId: getActiveEventQueryId() } })
}

function openSchedulesDashboard() {
  navigateTo({ path: '/event/schedules', query: { eventId: getActiveEventQueryId() } })
}

function openWishlistDashboard() {
  navigateTo({ path: '/event/wishlist', query: { eventId: getActiveEventQueryId() } })
}

function openEventPlaylist() {
  navigateTo({ path: '/event/playlist', query: { eventId: getActiveEventQueryId() } })
}

function openChurchRequirementsDashboard() {
  navigateTo({ path: '/event/requirements', query: { eventId: getActiveEventQueryId() } })
}

function openSuppliersDashboard() {
  navigateTo({ path: '/event/suppliers', query: { eventId: getActiveEventQueryId() } })
}

const DESKTOP_ONLY_ACTIONS: DashboardAction[] = ['website', 'invitation', 'guestList']
const isDesktopOnlyModalOpen = ref(false)
const selectedDesktopOnlyFeature = ref<QuickNavItem | null>(null)
const activeMobileTab = ref<'launcher' | 'overview'>('launcher')

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

// Hover pop-up tooltip state
interface DashboardTooltipData {
  label: string
  description: string
  icon: string
  iconBgClass: string
  isBlocked?: boolean
}

interface ContainerInfoItem {
  id: string
  label: string
  icon: string
  iconBgClass: string
  description: string
}

const CONTAINER_INFO_ITEMS: Record<string, ContainerInfoItem> = {
  'priority-tasks': {
    id: 'priority-tasks',
    label: 'Priority Tasks',
    icon: 'i-lucide-list-todo',
    iconBgClass: 'bg-red-500',
    description: 'Displays your most time-sensitive checklist tasks split into Urgent and Important so you can focus on pressing deadlines first.',
  },
  'tasks-by-status': {
    id: 'tasks-by-status',
    label: 'Tasks by Status',
    icon: 'i-lucide-pie-chart',
    iconBgClass: 'bg-amber-600',
    description: 'Visual breakdown and proportion of all event tasks categorized across their current workflow stages: To Do, In Progress, In Review, and Completed.',
  },
  'financial-snapshot': {
    id: 'financial-snapshot',
    label: 'Financial Snapshot',
    icon: 'i-lucide-wallet',
    iconBgClass: 'bg-emerald-600',
    description: 'High-level budgeting overview tracking target budget limits, actual supplier payments disbursed, and pending payable balances.',
  },
  'planning-health': {
    id: 'planning-health',
    label: 'Planning Health',
    icon: 'i-lucide-activity',
    iconBgClass: 'bg-blue-600',
    description: 'Real-time indicators tracking overdue deadlines, church or venue requirement fulfillment, and unassigned guest table seating.',
  },
  'quick-navigation': {
    id: 'quick-navigation',
    label: 'Quick Navigation',
    icon: 'i-lucide-compass',
    iconBgClass: 'bg-toast-600',
    description: 'Direct app launcher providing fast one-click navigation to event planning tools, website builder, invitations, and guest list managers.',
  },
}

const hoveredDashboardItem = ref<QuickNavItem | null>(null)
const hoveredContainerInfo = ref<ContainerInfoItem | null>(null)
const cursorPosition = ref({ x: 0, y: 0 })
const isHoverTooltipVisible = ref(false)

function onDashboardItemMouseEnter(event: MouseEvent, item: QuickNavItem) {
  if (isMobileViewport()) return
  hoveredContainerInfo.value = null
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

function onContainerHelpMouseEnter(event: MouseEvent, key: string) {
  if (isMobileViewport()) return
  const item = CONTAINER_INFO_ITEMS[key]
  if (!item) return
  hoveredDashboardItem.value = null
  hoveredContainerInfo.value = item
  cursorPosition.value = { x: event.clientX, y: event.clientY }
  isHoverTooltipVisible.value = true
}

function onContainerHelpMouseMove(event: MouseEvent) {
  if (isMobileViewport() || !isHoverTooltipVisible.value) return
  cursorPosition.value = { x: event.clientX, y: event.clientY }
}

function onContainerHelpMouseLeave() {
  isHoverTooltipVisible.value = false
  hoveredContainerInfo.value = null
}

const activeTooltipData = computed<DashboardTooltipData | null>(() => {
  if (hoveredDashboardItem.value) {
    return {
      label: hoveredDashboardItem.value.label,
      description: hoveredDashboardItem.value.description,
      icon: hoveredDashboardItem.value.icon,
      iconBgClass: getQuickNavSolidBgClass(hoveredDashboardItem.value),
      isBlocked: isDashboardItemBlocked(hoveredDashboardItem.value),
    }
  }
  if (hoveredContainerInfo.value) {
    return {
      label: hoveredContainerInfo.value.label,
      description: hoveredContainerInfo.value.description,
      icon: hoveredContainerInfo.value.icon,
      iconBgClass: hoveredContainerInfo.value.iconBgClass,
      isBlocked: false,
    }
  }
  return null
})

const tooltipPosition = computed(() => {
  const x = cursorPosition.value.x
  const y = cursorPosition.value.y

  if (typeof window === 'undefined') {
    return {
      left: `${x - 18}px`,
      top: `${y}px`,
      arrowTop: '50%',
      transform: 'translate(-100%, -50%)',
      isRight: false,
    }
  }

  const minY = 85
  const maxY = window.innerHeight - 85
  const clampedY = Math.max(minY, Math.min(maxY, y))
  const arrowOffset = Math.max(-45, Math.min(45, y - clampedY))

  const placeRight = x < 360

  return {
    left: placeRight ? `${x + 18}px` : `${x - 18}px`,
    top: `${clampedY}px`,
    arrowTop: `calc(50% + ${arrowOffset}px)`,
    transform: placeRight ? 'translate(0, -50%)' : 'translate(-100%, -50%)',
    isRight: placeRight,
  }
})



interface PriorityDashboardTask {
  id: string
  title: string
  priority: 'urgent' | 'important'
  category: string
  action: DashboardAction
  dueText?: string
}

function getTaskDashboardTheme(category: string) {
  const map: Record<string, {
    bg: string
    text: string
    border: string
    dot: string
    icon: string
    cardBg: string
    cardHoverBg: string
    cardBorder: string
    cardHoverBorder: string
    hoverText: string
  }> = {
    Payments: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/40',
      dot: 'bg-emerald-500',
      icon: 'i-lucide-credit-card',
      cardBg: 'bg-emerald-500/10',
      cardHoverBg: 'hover:bg-emerald-500/18',
      cardBorder: 'border-emerald-500/30',
      cardHoverBorder: 'hover:border-emerald-500/50',
      hoverText: 'group-hover:text-emerald-800 dark:group-hover:text-emerald-300',
    },
    Suppliers: {
      bg: 'bg-fuchsia-500/20',
      text: 'text-fuchsia-700 dark:text-fuchsia-400',
      border: 'border-fuchsia-500/40',
      dot: 'bg-fuchsia-500',
      icon: 'i-lucide-briefcase',
      cardBg: 'bg-fuchsia-500/10',
      cardHoverBg: 'hover:bg-fuchsia-500/18',
      cardBorder: 'border-fuchsia-500/30',
      cardHoverBorder: 'hover:border-fuchsia-500/50',
      hoverText: 'group-hover:text-fuchsia-800 dark:group-hover:text-fuchsia-300',
    },
    Requirements: {
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-800 dark:text-yellow-400',
      border: 'border-yellow-500/40',
      dot: 'bg-yellow-500',
      icon: 'i-lucide-church',
      cardBg: 'bg-yellow-500/10',
      cardHoverBg: 'hover:bg-yellow-500/18',
      cardBorder: 'border-yellow-500/35',
      cardHoverBorder: 'hover:border-yellow-500/55',
      hoverText: 'group-hover:text-yellow-900 dark:group-hover:text-yellow-300',
    },
    'Guest List': {
      bg: 'bg-orange-500/20',
      text: 'text-orange-700 dark:text-orange-400',
      border: 'border-orange-500/40',
      dot: 'bg-orange-500',
      icon: 'i-lucide-users',
      cardBg: 'bg-orange-500/10',
      cardHoverBg: 'hover:bg-orange-500/18',
      cardBorder: 'border-orange-500/30',
      cardHoverBorder: 'hover:border-orange-500/50',
      hoverText: 'group-hover:text-orange-800 dark:group-hover:text-orange-300',
    },
    RSVP: {
      bg: 'bg-teal-500/20',
      text: 'text-teal-700 dark:text-teal-400',
      border: 'border-teal-500/40',
      dot: 'bg-teal-500',
      icon: 'i-lucide-mail',
      cardBg: 'bg-teal-500/10',
      cardHoverBg: 'hover:bg-teal-500/18',
      cardBorder: 'border-teal-500/30',
      cardHoverBorder: 'hover:border-teal-500/50',
      hoverText: 'group-hover:text-teal-800 dark:group-hover:text-teal-300',
    },
    Playlist: {
      bg: 'bg-lime-500/25',
      text: 'text-lime-800 dark:text-lime-400',
      border: 'border-lime-600/40',
      dot: 'bg-lime-500',
      icon: 'i-lucide-music',
      cardBg: 'bg-lime-500/12',
      cardHoverBg: 'hover:bg-lime-500/20',
      cardBorder: 'border-lime-600/30',
      cardHoverBorder: 'hover:border-lime-600/50',
      hoverText: 'group-hover:text-lime-900 dark:group-hover:text-lime-300',
    },
    Schedules: {
      bg: 'bg-cyan-500/20',
      text: 'text-cyan-800 dark:text-cyan-400',
      border: 'border-cyan-500/40',
      dot: 'bg-cyan-500',
      icon: 'i-lucide-calendar',
      cardBg: 'bg-cyan-500/10',
      cardHoverBg: 'hover:bg-cyan-500/18',
      cardBorder: 'border-cyan-500/30',
      cardHoverBorder: 'hover:border-cyan-500/50',
      hoverText: 'group-hover:text-cyan-900 dark:group-hover:text-cyan-300',
    },
    Website: {
      bg: 'bg-blue-500/20',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-500/40',
      dot: 'bg-blue-500',
      icon: 'i-lucide-globe',
      cardBg: 'bg-blue-500/10',
      cardHoverBg: 'hover:bg-blue-500/18',
      cardBorder: 'border-blue-500/30',
      cardHoverBorder: 'hover:border-blue-500/50',
      hoverText: 'group-hover:text-blue-800 dark:group-hover:text-blue-300',
    },
    Invitation: {
      bg: 'bg-violet-500/20',
      text: 'text-violet-700 dark:text-violet-400',
      border: 'border-violet-500/40',
      dot: 'bg-violet-500',
      icon: 'i-lucide-send',
      cardBg: 'bg-violet-500/10',
      cardHoverBg: 'hover:bg-violet-500/18',
      cardBorder: 'border-violet-500/30',
      cardHoverBorder: 'hover:border-violet-500/50',
      hoverText: 'group-hover:text-violet-800 dark:group-hover:text-violet-300',
    },
    Gifts: {
      bg: 'bg-pink-500/20',
      text: 'text-pink-700 dark:text-pink-400',
      border: 'border-pink-500/40',
      dot: 'bg-pink-500',
      icon: 'i-lucide-gift',
      cardBg: 'bg-pink-500/10',
      cardHoverBg: 'hover:bg-pink-500/18',
      cardBorder: 'border-pink-500/30',
      cardHoverBorder: 'hover:border-pink-500/50',
      hoverText: 'group-hover:text-pink-800 dark:group-hover:text-pink-300',
    },
    Tasks: {
      bg: 'bg-red-500/20',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-500/40',
      dot: 'bg-red-500',
      icon: 'i-lucide-list-todo',
      cardBg: 'bg-red-500/10',
      cardHoverBg: 'hover:bg-red-500/18',
      cardBorder: 'border-red-500/30',
      cardHoverBorder: 'hover:border-red-500/50',
      hoverText: 'group-hover:text-red-800 dark:group-hover:text-red-300',
    },
    Settings: {
      bg: 'bg-slate-500/20',
      text: 'text-slate-700 dark:text-slate-400',
      border: 'border-slate-500/40',
      dot: 'bg-slate-500',
      icon: 'i-lucide-settings',
      cardBg: 'bg-slate-500/10',
      cardHoverBg: 'hover:bg-slate-500/18',
      cardBorder: 'border-slate-500/30',
      cardHoverBorder: 'hover:border-slate-500/50',
      hoverText: 'group-hover:text-slate-800 dark:group-hover:text-slate-300',
    },
  }
  return map[category] || {
    bg: 'bg-toast-500/20',
    text: 'text-toast-700',
    border: 'border-toast-500/40',
    dot: 'bg-toast-500',
    icon: 'i-lucide-check-circle',
    cardBg: 'bg-toast-500/10',
    cardHoverBg: 'hover:bg-toast-500/18',
    cardBorder: 'border-toast-500/30',
    cardHoverBorder: 'hover:border-toast-500/50',
    hoverText: 'group-hover:text-toast-900',
  }
}

const urgentTasks = ref<PriorityDashboardTask[]>([
  {
    id: 'urgent-1',
    title: 'Settle caterer balance payment',
    priority: 'urgent',
    category: 'Payments',
    action: 'payments',
    dueText: 'Due in 3 days',
  },
  {
    id: 'urgent-2',
    title: 'Submit church baptismal certificate',
    priority: 'urgent',
    category: 'Requirements',
    action: 'churchRequirements',
    dueText: 'Due this week',
  },
  {
    id: 'urgent-3',
    title: 'Follow up unconfirmed RSVPs',
    priority: 'urgent',
    category: 'RSVP',
    action: 'rsvp',
    dueText: '24 pending',
  },
  {
    id: 'urgent-4',
    title: 'Confirm reception styling & floral mockups',
    priority: 'urgent',
    category: 'Suppliers',
    action: 'suppliers',
    dueText: 'Due tomorrow',
  },
  {
    id: 'urgent-5',
    title: 'Finalize bridal entourage lineup',
    priority: 'urgent',
    category: 'Guest List',
    action: 'guestList',
    dueText: 'Due in 2 days',
  },
  {
    id: 'urgent-6',
    title: 'Submit marriage license application',
    priority: 'urgent',
    category: 'Requirements',
    action: 'churchRequirements',
    dueText: 'Due in 5 days',
  },
])

const importantTasks = ref<PriorityDashboardTask[]>([
  {
    id: 'important-1',
    title: 'Finalize reception seating arrangement',
    priority: 'important',
    category: 'Guest List',
    action: 'guestList',
    dueText: '12 unassigned',
  },
  {
    id: 'important-2',
    title: 'Review photographer & videographer shot list',
    priority: 'important',
    category: 'Suppliers',
    action: 'suppliers',
    dueText: 'Milestone review',
  },
  {
    id: 'important-3',
    title: 'Curate grand entrance & first dance songs',
    priority: 'important',
    category: 'Playlist',
    action: 'playlist',
    dueText: '3 songs needed',
  },
  {
    id: 'important-4',
    title: 'Review day-of timeline with coordinator',
    priority: 'important',
    category: 'Schedules',
    action: 'schedules',
    dueText: 'Pending review',
  },
  {
    id: 'important-5',
    title: 'Review wedding gift registry details',
    priority: 'important',
    category: 'Gifts',
    action: 'wishlist',
    dueText: '5 items pending',
  },
  {
    id: 'important-6',
    title: 'Publish event website & RSVP link',
    priority: 'important',
    category: 'Website',
    action: 'website',
    dueText: 'Ready to launch',
  },
])

// Dynamic task count to fit container without scrollbar or partial clipping
const priorityTasksListRef = ref<HTMLElement | null>(null)
const maxVisibleTasks = ref(urgentTasks.value.length)
let tasksResizeObserver: ResizeObserver | null = null

function updateVisibleTaskCount() {
  const container = priorityTasksListRef.value
  if (!container) return
  const availableHeight = container.clientHeight
  if (availableHeight <= 0) return

  const firstBtn = container.querySelector('button')
  const itemHeight = firstBtn ? firstBtn.getBoundingClientRect().height : 52
  const gap = 6
  const count = Math.max(1, Math.floor((availableHeight + gap) / (itemHeight + gap)))
  maxVisibleTasks.value = count
}

const displayedUrgentTasks = computed(() => {
  return urgentTasks.value.slice(0, maxVisibleTasks.value)
})

const displayedImportantTasks = computed(() => {
  return importantTasks.value.slice(0, maxVisibleTasks.value)
})

function onPriorityTaskClick(task: PriorityDashboardTask) {
  if (isMobileViewport() && DESKTOP_ONLY_ACTIONS.includes(task.action)) {
    selectedDesktopOnlyFeature.value = QUICK_NAV_ITEMS.find(i => i.action === task.action) || null
    isDesktopOnlyModalOpen.value = true
    return
  }

  switch (task.action) {
    case 'payments':
      openPayments()
      break
    case 'suppliers':
      openSuppliersDashboard()
      break
    case 'churchRequirements':
      openChurchRequirementsDashboard()
      break
    case 'guestList':
      openGuestList()
      break
    case 'rsvp':
      openRsvpDashboard()
      break
    case 'playlist':
      openEventPlaylist()
      break
    case 'schedules':
      openSchedulesDashboard()
      break
    case 'website':
      openWebsiteMaker()
      break
    case 'invitation':
      openInvitationMaker()
      break
    case 'wishlist':
      openWishlistDashboard()
      break
    case 'tasks':
    default:
      openTasksDashboard()
      break
  }
}
</script>

<template>
  <div class="h-[calc(100vh-64px)] flex flex-col w-full bg-bread-400 overflow-y-auto lg:overflow-hidden">
    <!-- Navbar Actions Teleport -->
    <ClientOnly>
      <Teleport to="#event-navbar-actions">
        <div class="flex items-center gap-2">
          <UBadge color="info" variant="subtle" size="sm" class="font-bold">
            PLAYGROUND
          </UBadge>
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

    <!-- ================= MOBILE SUB-NAV (< md / < 768px): Inherited from UserEventDashboard.vue ================= -->
    <div class="md:hidden px-4 pt-3 pb-1 flex items-center justify-between shrink-0 bg-bread-400">
      <div class="flex items-center gap-1.5 p-1 bg-white/70 backdrop-blur-xs rounded-xl w-full max-w-xs mx-auto border border-bread-300/40 shadow-xs">
        <button type="button"
          class="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer"
          :class="activeMobileTab === 'launcher' ? 'bg-toast-500 text-white shadow-xs' : 'text-toast-800 hover:text-toast-950'"
          @click="activeMobileTab = 'launcher'">
          Quick Launch
        </button>
        <button type="button"
          class="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer"
          :class="activeMobileTab === 'overview' ? 'bg-toast-500 text-white shadow-xs' : 'text-toast-800 hover:text-toast-950'"
          @click="activeMobileTab = 'overview'">
          Event Overview
        </button>
      </div>
    </div>

    <!-- ================= MOBILE LAUNCHER (< md when tab is launcher): Layout from UserEventDashboard.vue ================= -->
    <div v-if="activeMobileTab === 'launcher'"
      class="md:hidden white-bread-container h-full flex flex-col flex-1 overflow-hidden m-3 mt-1.5 shadow-sm"
      style="border-radius: 1.25rem;">
      <div class="flex flex-1 items-center justify-center min-h-0 py-4 px-3 w-full">
        <div class="grid grid-cols-3 gap-x-4 gap-y-5 max-w-xs sm:max-w-sm mx-auto w-full items-center justify-items-center">
          <div v-for="item in QUICK_NAV_ITEMS" :key="item.label" role="button" :tabindex="0"
            class="group flex flex-col items-center justify-center mx-auto w-full p-1 rounded-xl focus-visible:outline-none text-center cursor-pointer select-none"
            @click="onQuickNavItemClick(item)">
            <div class="relative flex items-center justify-center w-fit mx-auto">
              <div
                class="size-14 sm:size-16 flex items-center justify-center rounded-full transition-all duration-200 group-focus-visible:ring-2 aspect-square shrink-0 shadow-sm"
                :class="[
                  getQuickNavSolidBgClass(item),
                  isDashboardItemBlocked(item)
                    ? 'opacity-70 group-hover:opacity-100 group-hover:scale-105'
                    : ['group-hover:scale-105 group-active:scale-95'],
                ]">
                <UIcon :name="item.icon" class="size-7 sm:size-8 text-white shrink-0" />
              </div>
              <div v-if="isDashboardItemBlocked(item)"
                class="absolute -top-0.5 -right-0.5 bg-amber-500 text-white rounded-full p-1 shadow-md flex items-center justify-center pointer-events-none ring-2 ring-white"
                title="Upgrade to unlock">
                <UIcon name="i-lucide-lock" class="size-2.5 block" />
              </div>
            </div>
            <div
              class="font-medium mt-1.5 text-center text-xs leading-tight max-w-20 truncate">
              {{ item.label }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main UPageGrid Layout: 3:1 column split (Always on desktop/tablet, or on mobile when Overview is selected) -->
    <UPageGrid
      class="grid-cols-1 lg:grid-cols-4 gap-0 w-full flex-1 lg:h-full lg:overflow-hidden items-stretch"
      :class="activeMobileTab === 'launcher' ? 'hidden md:grid' : 'grid'">
      <!-- ================= LEFT DIVISION: col-span-3 (Workspace) ================= -->
      <section
        class="lg:col-span-3 p-3 sm:p-3.5 lg:p-4 flex flex-col gap-3.5 sm:gap-4 bg-toast-50/20 h-full overflow-y-auto lg:overflow-hidden justify-between">
        <!-- 1. Topmost Container: 3 Metric Groups (Days, Confirmed Guests, Task Completion col-span-2) -->
        <div class="white-bread-container p-3 sm:p-3.5 lg:p-4 shadow-sm shrink-0">
          <div
            class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-bread-200/60">
            <!-- Column 1: Days to Event -->
            <div class="space-y-1 pt-1 sm:pt-0 sm:pr-3">
              <div class="flex items-center gap-1 text-muted text-xs md:text-xs lg:text-xs xl:text-sm font-medium">
                <span>Days to Event</span>
                <UIcon name="i-lucide-calendar-heart" class="size-3.5 text-red-500 shrink-0" />
              </div>
              <div class="text-lg sm:text-xl md:text-xl lg:text-xl xl:text-2xl font-bold font-serif text-highlighted tracking-tight">
                {{ daysRemaining }} Days
              </div>
              <div class="text-[10px] sm:text-[11px] xl:text-xs text-muted truncate">
                {{ eventDateFormatted }}
              </div>
            </div>

            <!-- Column 2: Confirmed Guests -->
            <div class="space-y-1 pt-1 sm:pt-0 sm:px-3">
              <div class="flex items-center gap-1 text-muted text-xs md:text-xs lg:text-xs xl:text-sm font-medium">
                <span>Confirmed Guests</span>
                <UIcon name="i-lucide-users" class="size-3.5 text-teal-500 shrink-0" />
              </div>
              <div class="text-lg sm:text-xl md:text-xl lg:text-xl xl:text-2xl font-bold font-serif text-highlighted tracking-tight">
                {{ confirmedGuestsCount }}
              </div>
              <div class="text-[10px] sm:text-[11px] xl:text-xs text-muted truncate">
                {{ totalInvitedCount }} Invited · {{ rsvpResponseRate }}% RSVP
              </div>
            </div>

            <!-- Column 3: Task Completion (col-span-2, enlarged UProgress, numbers below) -->
            <div class="space-y-1.5 pt-1 sm:pt-0 sm:pl-3 col-span-2 flex flex-col justify-between">
              <div class="flex items-center gap-1 text-muted text-xs md:text-xs lg:text-xs xl:text-sm font-medium">
                <span>Task Completion</span>
                <UIcon name="i-lucide-check-circle-2" class="size-3.5 text-green-500 shrink-0" />
              </div>
              <div class="w-full py-0.5">
                <UProgress :model-value="taskCompletionPercent" color="success" size="sm" class="w-full" />
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-base sm:text-lg md:text-lg lg:text-lg xl:text-xl font-bold font-serif text-highlighted tracking-tight">
                  {{ taskCompletionPercent }}%
                </span>
                <span class="text-[10px] sm:text-[11px] xl:text-xs text-muted font-medium">
                  {{ completedTasksCount }}/{{ totalTasks }} Tasks Completed
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Main Workspace Split: Left = Priority Tasks & Tasks by Status stacked, Right = Financial Snapshot & Planning Health stacked -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 flex-1 w-full items-stretch min-h-0">
          <!-- Left Column: Stacked Containers (Top: Priority Tasks, Bottom: Tasks by Status / Pie Chart) -->
          <div class="flex flex-col gap-3.5 sm:gap-4 h-full w-full min-h-0">
            <!-- Top Container: Priority Tasks (Urgent & Important) -->
            <div
              class="white-bread-container p-3 sm:p-3.5 lg:p-4 shadow-sm flex flex-col justify-between flex-2 w-full min-h-0">
              <div class="flex items-center justify-between border-b border-bread-200/60 pb-2 shrink-0">
                <div class="flex items-center gap-1.5">
                  <h3 class="text-base sm:text-lg md:text-lg lg:text-xl xl:text-2xl font-bold font-serif text-highlighted leading-tight">Priority Tasks</h3>
                  <button type="button"
                    class="inline-flex items-center justify-center text-toast-400 hover:text-toast-600 hover:bg-toast-100/70 rounded-full p-0.5 transition-colors cursor-help focus:outline-none"
                    aria-label="Priority Tasks information"
                    @mouseenter="onContainerHelpMouseEnter($event, 'priority-tasks')"
                    @mousemove="onContainerHelpMouseMove($event)"
                    @mouseleave="onContainerHelpMouseLeave">
                    <UIcon name="i-lucide-help-circle" class="size-3.5 sm:size-4" />
                  </button>
                </div>
                <UButton variant="ghost" color="neutral" size="xs"
                  class="text-xs xl:text-sm font-semibold text-toast-700 hover:text-toast-900 cursor-pointer"
                  trailing-icon="i-lucide-arrow-right" @click="openTasksDashboard">
                  View all
                </UButton>
              </div>

              <!-- 2 Columns: Urgent vs Important Tasks -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 py-1.5 flex-1 items-stretch w-full min-h-0">
                <!-- Column 1: Urgent Tasks -->
                <div class="flex flex-col gap-1.5 min-h-0 flex-1">
                  <div class="flex items-center justify-between px-0.5 shrink-0">
                    <div class="flex items-center gap-1.5 text-xs sm:text-xs md:text-xs lg:text-xs xl:text-sm font-bold text-red-600 tracking-wide uppercase">
                      <span class="size-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span>URGENT</span>
                    </div>
                    <span class="text-[10px] sm:text-[10px] xl:text-xs text-muted font-medium">{{ urgentTasks.length }} tasks</span>
                  </div>
                  <div ref="priorityTasksListRef" class="flex flex-col gap-1.5 flex-1 min-h-0 overflow-hidden">
                    <button v-for="task in displayedUrgentTasks" :key="task.id" type="button"
                      class="w-full text-left p-1.5 sm:p-2 rounded-lg border transition-all flex items-center justify-between gap-2 group cursor-pointer"
                      :class="[
                        getTaskDashboardTheme(task.category).cardBg,
                        getTaskDashboardTheme(task.category).cardHoverBg,
                        getTaskDashboardTheme(task.category).cardBorder,
                        getTaskDashboardTheme(task.category).cardHoverBorder,
                      ]" @click="onPriorityTaskClick(task)">
                      <div class="flex items-center gap-2 min-w-0 flex-1">
                        <span class="size-2 rounded-full shrink-0"
                          :class="getTaskDashboardTheme(task.category).dot" />
                        <div class="min-w-0 flex-1">
                          <p class="text-xs xl:text-sm font-semibold text-highlighted truncate transition-colors"
                            :class="getTaskDashboardTheme(task.category).hoverText">
                            {{ task.title }}
                          </p>
                          <div class="flex items-center gap-1.5 text-[10px] sm:text-[11px] xl:text-xs text-muted">
                            <span class="font-medium" :class="getTaskDashboardTheme(task.category).text">
                              {{ task.category }}
                            </span>
                            <span v-if="task.dueText">·</span>
                            <span v-if="task.dueText" class="truncate">{{ task.dueText }}</span>
                          </div>
                        </div>
                      </div>
                      <UIcon name="i-lucide-chevron-right"
                        class="size-3 sm:size-3.5 transition-all shrink-0 group-hover:translate-x-0.5"
                        :class="getTaskDashboardTheme(task.category).text" />
                    </button>
                  </div>
                </div>

                <!-- Column 2: Important Tasks -->
                <div class="flex flex-col gap-1.5 min-h-0 flex-1">
                  <div class="flex items-center justify-between px-0.5 shrink-0">
                    <div class="flex items-center gap-1.5 text-xs sm:text-xs md:text-xs lg:text-xs xl:text-sm font-bold text-amber-600 tracking-wide uppercase">
                      <span class="size-1.5 rounded-full bg-amber-500" />
                      <span>IMPORTANT</span>
                    </div>
                    <span class="text-[10px] sm:text-[10px] xl:text-xs text-muted font-medium">{{ importantTasks.length }} tasks</span>
                  </div>
                  <div class="flex flex-col gap-1.5 flex-1 min-h-0 overflow-hidden">
                    <button v-for="task in displayedImportantTasks" :key="task.id" type="button"
                      class="w-full text-left p-1.5 sm:p-2 rounded-lg border transition-all flex items-center justify-between gap-2 group cursor-pointer"
                      :class="[
                        getTaskDashboardTheme(task.category).cardBg,
                        getTaskDashboardTheme(task.category).cardHoverBg,
                        getTaskDashboardTheme(task.category).cardBorder,
                        getTaskDashboardTheme(task.category).cardHoverBorder,
                      ]" @click="onPriorityTaskClick(task)">
                      <div class="flex items-center gap-2 min-w-0 flex-1">
                        <span class="size-2 rounded-full shrink-0"
                          :class="getTaskDashboardTheme(task.category).dot" />
                        <div class="min-w-0 flex-1">
                          <p class="text-xs xl:text-sm font-semibold text-highlighted truncate transition-colors"
                            :class="getTaskDashboardTheme(task.category).hoverText">
                            {{ task.title }}
                          </p>
                          <div class="flex items-center gap-1.5 text-[10px] sm:text-[11px] xl:text-xs text-muted">
                            <span class="font-medium" :class="getTaskDashboardTheme(task.category).text">
                              {{ task.category }}
                            </span>
                            <span v-if="task.dueText">·</span>
                            <span v-if="task.dueText" class="truncate">{{ task.dueText }}</span>
                          </div>
                        </div>
                      </div>
                      <UIcon name="i-lucide-chevron-right"
                        class="size-3 sm:size-3.5 transition-all shrink-0 group-hover:translate-x-0.5"
                        :class="getTaskDashboardTheme(task.category).text" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom Container: Tasks by Status (Legend on Left, Pie Chart on Right spanning container height) -->
            <div
              class="white-bread-container p-3 sm:p-3.5 lg:p-4 shadow-sm flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between flex-1 w-full min-h-0">
              <!-- Left: Header & 2-Col Legend -->
              <div class="flex flex-col justify-between h-full flex-1 min-h-0 w-full">
                <div class="flex items-center justify-between gap-2 border-b border-bread-200/60 pb-2 shrink-0">
                  <div class="flex items-center gap-1.5">
                    <h3 class="text-base sm:text-lg md:text-lg lg:text-xl xl:text-2xl font-bold font-serif text-highlighted leading-tight">Tasks by Status</h3>
                    <button type="button"
                      class="inline-flex items-center justify-center text-toast-400 hover:text-toast-600 hover:bg-toast-100/70 rounded-full p-0.5 transition-colors cursor-help focus:outline-none"
                      aria-label="Tasks by Status information"
                      @mouseenter="onContainerHelpMouseEnter($event, 'tasks-by-status')"
                      @mousemove="onContainerHelpMouseMove($event)"
                      @mouseleave="onContainerHelpMouseLeave">
                      <UIcon name="i-lucide-help-circle" class="size-3.5 sm:size-4" />
                    </button>
                  </div>
                  <UBadge variant="subtle" size="sm" color="neutral" class="font-medium shrink-0 text-[10px] sm:text-xs xl:text-xs">
                    {{ totalTasks }} Total Tasks
                  </UBadge>
                </div>

                <!-- 2-Column Legend -->
                <div class="grid grid-cols-2 gap-1.5 w-full pt-2 min-h-0">
                  <div v-for="status in taskStatusBreakdown" :key="status.key"
                    class="flex items-center justify-between px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/50 transition-colors last:col-span-2">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <span class="size-2 rounded-full shrink-0" :class="status.colorClass" />
                      <span class="text-[10px] sm:text-[11px] xl:text-xs font-medium text-highlighted truncate">{{ status.label }}</span>
                    </div>
                    <span class="text-[10px] sm:text-[11px] xl:text-xs font-bold text-highlighted ml-1 shrink-0">{{ status.count }}</span>
                  </div>
                </div>
              </div>

              <!-- Right: Pie Chart (Spans totality of container height, sans margins) -->
              <div
                class="flex items-center justify-center h-full aspect-square min-h-0 shrink-0 relative overflow-hidden">
                <PieChart :data="taskStatusChartData" :colors="TASK_STATUS_COLORS" :show-legend="false" size="fill"
                  class="w-full h-full flex-1 min-h-0" chart-class="w-full h-full flex-1 min-h-0" />
              </div>
            </div>
          </div>

          <!-- Right Column: Stacked Containers (Occupies all vertical & horizontal vacant space with uniform gap) -->
          <div class="flex flex-col gap-3.5 sm:gap-4 h-full w-full min-h-0">
            <!-- Top Container: Financial Snapshot -->
            <div
              class="white-bread-container p-3 sm:p-3.5 lg:p-4 shadow-sm flex flex-col justify-between flex-1 w-full min-h-0">
              <div class="flex items-center justify-between border-b border-bread-200/60 pb-2 shrink-0">
                <div class="flex items-center gap-1.5">
                  <h3 class="text-base sm:text-lg md:text-lg lg:text-xl xl:text-2xl font-bold font-serif text-highlighted leading-tight">Financial Snapshot</h3>
                  <button type="button"
                    class="inline-flex items-center justify-center text-toast-400 hover:text-toast-600 hover:bg-toast-100/70 rounded-full p-0.5 transition-colors cursor-help focus:outline-none"
                    aria-label="Financial Snapshot information"
                    @mouseenter="onContainerHelpMouseEnter($event, 'financial-snapshot')"
                    @mousemove="onContainerHelpMouseMove($event)"
                    @mouseleave="onContainerHelpMouseLeave">
                    <UIcon name="i-lucide-help-circle" class="size-3.5 sm:size-4" />
                  </button>
                </div>
                <!-- Budget Status (Badge) -->
                <UBadge :color="budgetStatus.color" variant="subtle" size="sm" class="font-semibold text-xs xl:text-xs">
                  {{ budgetStatus.label }}
                </UBadge>
              </div>

              <!-- Financial Metrics Grid -->
              <div class="grid grid-cols-3 gap-2 sm:gap-2.5 py-1.5 flex-1 items-stretch w-full min-h-0">
                <!-- 1. Target Budget -->
                <div
                  class="h-full flex flex-col justify-between p-2 sm:p-2.5 lg:p-2 xl:p-3 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-[11px] sm:text-xs md:text-xs lg:text-[11px] xl:text-sm font-semibold text-toast-700 truncate">Target Budget</span>
                    <UIcon name="i-lucide-target" class="size-3 sm:size-3.5 text-red-500 shrink-0" />
                  </div>
                  <div class="text-sm sm:text-base md:text-base lg:text-sm xl:text-xl font-bold font-serif text-black tracking-tight truncate">
                    ₱{{ placeholderTargetBudget.toLocaleString() }}
                  </div>
                  <div class="text-[9px] sm:text-[10px] md:text-[10px] lg:text-[10px] xl:text-xs text-muted truncate">
                    Allocated budget limit
                  </div>
                </div>

                <!-- 2. Forecast -->
                <div
                  class="h-full flex flex-col justify-between p-2 sm:p-2.5 lg:p-2 xl:p-3 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-[11px] sm:text-xs md:text-xs lg:text-[11px] xl:text-sm font-semibold text-toast-700 truncate">Forecast</span>
                    <UIcon name="i-lucide-trending-up" class="size-3 sm:size-3.5 text-blue-500 shrink-0" />
                  </div>
                  <div class="text-sm sm:text-base md:text-base lg:text-sm xl:text-xl font-bold font-serif text-black tracking-tight truncate">
                    ₱{{ placeholderForecast.toLocaleString() }}
                  </div>
                  <div class="text-[9px] sm:text-[10px] md:text-[10px] lg:text-[10px] xl:text-xs text-muted truncate">
                    Projected total spend
                  </div>
                </div>

                <!-- 3. Amount Paid -->
                <div
                  class="h-full flex flex-col justify-between p-2 sm:p-2.5 lg:p-2 xl:p-3 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-[11px] sm:text-xs md:text-xs lg:text-[11px] xl:text-sm font-semibold text-toast-700 truncate">Amount Paid</span>
                    <UIcon name="i-lucide-check-circle" class="size-3 sm:size-3.5 text-green-500 shrink-0" />
                  </div>
                  <div class="text-sm sm:text-base md:text-base lg:text-sm xl:text-xl font-bold font-serif text-black tracking-tight truncate">
                    ₱{{ supplierAmountPaid.toLocaleString() }}
                  </div>
                  <div class="text-[9px] sm:text-[10px] md:text-[10px] lg:text-[10px] xl:text-xs text-muted truncate">
                    Disbursed to suppliers
                  </div>
                </div>

                <!-- 4. Remaining Payable -->
                <div
                  class="h-full flex flex-col justify-between p-2 sm:p-2.5 lg:p-2 xl:p-3 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-[11px] sm:text-xs md:text-xs lg:text-[11px] xl:text-sm font-semibold text-toast-700 truncate">Remaining Payable</span>
                    <UIcon name="i-lucide-clock" class="size-3 sm:size-3.5 text-amber-500 shrink-0" />
                  </div>
                  <div class="text-sm sm:text-base md:text-base lg:text-sm xl:text-xl font-bold font-serif text-black tracking-tight truncate">
                    ₱{{ remainingPayable.toLocaleString() }}
                  </div>
                  <div class="text-[9px] sm:text-[10px] md:text-[10px] lg:text-[10px] xl:text-xs text-muted truncate">
                    Pending payment due
                  </div>
                </div>

                <!-- 5. Budget Remaining -->
                <div
                  class="h-full flex flex-col justify-between p-2 sm:p-2.5 lg:p-2 xl:p-3 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-[11px] sm:text-xs md:text-xs lg:text-[11px] xl:text-sm font-semibold text-toast-700 truncate">Budget Remaining</span>
                    <UIcon name="i-lucide-wallet" class="size-3 sm:size-3.5 text-emerald-500 shrink-0" />
                  </div>
                  <div class="text-sm sm:text-base md:text-base lg:text-sm xl:text-xl font-bold font-serif text-black tracking-tight truncate">
                    ₱{{ placeholderBudgetRemaining.toLocaleString() }}
                  </div>
                  <div class="text-[9px] sm:text-[10px] md:text-[10px] lg:text-[10px] xl:text-xs text-muted truncate">
                    Available target balance
                  </div>
                </div>

                <!-- 6. Budget Used % -->
                <div
                  class="h-full flex flex-col justify-between p-2 sm:p-2.5 lg:p-2 xl:p-3 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-[11px] sm:text-xs md:text-xs lg:text-[11px] xl:text-sm font-semibold text-toast-700 truncate">Budget Used %</span>
                    <UIcon name="i-lucide-pie-chart" class="size-3.5 text-indigo-500 shrink-0" />
                  </div>
                  <div class="text-sm sm:text-base md:text-base lg:text-sm xl:text-xl font-bold font-serif text-black tracking-tight truncate">
                    {{ placeholderBudgetUsedPercent }}%
                  </div>
                  <div class="w-full">
                    <UProgress :model-value="placeholderBudgetUsedPercent" color="primary" size="2xs" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom Container: Planning Health -->
            <div
              class="white-bread-container p-3 sm:p-3.5 lg:p-4 shadow-sm flex flex-col justify-between flex-1 w-full min-h-0">
              <div class="flex items-center justify-between border-b border-bread-200/60 pb-2 shrink-0">
                <div class="flex items-center gap-1.5">
                  <h3 class="text-base sm:text-lg md:text-lg lg:text-xl xl:text-2xl font-bold font-serif text-highlighted leading-tight">Planning Health</h3>
                  <button type="button"
                    class="inline-flex items-center justify-center text-toast-400 hover:text-toast-600 hover:bg-toast-100/70 rounded-full p-0.5 transition-colors cursor-help focus:outline-none"
                    aria-label="Planning Health information"
                    @mouseenter="onContainerHelpMouseEnter($event, 'planning-health')"
                    @mousemove="onContainerHelpMouseMove($event)"
                    @mouseleave="onContainerHelpMouseLeave">
                    <UIcon name="i-lucide-help-circle" class="size-3.5 sm:size-4" />
                  </button>
                </div>
                <UBadge :color="planningHealthStatus.color" variant="subtle" size="sm" class="font-semibold text-xs xl:text-xs">
                  {{ planningHealthStatus.label }}
                </UBadge>
              </div>

              <!-- 3 Required Planning Health Indicators -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 py-1.5 flex-1 items-stretch w-full min-h-0">
                <!-- 1. Overdue tasks -->
                <div
                  class="h-full flex flex-col justify-between p-2.5 sm:p-3 lg:p-2.5 xl:p-3.5 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-xs sm:text-sm md:text-xs lg:text-xs xl:text-sm font-semibold text-toast-700 truncate">Overdue tasks</span>
                    <UIcon :name="overdueTasksCount === 0 ? 'i-lucide-check-circle-2' : 'i-lucide-alert-triangle'"
                      :class="overdueTasksCount === 0 ? 'text-green-500' : 'text-red-500'" class="size-3.5 sm:size-4 shrink-0" />
                  </div>
                  <div class="text-lg sm:text-xl md:text-xl lg:text-xl xl:text-3xl font-bold font-serif text-black tracking-tight truncate">
                    {{ overdueTasksCount }}
                  </div>
                  <div class="space-y-1 w-full">
                    <UProgress :model-value="onTrackTasksPercent" :color="overdueTasksCount === 0 ? 'success' : 'error'"
                      size="2xs" />
                    <div class="text-[10px] sm:text-[11px] xl:text-xs text-muted flex justify-between">
                      <span>{{ onTrackTasksCount }}/{{ totalTasks }} on schedule</span>
                      <span>{{ onTrackTasksPercent }}%</span>
                    </div>
                  </div>
                </div>

                <!-- 2. Requirements completion -->
                <div
                  class="h-full flex flex-col justify-between p-2.5 sm:p-3 lg:p-2.5 xl:p-3.5 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-xs sm:text-sm md:text-xs lg:text-xs xl:text-sm font-semibold text-toast-700 truncate">Requirements</span>
                    <UIcon name="i-lucide-file-check-2" class="size-3.5 sm:size-4 text-teal-600 shrink-0" />
                  </div>
                  <div class="text-lg sm:text-xl md:text-xl lg:text-xl xl:text-3xl font-bold font-serif text-black tracking-tight truncate">
                    {{ completedRequirements }}/{{ totalRequirements }}
                  </div>
                  <div class="space-y-1 w-full">
                    <UProgress :model-value="requirementsCompletionPercent" color="success" size="2xs" />
                    <div class="text-[10px] sm:text-[11px] xl:text-xs text-muted flex justify-between">
                      <span>{{ completedRequirements }} fulfilled</span>
                      <span>{{ pendingRequirements }} pending</span>
                    </div>
                  </div>
                </div>

                <!-- 3. Guests without tables -->
                <div
                  class="h-full flex flex-col justify-between p-2.5 sm:p-3 lg:p-2.5 xl:p-3.5 rounded-lg bg-toast-50/50 border border-bread-200/40 hover:bg-toast-100/40 transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-xs sm:text-sm md:text-xs lg:text-xs xl:text-sm font-semibold text-toast-700 truncate">Without tables</span>
                    <UIcon name="i-lucide-users" class="size-3.5 sm:size-4 text-red-600 shrink-0" />
                  </div>
                  <div class="text-lg sm:text-xl md:text-xl lg:text-xl xl:text-3xl font-bold font-serif text-black tracking-tight truncate">
                    {{ guestsWithoutTables }}
                    <span class="text-xs sm:text-sm font-normal text-muted font-sans ml-1">Guests</span>
                  </div>
                  <div class="space-y-1 w-full">
                    <UProgress :model-value="guestsSeatedPercent" color="success" size="2xs" />
                    <div class="text-[10px] sm:text-[11px] xl:text-xs text-muted flex justify-between">
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
        class="hidden md:flex lg:col-span-1 lg:h-full min-h-0 bg-white border-t lg:border-t-0 lg:border-l border-bread-200/90 shadow-sm flex-col z-20 shrink-0 lg:overflow-hidden p-3 sm:p-3.5 lg:p-4"
        :ui="{ root: 'min-h-0 lg:h-full flex flex-col overflow-hidden p-3 sm:p-3.5 lg:p-4' }">
        <div class="my-auto flex flex-col items-center justify-center w-full px-1 sm:px-2">
          <!-- Panel Header -->
          <div class="pb-3 sm:pb-4 flex items-center gap-1.5 shrink-0 text-center justify-center">
            <h2 class="text-lg sm:text-xl md:text-xl lg:text-xl xl:text-2xl font-serif text-toast-500 font-bold">Quick Navigation</h2>
            <button type="button"
              class="inline-flex items-center justify-center text-toast-400 hover:text-toast-600 hover:bg-toast-100/70 rounded-full p-0.5 transition-colors cursor-help focus:outline-none"
              aria-label="Quick Navigation information"
              @mouseenter="onContainerHelpMouseEnter($event, 'quick-navigation')"
              @mousemove="onContainerHelpMouseMove($event)"
              @mouseleave="onContainerHelpMouseLeave">
              <UIcon name="i-lucide-help-circle" class="size-3.5 sm:size-4" />
            </button>
          </div>

          <!-- 3-Column App Launcher Grid -->
          <div class="grid grid-cols-3 gap-2 sm:gap-2.5 w-full">
            <button v-for="item in QUICK_NAV_ITEMS" :key="item.label" type="button"
              class="group relative flex flex-col items-center justify-center w-full aspect-square p-1.5 sm:p-2 rounded-xl shadow-xs transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none select-none cursor-pointer"
              :class="[item.bgClass, item.ringClass, item.hoverClass, item.textClass]"
              @click="onQuickNavItemClick(item)" @mouseenter="onDashboardItemMouseEnter($event, item)"
              @mousemove="onDashboardItemMouseMove($event)" @mouseleave="onDashboardItemMouseLeave">
              <!-- Feature Lock Indicator if blocked -->
              <div v-if="isDashboardItemBlocked(item)"
                class="absolute top-1.5 right-1.5 size-4 rounded-full bg-black/40 text-white flex items-center justify-center">
                <UIcon name="i-lucide-lock" class="size-2.5 text-white" />
              </div>
              <UIcon :name="item.icon"
                class="size-6 sm:size-7 md:size-6 lg:size-6 xl:size-8 shrink-0 mb-0.5 sm:mb-1 transition-transform duration-200 group-hover:scale-110" />
              <span
                class="text-[10px] sm:text-xs md:text-[11px] lg:text-[11px] xl:text-xs font-semibold leading-tight text-center wrap-break-word line-clamp-2 px-0.5 tracking-tight">
                {{ item.label }}
              </span>
            </button>
          </div>
        </div>
      </UDashboardPanel>
    </UPageGrid>

    <!-- Desktop Only Feature Notice Modal (Mobile View - Inherited from UserEventDashboard.vue) -->
    <UModal v-model:open="isDesktopOnlyModalOpen" :ui="{
      content: 'bread-container max-w-md p-6 space-y-5',
      overlay: 'bg-toast-950/40 backdrop-blur-xs'
    }">
      <template #content>
        <div class="space-y-5 text-toast-900">
          <!-- Header -->
          <div class="space-y-3 text-center">
            <div class="flex justify-between items-start">
              <div class="w-8" />
              <div
                class="w-14 h-14 rounded-full bg-toast-600/10 text-toast-700 flex items-center justify-center mx-auto shadow-xs">
                <UIcon name="i-lucide-monitor" class="size-7 text-toast-700" />
              </div>
              <div class="w-8 flex justify-end">
                <UButton icon="i-lucide-x" variant="link" color="neutral" class="cursor-pointer"
                  @click="isDesktopOnlyModalOpen = false" />
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
              :class="getQuickNavSolidBgClass(selectedDesktopOnlyFeature || { label: '' } as any)">
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
          <div class="space-y-2 pt-1">
            <UButton block color="primary" size="md"
              class="font-bold shadow-sm bg-toast-600 hover:bg-toast-700 text-white cursor-pointer"
              @click="isDesktopOnlyModalOpen = false">
              Understood
            </UButton>
            <div class="text-center">
              <button type="button"
                class="text-[11px] text-toast-700/70 hover:text-toast-900 underline cursor-pointer"
                @click="isDesktopOnlyModalOpen = false; navigateFromModal(selectedDesktopOnlyFeature)">
                Continue anyway on mobile
              </button>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Upgrade Pop-up Modal for Locked Items -->
    <EventUpgradeModal v-model:open="isUpgradeModalOpen" :item="selectedLockedFeature" :event="eventRecord"
      :event-id="eventId" />

    <!-- Desktop Hover Tooltip Pop-up -->
    <ClientOnly>
      <Teleport to="body">
        <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
          <div v-if="isHoverTooltipVisible && activeTooltipData" id="dashboard-item-cursor-tooltip" role="tooltip"
            aria-hidden="true" class="hidden md:block fixed z-9999 pointer-events-none select-none w-84" :style="{
              left: tooltipPosition.left,
              top: tooltipPosition.top,
              transform: tooltipPosition.transform,
            }">
            <div class="relative rounded-xl bg-toast-500 text-bread-50 p-4 shadow-xl ring-1 ring-white/20">
              <!-- Arrow notch pointing right when tooltip is to the left of cursor -->
              <div
                v-if="!tooltipPosition.isRight"
                class="absolute -right-1.5 w-3 h-3 bg-toast-500 rotate-45 border-t border-r border-white/20 -translate-y-1/2"
                :style="{ top: tooltipPosition.arrowTop }" />
              <!-- Arrow notch pointing left when tooltip is to the right of cursor -->
              <div
                v-else
                class="absolute -left-1.5 w-3 h-3 bg-toast-500 rotate-45 border-b border-l border-white/20 -translate-y-1/2"
                :style="{ top: tooltipPosition.arrowTop }" />

              <div class="flex items-center gap-2.5 mb-2">
                <div class="size-6.5 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                  :class="activeTooltipData.iconBgClass">
                  <UIcon :name="activeTooltipData.icon" class="size-4 text-white" />
                </div>
                <div class="font-semibold text-sm tracking-wide text-white flex-1 truncate">
                  {{ activeTooltipData.label }}
                </div>
                <UBadge v-if="activeTooltipData.isBlocked" color="warning" size="xs" variant="solid"
                  class="text-[10px] text-black font-semibold">
                  Upgrade
                </UBadge>
              </div>
              <p class="text-sm text-bread-100/95 leading-relaxed">
                {{ activeTooltipData.description }}
              </p>
            </div>
          </div>
        </Transition>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<style scoped></style>
