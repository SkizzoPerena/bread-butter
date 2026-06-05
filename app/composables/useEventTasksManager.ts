import type { TasksSummary } from '~/types/event'
import type { TaskRecord, TaskStatus } from '~/types/task'
import { reportApiError } from '~/types/auth'
import {
  isParentTask,
  moveTaskInList,
  patchTaskSummaryCounts,
  updateTaskInList,
} from '~/utils/taskListUpdates'
import type { PriorityFilterValue } from '~/utils/taskPriority'
import { matchesPriorityFilter } from '~/utils/taskPriority'

export type TaskSortBy = 'deadline' | 'priority'

export interface UseEventTasksManagerOptions {
  eventId: Ref<string>
  isEventCancelled?: Ref<boolean | undefined>
  tasksSummary?: Ref<TasksSummary | null | undefined>
  onSummarySync?: (value: TasksSummary | null) => void
}

export function useEventTasksManager(options: UseEventTasksManagerOptions) {
  const toast = useToast()
  const { isUiOnlyMode } = useApiMode()
  const {
    fetchTasksByEvent,
    updateTaskStatus,
    updateTaskPriority,
    hardDeleteTask,
  } = useTasks()

  const tasks = ref<TaskRecord[]>([])
  const isLoading = ref(false)
  const updatingTaskId = ref<string | null>(null)
  const searchQuery = ref('')
  const priorityFilter = ref<PriorityFilterValue>('all')
  const sortBy = ref<TaskSortBy>('deadline')
  const collapsedGroups = ref<Partial<Record<TaskStatus, boolean>>>({})

  const isFormOpen = ref(false)
  const editingTask = ref<TaskRecord | null>(null)
  const isDetailsOpen = ref(false)
  const selectedTask = ref<TaskRecord | null>(null)
  const isActionModalOpen = ref(false)
  const taskForAction = ref<TaskRecord | null>(null)
  const actionMode = ref<'cancel' | 'remove'>('cancel')
  const isActionSubmitting = ref(false)

  const mutationsDisabled = computed(() => Boolean(options.isEventCancelled?.value))

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

  function tasksForStatus(status: TaskStatus): TaskRecord[] {
    return filteredTasks.value.filter((task) => task.status === status)
  }

  function statusCount(status: TaskStatus): number {
    return tasks.value.filter(isParentTask).filter((task) => task.status === status).length
  }

  function syncSummary() {
    if (!options.onSummarySync || !options.tasksSummary) {
      return
    }
    const summary = options.tasksSummary.value ?? null
    options.onSummarySync(patchTaskSummaryCounts(summary, tasks.value))
  }

  async function loadTasks() {
    if (!options.eventId.value && !isUiOnlyMode.value) {
      tasks.value = []
      return
    }

    const targetEventId = options.eventId.value || 'mock-event-id'
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
    () => options.eventId.value,
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
    if (!taskForAction.value || options.isEventCancelled?.value) {
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
    if (!taskForAction.value || !options.isEventCancelled?.value) {
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

  return {
    isUiOnlyMode,
    tasks,
    isLoading,
    updatingTaskId,
    searchQuery,
    priorityFilter,
    sortBy,
    collapsedGroups,
    isFormOpen,
    editingTask,
    isDetailsOpen,
    selectedTask,
    isActionModalOpen,
    taskForAction,
    actionMode,
    isActionSubmitting,
    mutationsDisabled,
    actionModalTitle,
    filteredTasks,
    tasksForStatus,
    statusCount,
    loadTasks,
    openCreateModal,
    openDetailsModal,
    openEditModal,
    handleRestoreTask,
    openCancelModal,
    openRemoveModal,
    closeActionModal,
    handleStatusChange,
    handlePriorityChange,
    handleFormSaved,
    confirmTaskAction,
    toggleGroup,
  }
}
