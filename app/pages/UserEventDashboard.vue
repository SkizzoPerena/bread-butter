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
import {
  EVENT_FEATURE,
  type DashboardAction,
  getAllowedFeaturesForEvent,
  isDashboardActionAllowed,
  isEventFeatureAllowed,
} from '~/utils/eventTierFeatures'

const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
})

definePageMeta({
  layout: 'event-navbar',
})

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
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
  return tasksSummary.value?.preview.tasks.filter((t: any) => t.status === 'TODO') || []
})

const ongoingTasks = computed(() => {
  return tasksSummary.value?.preview.tasks.filter((t: any) => t.status === 'ONGOING') || []
})

const completedTasks = computed(() => {
  return tasksSummary.value?.preview.tasks.filter((t: any) => t.status === 'COMPLETED') || []
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
      fetch: async () => fetchEvent(eventId.value),
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
  weddingOnly?: boolean
  bgClass: string
  hoverClass: string
  ringClass: string
}

const DASHBOARD_ITEM_CATALOG: DashboardItem[] = [
  // Row 1: Public Presence & Communication (The Event Story)
  { label: 'Website', icon: 'i-lucide-globe', action: 'website', bgClass: 'bg-blue-500', hoverClass: 'group-hover:bg-blue-600', ringClass: 'group-focus-visible:ring-blue-500' },
  { label: 'Invitation', icon: 'i-lucide-send', action: 'invitation', bgClass: 'bg-violet-500', hoverClass: 'group-hover:bg-violet-600', ringClass: 'group-focus-visible:ring-violet-500' },
  { label: 'RSVP', icon: 'i-lucide-mail', action: 'rsvp', bgClass: 'bg-teal-500', hoverClass: 'group-hover:bg-teal-600', ringClass: 'group-focus-visible:ring-teal-500' },

  // Row 2: Guest Management & Experience
  { label: 'Guest List', icon: 'i-lucide-users', action: 'guestList', bgClass: 'bg-orange-500', hoverClass: 'group-hover:bg-orange-600', ringClass: 'group-focus-visible:ring-orange-500' },
  { label: 'Gifts', icon: 'i-lucide-gift', action: 'wishlist', bgClass: 'bg-pink-500', hoverClass: 'group-hover:bg-pink-600', ringClass: 'group-focus-visible:ring-pink-500' },
  { label: 'Playlist', icon: 'i-lucide-music', action: 'playlist', bgClass: 'bg-lime-500', hoverClass: 'group-hover:bg-lime-600', ringClass: 'group-focus-visible:ring-lime-500' },

  // Row 3: Planning, Logistics & Execution
  { label: 'Tasks', icon: 'i-lucide-list-todo', action: 'tasks', bgClass: 'bg-red-500', hoverClass: 'group-hover:bg-red-600', ringClass: 'group-focus-visible:ring-red-500' },
  { label: 'Schedules', icon: 'i-lucide-calendar', action: 'schedules', bgClass: 'bg-cyan-500', hoverClass: 'group-hover:bg-cyan-600', ringClass: 'group-focus-visible:ring-cyan-500' },
  { label: 'Suppliers', icon: 'i-lucide-briefcase', action: 'suppliers', bgClass: 'bg-fuchsia-500', hoverClass: 'group-hover:bg-fuchsia-600', ringClass: 'group-focus-visible:ring-fuchsia-500' },

  // Row 4: Compliance, Financials & Administration
  { label: 'Requirements', icon: 'i-lucide-church', action: 'churchRequirements', weddingOnly: true, bgClass: 'bg-yellow-500', hoverClass: 'group-hover:bg-yellow-600', ringClass: 'group-focus-visible:ring-yellow-500' },
  { label: 'Payments', icon: 'i-lucide-credit-card', action: 'payments', bgClass: 'bg-emerald-500', hoverClass: 'group-hover:bg-emerald-600', ringClass: 'group-focus-visible:ring-emerald-500' },
  { label: 'Settings', icon: 'i-lucide-settings', action: 'settings', bgClass: 'bg-slate-500', hoverClass: 'group-hover:bg-slate-600', ringClass: 'group-focus-visible:ring-slate-500' },
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

const isUpgradeModalOpen = ref(false)
const selectedLockedFeature = ref<DashboardItem | null>(null)

const DESKTOP_ONLY_ACTIONS: DashboardAction[] = ['website', 'invitation', 'guestList']
const isDesktopOnlyModalOpen = ref(false)
const selectedDesktopOnlyFeature = ref<DashboardItem | null>(null)

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
}

const showTasksChecklist = computed(() =>
  isEventFeatureAllowed(eventRecord.value, EVENT_FEATURE.TASKS)
)

function handleDashboardItemClick(item: DashboardItem) {
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
        <UBadge v-if="eventRecord" :color="planBadgeColor" variant="solid" size="lg"
          class="text-black rounded-full shadow-sm">
          {{ formatEventPriceTier(eventRecord) }}
        </UBadge>
      </Teleport>
    </ClientOnly>

    <!-- Layout when Tasks Checklist is active (Butter & Bread + Butter packages) -->
    <UPageGrid v-if="showTasksChecklist" class="h-full overflow-hidden">
      <UContainer class="white-bread-container h-full flex flex-col col-span-2 overflow-hidden"
        style="border-radius: 0;">
        <div class="flex flex-1 items-center justify-center min-h-0 py-2 sm:py-4 px-3 sm:px-4 w-full">
          <div
            class="grid grid-cols-3 gap-x-3 sm:gap-x-6 md:gap-x-8 gap-y-4 sm:gap-y-5 md:gap-y-6 max-w-sm sm:max-w-md md:max-w-lg mx-auto w-full items-center justify-items-center">
            <div v-for="item in dashboardItems" :key="item.label" role="button" :tabindex="0"
              class="group flex flex-col items-center justify-center mx-auto w-full p-1 sm:p-1.5 md:p-2 rounded-xl focus-visible:outline-none text-center cursor-pointer select-none"
              @click="handleDashboardItemClick(item)" @keydown.enter="handleDashboardItemKeydown($event, item)">
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
          @click="handleDashboardItemClick(item)" @keydown.enter="handleDashboardItemKeydown($event, item)">
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

    <!-- Upgrade Package Modal -->
    <UModal v-model:open="isUpgradeModalOpen" :ui="{
      content: 'bread-container max-w-lg p-6 space-y-6',
      overlay: 'bg-toast-950/40 backdrop-blur-xs'
    }">
      <template #content>
        <div class="space-y-6 text-toast-900">
          <!-- Modal Header -->
          <div class="text-center space-y-2">

            <div class="flex justify-between">
              <div class="w-8"></div>
              <div class="w-12 h-12 rounded-full bg-toast-600/10 text-toast-600 flex items-center justify-center">
                <UIcon :name="selectedLockedFeature?.icon || 'i-lucide-sparkles'" class="size-6 text-toast-600" />
              </div>
              <div class="w-8 flex justify-end items-start">
                <UButton icon="i-lucide-x" variant="link" color="neutral"
                  @click="() => { isUpgradeModalOpen = false }" />
              </div>
            </div>
            <h3 class="text-2xl font-bold font-serif text-toast-800">
              Upgrade to Unlock {{ selectedLockedFeature?.label }}
            </h3>
            <p class="text-sm text-toast-800/80 max-w-sm mx-auto">
              The <span class="font-bold">{{ selectedLockedFeature?.label }}</span> tool is available on higher tiers.
              Level up your celebration with more power.
            </p>
          </div>

          <!-- Package Highlights -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <!-- Butter -->
            <div
              class="bg-white/90 p-4 rounded-xl border border-toast-300/40 space-y-3 flex flex-col justify-between shadow-xs">
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="font-bold font-serif text-lg text-toast-900">Butter</span>
                  <UBadge color="warning" variant="subtle" size="xs">Popular</UBadge>
                </div>
                <p class="text-xs text-toast-800/80">
                  Essential planning tools to manage tasks, schedules, and suppliers.
                </p>
                <ul class="text-xs space-y-1.5 pt-1 text-toast-900">
                  <li class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-check" class="size-3.5 text-emerald-600 shrink-0" />
                    <span>Tasks Checklist</span>
                  </li>
                  <li class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-check" class="size-3.5 text-emerald-600 shrink-0" />
                    <span>Event Schedules</span>
                  </li>
                  <li class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-check" class="size-3.5 text-emerald-600 shrink-0" />
                    <span>Suppliers & Budget</span>
                  </li>
                  <li class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-check" class="size-3.5 text-emerald-600 shrink-0" />
                    <span>Requirements</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Bread + Butter -->
            <div
              class="bg-toast-600 text-white p-4 rounded-xl shadow-md space-y-3 flex flex-col justify-between ring-2 ring-toast-600">
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="font-bold font-serif text-lg text-white">Bread + Butter</span>
                  <UBadge color="bread" variant="solid" size="xs" class="text-toast-900 font-bold bg-bread-400">
                    All-in-One</UBadge>
                </div>
                <p class="text-xs text-white/80">
                  Everything in Butter plus team collaboration and guest management.
                </p>
                <ul class="text-xs space-y-1.5 pt-1 text-white">
                  <li class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-check" class="size-3.5 text-bread-300 shrink-0" />
                    <span>Everything in Butter</span>
                  </li>
                  <li class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-check" class="size-3.5 text-bread-300 shrink-0" />
                    <span>Planners & Collaborators</span>
                  </li>
                  <li class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-check" class="size-3.5 text-bread-300 shrink-0" />
                    <span>Guest Groups & Tables</span>
                  </li>
                  <li class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-check" class="size-3.5 text-bread-300 shrink-0" />
                    <span>Higher Email Limits</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-2.5 pt-2">
            <UButton block color="primary" size="lg"
              class="font-bold shadow-md flex-1 bg-toast-600 hover:bg-toast-700 text-white"
              :to="{ path: '/event/payment-review', query: { eventId: eventId || undefined } }"
              @click="() => { isUpgradeModalOpen = false }">
              Upgrade Event Package
            </UButton>
            <UButton block variant="outline" color="neutral" size="lg"
              class="font-medium sm:w-auto text-toast-800 border-toast-300 hover:bg-toast-50"
              @click="() => { isUpgradeModalOpen = false }">
              Maybe Later
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

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
  </UMain>

</template>

<style></style>
