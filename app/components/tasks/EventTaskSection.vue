<script lang="ts" setup>
import type { EventRecord, TasksSummary } from '~/types/event'
import type { TaskRecord, TaskStatus } from '~/types/task'
import { reportApiError } from '~/types/auth'
import {
  moveTaskInList,
  patchTaskSummaryCounts,
  updateTaskInList,
  isParentTask,
} from '~/utils/taskListUpdates'
import type { PriorityFilterValue } from '~/utils/taskPriority'
import { matchesPriorityFilter } from '~/utils/taskPriority'

const props = defineProps<{
  eventId: string
  eventRecord: EventRecord | null
  tasksSummary: TasksSummary | null
  isEventCancelled?: boolean
}>()

const emit = defineEmits<{
  'update:tasksSummary': [value: TasksSummary | null]
}>()

const toast = useToast()
const { isUiOnlyMode } = useApiMode()
const {
  fetchTasksByEvent,
  updateTaskStatus,
  updateTaskPriority,
  hardDeleteTask,
} = useTasks()

type SortBy = 'deadline' | 'priority'

const tasks = ref<TaskRecord[]>([])
const isLoading = ref(false)
const updatingTaskId = ref<string | null>(null)
const searchQuery = ref('')
const priorityFilter = ref<PriorityFilterValue>('all')
const sortBy = ref<SortBy>('deadline')
const collapsedGroups = ref<Partial<Record<TaskStatus, boolean>>>({})

const isFormOpen = ref(false)
const editingTask = ref<TaskRecord | null>(null)
const isDetailsOpen = ref(false)
const selectedTask = ref<TaskRecord | null>(null)
const isActionModalOpen = ref(false)
const taskForAction = ref<TaskRecord | null>(null)
const actionMode = ref<'cancel' | 'remove'>('cancel')
const isActionSubmitting = ref(false)

const mutationsDisabled = computed(() => Boolean(props.isEventCancelled))

const actionModalTitle = computed(() =>
  actionMode.value === 'remove' ? 'Permanently remove task' : 'Cancel task'
)

const filteredTasks = computed(() => {
  let list = tasks.value.filter(isParentTask)
  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    list = list.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        task.details.toLowerCase().includes(query)
    )
  }
  list = list.filter((task) => matchesPriorityFilter(task.priority, priorityFilter.value))

  if (sortBy.value === 'deadline') {
    list = [...list].sort((a, b) => {
      const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER
      const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER
      return aTime - bTime
    })
  } else {
    list = [...list].sort((a, b) => a.priority - b.priority)
  }

  return list
})

function syncSummary() {
  emit('update:tasksSummary', patchTaskSummaryCounts(props.tasksSummary, tasks.value))
}

async function loadTasks() {
  if (!props.eventId && !isUiOnlyMode.value) {
    tasks.value = []
    return
  }

  const targetEventId = props.eventId || 'mock-event-id'
  isLoading.value = true
  try {
    tasks.value = await fetchTasksByEvent(targetEventId)
    syncSummary()
  } catch (error) {
    reportApiError(toast, { title: 'Could not load tasks', error })
  } finally {
    isLoading.value = false
  }
}

watch(
  () => props.eventId,
  () => {
    loadTasks()
  },
  { immediate: true }
)

watch(tasks, () => {
  if (!selectedTask.value) {
    return
  }
  const updated = tasks.value.find((task) => task._id === selectedTask.value?._id)
  if (updated) {
    selectedTask.value = updated
  } else {
    selectedTask.value = null
    isDetailsOpen.value = false
  }
})

function openCreateModal() {
  editingTask.value = null
  isFormOpen.value = true
}

function openDetailsModal(task: TaskRecord) {
  selectedTask.value = task
  isDetailsOpen.value = true
}

function openEditModal(task: TaskRecord) {
  editingTask.value = task
  isFormOpen.value = true
}

async function handleRestoreTask(task: TaskRecord) {
  if (mutationsDisabled.value || task.status !== 'CANCELLED') {
    return
  }
  await handleStatusChange({ taskId: task._id, status: 'ONGOING' })
  toast.add({
    title: 'Task restored',
    description: 'The task was moved back to Ongoing.',
    color: 'success',
  })
}

function openCancelModal(task: TaskRecord) {
  taskForAction.value = task
  actionMode.value = 'cancel'
  isActionModalOpen.value = true
}

function openRemoveModal(task: TaskRecord) {
  taskForAction.value = task
  actionMode.value = 'remove'
  isActionModalOpen.value = true
}

function closeActionModal() {
  isActionModalOpen.value = false
  taskForAction.value = null
}

async function handleStatusChange(payload: { taskId: string; status: TaskStatus }) {
  if (mutationsDisabled.value) {
    return
  }

  const previous = tasks.value.find((task) => task._id === payload.taskId)
  if (!previous || previous.status === payload.status) {
    return
  }

  tasks.value = moveTaskInList(tasks.value, payload.taskId, payload.status)
  syncSummary()
  updatingTaskId.value = payload.taskId

  try {
    const response = await updateTaskStatus(payload.taskId, payload.status)
    if (response.task) {
      tasks.value = updateTaskInList(tasks.value, response.task as TaskRecord)
      syncSummary()
    }
  } catch (error) {
    tasks.value = moveTaskInList(tasks.value, payload.taskId, previous.status)
    syncSummary()
    reportApiError(toast, { title: 'Could not update task status', error })
  } finally {
    updatingTaskId.value = null
  }
}

async function handlePriorityChange(payload: { taskId: string; priority: number }) {
  if (mutationsDisabled.value) {
    return
  }

  const previous = tasks.value.find((task) => task._id === payload.taskId)
  if (!previous || previous.priority === payload.priority) {
    return
  }

  tasks.value = tasks.value.map((task) =>
    task._id === payload.taskId ? { ...task, priority: payload.priority } : task
  )
  updatingTaskId.value = payload.taskId

  try {
    await updateTaskPriority(payload.taskId, payload.priority)
  } catch (error) {
    tasks.value = updateTaskInList(tasks.value, previous)
    reportApiError(toast, { title: 'Could not update task priority', error })
  } finally {
    updatingTaskId.value = null
  }
}

async function handleFormSaved() {
  await loadTasks()
}

async function handleCancelTask() {
  if (!taskForAction.value || props.isEventCancelled) {
    return
  }

  const task = taskForAction.value
  if (task.status === 'CANCELLED') {
    closeActionModal()
    return
  }

  const previous = tasks.value.find((entry) => entry._id === task._id)
  if (!previous) {
    return
  }

  isActionSubmitting.value = true
  tasks.value = moveTaskInList(tasks.value, task._id, 'CANCELLED')
  syncSummary()

  try {
    const response = await updateTaskStatus(task._id, 'CANCELLED')
    if (response.task) {
      tasks.value = updateTaskInList(tasks.value, response.task as TaskRecord)
      syncSummary()
    }
    toast.add({
      title: 'Task cancelled',
      description: 'The task was moved to Cancelled.',
      color: 'success',
    })
    closeActionModal()
  } catch (error) {
    tasks.value = moveTaskInList(tasks.value, task._id, previous.status)
    syncSummary()
    reportApiError(toast, { title: 'Could not cancel task', error })
  } finally {
    isActionSubmitting.value = false
  }
}

async function handleRemoveTask() {
  if (!taskForAction.value || !props.isEventCancelled) {
    return
  }

  const taskId = taskForAction.value._id
  isActionSubmitting.value = true
  try {
    const response = await hardDeleteTask(taskId)
    await loadTasks()
    const promotedNote =
      response.promotedSubtasks && response.promotedSubtasks > 0
        ? ` ${response.promotedSubtasks} subtask(s) were promoted to main tasks.`
        : ''
    toast.add({
      title: 'Task removed',
      description: `${response.message}${promotedNote}`,
      color: 'success',
    })
    if (selectedTask.value?._id === taskId) {
      isDetailsOpen.value = false
      selectedTask.value = null
    }
    closeActionModal()
  } catch (error) {
    reportApiError(toast, { title: 'Could not remove task', error })
  } finally {
    isActionSubmitting.value = false
  }
}

async function confirmTaskAction() {
  if (actionMode.value === 'remove') {
    await handleRemoveTask()
  } else {
    await handleCancelTask()
  }
}

function toggleGroup(status: TaskStatus) {
  collapsedGroups.value = {
    ...collapsedGroups.value,
    [status]: !collapsedGroups.value[status],
  }
}
</script>

<template>
  <UPageCard class="white-bread-container space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="text-xl font-semibold uppercase text-muted">Tasks</div>
      <UButton
        icon="i-lucide-list-plus"
        :disabled="mutationsDisabled || (!eventId && !isUiOnlyMode)"
        @click="openCreateModal"
      >
        Add task
      </UButton>
    </div>

    <UAlert
      v-if="mutationsDisabled"
      color="warning"
      variant="subtle"
      title="Event cancelled"
      description="Tasks cannot be added or edited. Use Remove to permanently delete a task from this event."
    />

    <TaskToolbar
      v-model:search-query="searchQuery"
      v-model:priority-filter="priorityFilter"
      v-model:sort-by="sortBy"
    />

    <div v-if="isLoading" class="flex items-center justify-center py-12 text-muted">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading tasks...</span>
    </div>

    <TaskListView
      v-else
      :tasks="filteredTasks"
      :disabled="mutationsDisabled"
      :is-event-cancelled="isEventCancelled"
      :selected-task-id="selectedTask?._id"
      :collapsed-groups="collapsedGroups"
      :updating-task-id="updatingTaskId"
      @toggle-group="toggleGroup"
      @status-change="handleStatusChange"
      @priority-change="handlePriorityChange"
      @select="openDetailsModal"
      @edit="openEditModal"
      @cancel="openCancelModal"
      @restore="handleRestoreTask"
      @remove="openRemoveModal"
    />

    <TaskDetailsModal
      v-model:open="isDetailsOpen"
      :task="selectedTask"
    />

    <TaskFormModal
      v-model:open="isFormOpen"
      :event-id="eventId"
      :event-record="eventRecord"
      :task="editingTask"
      :disabled="mutationsDisabled"
      @saved="handleFormSaved"
    />

    <UModal
      v-model:open="isActionModalOpen"
      :title="actionModalTitle"
      :dismissible="!isActionSubmitting"
      :ui="{ content: 'border-none ring-transparent max-w-md' }"
    >
      <template #body>
        <p class="mb-4 text-sm text-muted">
          <template v-if="actionMode === 'remove'">
            Permanently remove
            <span class="font-medium text-highlighted">{{ taskForAction?.title }}</span>
            ? Any subtasks will become main tasks. Attached photos for this task will be deleted.
            This cannot be undone.
          </template>
          <template v-else>
            Cancel
            <span class="font-medium text-highlighted">{{ taskForAction?.title }}</span>
            ? It will move to the Cancelled section.
          </template>
        </p>
        <div class="flex justify-end gap-2">
          <UButton
            label="Back"
            color="neutral"
            variant="outline"
            :disabled="isActionSubmitting"
            @click="closeActionModal"
          />
          <UButton
            :label="actionMode === 'remove' ? 'Remove permanently' : 'Cancel task'"
            color="error"
            :loading="isActionSubmitting"
            @click="confirmTaskAction"
          />
        </div>
      </template>
    </UModal>
  </UPageCard>
</template>
