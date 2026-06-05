<script lang="ts" setup>
import type { EventRecord, TaskPreview, TasksSummary } from '~/types/event'
import type { TaskStatus } from '~/types/task'
import { reportApiError } from '~/types/auth'
import { mapTaskPriority } from '~/utils/taskPriority'
import { formatTaskBudget, formatTaskDate } from '~/utils/taskFormat'

const props = defineProps<{
  eventId: string
  eventRecord: EventRecord | null
  tasksSummary: TasksSummary | null
  isEventCancelled?: boolean
  isLoading?: boolean
}>()

const emit = defineEmits<{
  refresh: []
  'update:tasksSummary': [value: TasksSummary | null]
}>()

const toast = useToast()
const { updateTaskStatus } = useTasks()

const updatingTaskId = ref<string | null>(null)
const isFormOpen = ref(false)

const previewLimit = computed(() => props.tasksSummary?.preview.limit ?? 5)

const showViewAll = computed(() => {
  const total = props.tasksSummary?.totalTasks ?? 0
  return total > previewLimit.value
})

function statusCount(status: TaskStatus): number {
  return props.tasksSummary?.byStatus[status] ?? 0
}

const tabItems = computed(() => {
  const items: { label: string; slot: string }[] = [
    { label: `Ongoing (${statusCount('ONGOING')})`, slot: 'ongoing' },
    { label: `Completed (${statusCount('COMPLETED')})`, slot: 'completed' },
  ]
  if (statusCount('CANCELLED') > 0) {
    items.push({ label: `Cancelled (${statusCount('CANCELLED')})`, slot: 'cancelled' })
  }
  return items
})

function previewTasksForStatus(status: TaskStatus): TaskPreview[] {
  return props.tasksSummary?.preview.tasks.filter((task) => task.status === status) ?? []
}

function priorityMeta(task: TaskPreview) {
  return mapTaskPriority(task.priority)
}

function dateLabel(task: TaskPreview): string | null {
  const formatted = formatTaskDate(task.deadline)
  if (!formatted) {
    return null
  }
  if (task.status === 'COMPLETED') {
    return `Completed: ${formatted}`
  }
  return `Due: ${formatted}`
}

async function handleStatusChange(task: TaskPreview, status: TaskStatus) {
  if (props.isEventCancelled) {
    return
  }

  updatingTaskId.value = task._id
  try {
    await updateTaskStatus(task._id, status)
    toast.add({
      title: 'Task updated',
      description: `Moved to ${status === 'ONGOING' ? 'Ongoing' : status === 'COMPLETED' ? 'Completed' : 'Cancelled'}.`,
      color: 'success',
    })
    emit('refresh')
  } catch (error) {
    reportApiError(toast, { title: 'Could not update task', error })
  } finally {
    updatingTaskId.value = null
  }
}

function onTaskSaved() {
  isFormOpen.value = false
  emit('refresh')
}

function goToTasksDashboard() {
  navigateTo({
    path: '/EventTasksDashboard',
    query: { eventId: props.eventId },
  })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="text-xl font-bold uppercase text-muted">Tasks Checklist</div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          v-if="showViewAll"
          variant="link"
          color="primary"
          trailing-icon="i-lucide-arrow-right"
          @click="goToTasksDashboard"
        >
          View All
        </UButton>
        <UButton
          icon="i-lucide-list-plus"
          :disabled="isEventCancelled || !eventId"
          @click="isFormOpen = true"
        >
          Add New Task
        </UButton>
      </div>
    </div>

    <div
      v-if="isLoading"
      class="flex items-center justify-center py-12 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading tasks...</span>
    </div>

    <template v-else-if="!tasksSummary || tasksSummary.totalTasks === 0">
      <UPageCard class="white-bread-container">
        <p class="text-sm text-muted">No tasks yet. Add a task to start your checklist.</p>
      </UPageCard>
    </template>

    <UTabs
      v-else
      :items="tabItems"
      variant="link"
    >
      <template #ongoing>
        <div class="mt-4 space-y-4">
          <UPageCard
            v-for="task in previewTasksForStatus('ONGOING')"
            :key="task._id"
            class="white-bread-container"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="font-semibold">{{ task.title }}</div>
              <UBadge
                :color="priorityMeta(task).color"
                variant="subtle"
              >
                {{ priorityMeta(task).label }}
              </UBadge>
            </div>

            <p
              v-if="task.details"
              class="mt-1 text-sm text-muted"
            >
              {{ task.details }}
            </p>

            <div
              v-if="dateLabel(task) || task.budget"
              class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"
            >
              <div
                v-if="dateLabel(task)"
                class="flex items-center gap-1.5 text-muted"
              >
                <UIcon name="i-lucide-calendar-clock" />
                <span>{{ dateLabel(task) }}</span>
              </div>
              <div
                v-if="task.budget"
                class="flex items-center gap-1.5 text-muted"
              >
                <UIcon name="i-lucide-wallet" />
                <span>Budget: {{ formatTaskBudget(task.budget) }}</span>
              </div>
            </div>

            <UButton
              v-if="!isEventCancelled"
              block
              class="mt-4"
              :loading="updatingTaskId === task._id"
              @click="handleStatusChange(task, 'COMPLETED')"
            >
              Mark as Complete
            </UButton>
          </UPageCard>

          <p
            v-if="previewTasksForStatus('ONGOING').length === 0"
            class="text-sm text-muted"
          >
            <template v-if="statusCount('ONGOING') > 0 && showViewAll">
              More ongoing tasks available.
              <UButton
                variant="link"
                color="primary"
                class="p-0 align-baseline"
                @click="goToTasksDashboard"
              >
                View All
              </UButton>
            </template>
            <template v-else>
              No ongoing tasks.
            </template>
          </p>
          <p
            v-else-if="statusCount('ONGOING') > previewTasksForStatus('ONGOING').length && showViewAll"
            class="text-center text-sm text-muted"
          >
            Showing {{ previewTasksForStatus('ONGOING').length }} of {{ statusCount('ONGOING') }}.
            <UButton
              variant="link"
              color="primary"
              class="p-0 align-baseline"
              @click="goToTasksDashboard"
            >
              View All
            </UButton>
          </p>
        </div>
      </template>

      <template #completed>
        <div class="mt-4 space-y-4">
          <UPageCard
            v-for="task in previewTasksForStatus('COMPLETED')"
            :key="task._id"
            class="white-bread-container"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="font-semibold">{{ task.title }}</div>
              <UBadge
                :color="priorityMeta(task).color"
                variant="subtle"
              >
                {{ priorityMeta(task).label }}
              </UBadge>
            </div>

            <p
              v-if="task.details"
              class="mt-1 text-sm text-muted"
            >
              {{ task.details }}
            </p>

            <div
              v-if="dateLabel(task) || task.budget"
              class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"
            >
              <div
                v-if="dateLabel(task)"
                class="flex items-center gap-1.5 text-muted"
              >
                <UIcon name="i-lucide-calendar-clock" />
                <span>{{ dateLabel(task) }}</span>
              </div>
              <div
                v-if="task.budget"
                class="flex items-center gap-1.5 text-muted"
              >
                <UIcon name="i-lucide-wallet" />
                <span>Budget: {{ formatTaskBudget(task.budget) }}</span>
              </div>
            </div>

            <UButton
              v-if="!isEventCancelled"
              block
              variant="outline"
              class="mt-4"
              :loading="updatingTaskId === task._id"
              @click="handleStatusChange(task, 'ONGOING')"
            >
              Mark as Ongoing
            </UButton>
          </UPageCard>

          <p
            v-if="previewTasksForStatus('COMPLETED').length === 0"
            class="text-sm text-muted"
          >
            <template v-if="statusCount('COMPLETED') > 0 && showViewAll">
              More completed tasks available.
              <UButton
                variant="link"
                color="primary"
                class="p-0 align-baseline"
                @click="goToTasksDashboard"
              >
                View All
              </UButton>
            </template>
            <template v-else>
              No completed tasks.
            </template>
          </p>
          <p
            v-else-if="statusCount('COMPLETED') > previewTasksForStatus('COMPLETED').length && showViewAll"
            class="text-center text-sm text-muted"
          >
            Showing {{ previewTasksForStatus('COMPLETED').length }} of {{ statusCount('COMPLETED') }}.
            <UButton
              variant="link"
              color="primary"
              class="p-0 align-baseline"
              @click="goToTasksDashboard"
            >
              View All
            </UButton>
          </p>
        </div>
      </template>

      <template #cancelled>
        <div class="mt-4 space-y-4">
          <UPageCard
            v-for="task in previewTasksForStatus('CANCELLED')"
            :key="task._id"
            class="white-bread-container"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="font-semibold">{{ task.title }}</div>
              <UBadge
                :color="priorityMeta(task).color"
                variant="subtle"
              >
                {{ priorityMeta(task).label }}
              </UBadge>
            </div>

            <p
              v-if="task.details"
              class="mt-1 text-sm text-muted"
            >
              {{ task.details }}
            </p>

            <div
              v-if="dateLabel(task) || task.budget"
              class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"
            >
              <div
                v-if="dateLabel(task)"
                class="flex items-center gap-1.5 text-muted"
              >
                <UIcon name="i-lucide-calendar-clock" />
                <span>{{ dateLabel(task) }}</span>
              </div>
              <div
                v-if="task.budget"
                class="flex items-center gap-1.5 text-muted"
              >
                <UIcon name="i-lucide-wallet" />
                <span>Budget: {{ formatTaskBudget(task.budget) }}</span>
              </div>
            </div>

            <UButton
              v-if="!isEventCancelled"
              block
              variant="outline"
              class="mt-4"
              :loading="updatingTaskId === task._id"
              @click="handleStatusChange(task, 'ONGOING')"
            >
              Restore task
            </UButton>
          </UPageCard>

          <p
            v-if="previewTasksForStatus('CANCELLED').length === 0"
            class="text-sm text-muted"
          >
            No cancelled tasks.
          </p>
          <p
            v-else-if="statusCount('CANCELLED') > previewTasksForStatus('CANCELLED').length && showViewAll"
            class="text-center text-sm text-muted"
          >
            Showing {{ previewTasksForStatus('CANCELLED').length }} of {{ statusCount('CANCELLED') }}.
            <UButton
              variant="link"
              color="primary"
              class="p-0 align-baseline"
              @click="goToTasksDashboard"
            >
              View All
            </UButton>
          </p>
        </div>
      </template>
    </UTabs>

    <TaskFormModal
      v-model:open="isFormOpen"
      :event-id="eventId"
      :event-record="eventRecord"
      :disabled="isEventCancelled"
      @saved="onTaskSaved"
    />
  </div>
</template>
