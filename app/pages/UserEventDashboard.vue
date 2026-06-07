<script lang="ts" setup>
import { DateFormatter, CalendarDate, getLocalTimeZone } from '@internationalized/date'
import type { EventRecord, TasksSummary } from '~/types/event'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { getTaskTrackerMetrics } from '~/utils/taskListUpdates'
import { defaultCover, resolveEventCoverImageUrl } from '~/utils/eventImage'
import demoCoverImage from '~/assets/bpb-images/wedding-1.jpg'
import type { TaskStatus } from '~/types/task'

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

const DEMO_TASK_BUDGET_TOTAL = 20000 + 15000 + 10000 + 5000 + 30000 + 8000 + 100000 + 200000 + 0 + 12000

function formatPesoAmount(amount: number): string {
  return `${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pesos`
}

const currentBudgetLabel = computed(() => {
  if (tasksSummary.value) {
    if (tasksSummary.value.totalTasks === 0 || tasksSummary.value.totalAllocatedBudget === 0) {
      return 'No Budget Yet'
    }
    return formatPesoAmount(tasksSummary.value.totalAllocatedBudget)
  }
  if (useDemoFallbacks.value) {
    return formatPesoAmount(DEMO_TASK_BUDGET_TOTAL)
  }
  return 'No Budget Yet'
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
const modelValue = shallowRef(new CalendarDate(2025, 5, 18))

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
    const detail = await loadPageData({
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
        },
        guestList: [],
        rsvpSummary: null,
        tasks: {
          totalTasks: 4,
          totalAllocatedBudget: 95000,
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
                budget: 50000,
                status: 'TODO',
                priority: 2,
                deadline: '2026-08-15T00:00:00.000Z',
              },
              {
                _id: 'mock-task-1',
                title: 'Book a photo booth',
                details: 'Find and book a photo booth service for the reception.',
                budget: 20000,
                status: 'ONGOING',
                priority: 1,
                deadline: '2026-06-15T00:00:00.000Z',
              },
              {
                _id: 'mock-task-2',
                title: 'Finalize catering menu',
                details: 'Confirm final menu choices with the caterer.',
                budget: 15000,
                status: 'ONGOING',
                priority: 3,
                deadline: '2026-07-01T00:00:00.000Z',
              },
              {
                _id: 'mock-task-3',
                title: 'Send wedding invitations',
                details: 'Design, print, and mail invitations.',
                budget: 10000,
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
  navigateTo({ path: '/WebsiteMaker', query: { eventId: id } })
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
  navigateTo({ path: '/InvitationMaker', query: { eventId: id } })
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
  navigateTo({ path: '/EventGuestsDashboard', query: { eventId: id } })
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
  navigateTo({ path: '/EventTasksDashboard', query: { eventId: id } })
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
  navigateTo({ path: '/EventSettingsDashboard', query: { eventId: id } })
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
  navigateTo({ path: '/EventPaymentReview', query: { eventId: id } })
}

type DashboardItem = {
  label: string
  icon: string
  action?: 'website' | 'invitation' | 'guestList' | 'tasks' | 'settings' | 'payments'
  bgClass: string
  hoverClass: string
  ringClass: string
}

function handleDashboardItemClick(item: DashboardItem) {
  if (item.action === 'website') {
    openWebsiteMaker()
  } else if (item.action === 'invitation') {
    openInvitationMaker()
  } else if (item.action === 'guestList') {
    openGuestList()
  } else if (item.action === 'tasks') {
    openTasksDashboard()
  } else if (item.action === 'settings') {
    openEventSettings()
  } else if (item.action === 'payments') {
    openPayments()
  }
}

function handleDashboardItemKeydown(event: KeyboardEvent, item: DashboardItem) {
  if (event.key === 'Enter') {
    handleDashboardItemClick(item)
  }
}

const dashboardItems: DashboardItem[] = [
  { label: 'Website', icon: 'i-lucide-globe', action: 'website', bgClass: 'bg-blue-500', hoverClass: 'group-hover:bg-blue-600', ringClass: 'group-focus-visible:ring-blue-500' },
  { label: 'Invitation', icon: 'i-lucide-send', action: 'invitation', bgClass: 'bg-purple-500', hoverClass: 'group-hover:bg-purple-600', ringClass: 'group-focus-visible:ring-purple-500' },
  { label: 'Payments', icon: 'i-lucide-credit-card', action: 'payments', bgClass: 'bg-teal-500', hoverClass: 'group-hover:bg-teal-600', ringClass: 'group-focus-visible:ring-teal-500' },
  { label: 'Tasks', icon: 'i-lucide-list-todo', action: 'tasks', bgClass: 'bg-rose-500', hoverClass: 'group-hover:bg-rose-600', ringClass: 'group-focus-visible:ring-rose-500' },
  { label: 'RSVP', icon: 'i-lucide-mail', bgClass: 'bg-emerald-500', hoverClass: 'group-hover:bg-emerald-600', ringClass: 'group-focus-visible:ring-emerald-500' },
  { label: 'Sub-Events', icon: 'i-lucide-pen-tool', bgClass: 'bg-indigo-500', hoverClass: 'group-hover:bg-indigo-600', ringClass: 'group-focus-visible:ring-indigo-500' },
  { label: 'Guest List', icon: 'i-lucide-users', action: 'guestList', bgClass: 'bg-orange-500', hoverClass: 'group-hover:bg-orange-600', ringClass: 'group-focus-visible:ring-orange-500' },
  { label: 'Schedules', icon: 'i-lucide-calendar', bgClass: 'bg-pink-500', hoverClass: 'group-hover:bg-pink-600', ringClass: 'group-focus-visible:ring-pink-500' },
  { label: 'Settings', icon: 'i-lucide-settings', action: 'settings', bgClass: 'bg-slate-500', hoverClass: 'group-hover:bg-slate-600', ringClass: 'group-focus-visible:ring-slate-500' },
]

</script>

<template>
  <UMain class="bg-toast-50">

    <UPageGrid>
      <UContainer class="col-span-2 space-y-6 white-bread-container" style="border-radius: 0;">

<div class="flex items-center justify-center h-full">
        <UPageColumns :ui="{base: 'gap-25 space-y-3'}">
          
          <div
            v-for="item in dashboardItems"
            :key="item.label"
            role="button"
            tabindex="0"
            class="group flex flex-col items-center justify-center aspect-square mx-auto w-fit h-fit p-4 cursor-pointer rounded-xl focus-visible:outline-none text-center"
            :class="{
              'opacity-50 pointer-events-none':
                (item.action === 'website' || item.action === 'invitation') && (isEventCancelled || (!eventId && !isUiOnlyMode)),
            }"
            @click="handleDashboardItemClick(item)"
            @keydown.enter="handleDashboardItemKeydown($event, item)"
          >
            <div
              class="p-2 aspect-square flex flex-col items-center justify-center rounded-full transition-all duration-200 group-active:scale-95 group-focus-visible:ring-2"
              :class="[item.bgClass, item.hoverClass, item.ringClass]"
            >
              <UIcon :name="item.icon" class="size-9 m-2 text-white" />
            </div>
            <div class="font-medium mt-3 text-center">{{ item.label }}</div>
          </div>
        </UPageColumns>
</div>
      </UContainer>

      <!-- Tasks Container -->
      <UScrollArea class="h-[calc(100vh-64px)] py-6 pr-8">
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
                      <UFormField label="Priority" name="priority" required class="w-1/3">
                        <USelect :items="taskPriorities" placeholder="Select priority" class="w-full" />
                      </UFormField>
                      <UFormField label="Budget" name="budget" required class="w-1/3">
                        <UInputNumber :increment="false" :decrement="false" class="w-full" placeholder="in Php" />
                      </UFormField>
                      <UFormField label="Event Date" name="date" required class="w-1/3">
                        <UPopover>
                          <UButton color="neutral" variant="outline" class="w-full">
                            {{ modelValue ? df.format(modelValue.toDate(getLocalTimeZone())) : 'Select a date' }}
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
                <UBadge :color="getPriorityColor(task.priority)" variant="subtle">{{ getPriorityLabel(task.priority) }}</UBadge>
              </div>
              <p class="text-sm text-muted mt-1">{{ task.details }}</p>
              <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                <div class="flex items-center gap-1.5" v-if="task.deadline">
                  <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                  <span>Due: {{ df.format(new Date(task.deadline)) }}</span>
                </div>
                <div class="flex items-center gap-1.5" v-if="task.budget">
                  <UIcon name="i-lucide-wallet" class="text-muted" />
                  <span>Budget: Php {{ task.budget.toLocaleString() }}</span>
                </div>
              </div>
              <UButton
                block
                class="mt-4"
                :loading="updatingPreviewTaskId === task._id"
                :disabled="isEventCancelled"
                @click="changeTaskStatus(task, 'ONGOING')"
              >
                Mark as Ongoing
              </UButton>
            </UPageCard>
            <div v-if="todoTasks.length === 0" class="text-sm text-muted text-center py-4">No tasks to do.</div>
          </div>

          <div v-show="selectedTab == 1" class="space-y-4">
            <UPageCard v-for="task in ongoingTasks" :key="task._id" class="white-bread-container">
              <div class="flex justify-between items-start">
                <div class="font-semibold">{{ task.title }}</div>
                <UBadge :color="getPriorityColor(task.priority)" variant="subtle">{{ getPriorityLabel(task.priority) }}</UBadge>
              </div>
              <p class="text-sm text-muted mt-1">{{ task.details }}</p>
              <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                <div class="flex items-center gap-1.5" v-if="task.deadline">
                  <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                  <span>Due: {{ df.format(new Date(task.deadline)) }}</span>
                </div>
                <div class="flex items-center gap-1.5" v-if="task.budget">
                  <UIcon name="i-lucide-wallet" class="text-muted" />
                  <span>Budget: Php {{ task.budget.toLocaleString() }}</span>
                </div>
              </div>
              <UButton
                block
                class="mt-4"
                :loading="updatingPreviewTaskId === task._id"
                :disabled="isEventCancelled"
                @click="changeTaskStatus(task, 'COMPLETED')"
              >
                Mark as Complete
              </UButton>
            </UPageCard>
            <div v-if="ongoingTasks.length === 0" class="text-sm text-muted text-center py-4">No ongoing tasks.</div>
          </div>

          <div v-show="selectedTab == 2" class="space-y-4">
            <UPageCard v-for="task in completedTasks" :key="task._id" class="white-bread-container">
              <div class="flex justify-between items-start">
                <div class="font-semibold">{{ task.title }}</div>
                <UBadge :color="getPriorityColor(task.priority)" variant="subtle">{{ getPriorityLabel(task.priority) }}</UBadge>
              </div>
              <p class="text-sm text-muted mt-1">{{ task.details }}</p>
              <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                <div class="flex items-center gap-1.5" v-if="task.deadline">
                  <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                  <span>Completed: {{ df.format(new Date(task.deadline)) }}</span>
                </div>
                <div class="flex items-center gap-1.5" v-if="task.budget">
                  <UIcon name="i-lucide-wallet" class="text-muted" />
                  <span>Budget: Php {{ task.budget.toLocaleString() }}</span>
                </div>
              </div>
              <UButton
                block
                class="mt-4"
                variant="outline"
                color="neutral"
                :loading="updatingPreviewTaskId === task._id"
                :disabled="isEventCancelled"
                @click="changeTaskStatus(task, 'ONGOING')"
              >
                Mark as Ongoing
              </UButton>
            </UPageCard>
            <div v-if="completedTasks.length === 0" class="text-sm text-muted text-center py-4">No completed tasks.</div>
          </div>
        </UContainer>
      </UScrollArea>
    </UPageGrid>
  </UMain>

</template>

<style></style>
