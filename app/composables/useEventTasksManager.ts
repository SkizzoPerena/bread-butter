import type { TasksSummary } from '~/types/event'
import type { AssigneeRecord } from '~/types/assignee'
import type { TaskRecord, TaskStatus } from '~/types/task'
import { reportApiError } from '~/types/auth'
import { buildAssigneeSelectItems } from '~/utils/taskAssignee'
import {
  isParentTask,
  isActiveTaskStatus,
  moveTaskInList,
  patchTaskSummaryCounts,
  removeTaskFromList,
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
    updateTaskAssignee,
    hardDeleteTask,
  } = useTasks()
  const { fetchAssigneesByEvent } = useAssignees()

  const tasks = ref<TaskRecord[]>([])
  const assignees = ref<AssigneeRecord[]>([])
  const isLoading = ref(false)
  const isLoadingAssignees = ref(false)
  const updatingTaskId = ref<string | null>(null)
  const searchQuery = ref('')
  const priorityFilter = ref<PriorityFilterValue>('all')
  const sortBy = ref<TaskSortBy>('deadline')
  const selectedTab = ref(0)

  const isFormOpen = ref(false)
  const editingTask = ref<TaskRecord | null>(null)
  const isDetailsOpen = ref(false)
  const selectedTask = ref<TaskRecord | null>(null)
  const isRemoveModalOpen = ref(false)
  const taskForRemove = ref<TaskRecord | null>(null)
  const isRemoveSubmitting = ref(false)
  const isManageAssigneesOpen = ref(false)
  const collapsedGroups = ref<Partial<Record<TaskStatus, boolean>>>({})

  const mutationsDisabled = computed(() => Boolean(options.isEventCancelled?.value))

  function toggleGroup(status: TaskStatus) {
    collapsedGroups.value = {
      ...collapsedGroups.value,
      [status]: !collapsedGroups.value[status],
    }
  }

  const assigneeSelectItems = computed(() => buildAssigneeSelectItems(assignees.value))

  const filteredTasks = computed(() => {
    let list = tasks.value.filter(isParentTask).filter((task) => isActiveTaskStatus(task.status))
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

  const tabStatuses: TaskStatus[] = ['TODO', 'ONGOING', 'COMPLETED']

  const tabSlots = ['todo', 'ongoing', 'completed'] as const

  const tabItems = computed(() =>
    tabStatuses.map((status, index) => ({
      label: `${statusLabel(status)} (${statusCount(status)})`,
      value: index,
      slot: tabSlots[index],
    }))
  )

  function statusLabel(status: TaskStatus): string {
    if (status === 'TODO') return 'To Do'
    if (status === 'ONGOING') return 'Ongoing'
    if (status === 'COMPLETED') return 'Completed'
    return status
  }

  function tasksForTab(tabIndex: number): TaskRecord[] {
    const status = tabStatuses[tabIndex]
    if (!status) return []
    return filteredTasks.value.filter((task) => task.status === status)
  }

  function tasksForStatus(status: TaskStatus): TaskRecord[] {
    return filteredTasks.value.filter((task) => task.status === status)
  }

  function statusCount(status: TaskStatus): number {
    return tasks.value
      .filter(isParentTask)
      .filter((task) => isActiveTaskStatus(task.status))
      .filter((task) => task.status === status).length
  }

  function syncSummary() {
    if (!options.onSummarySync || !options.tasksSummary) {
      return
    }
    const summary = options.tasksSummary.value ?? null
    options.onSummarySync(patchTaskSummaryCounts(summary, tasks.value))
  }

  async function loadAssignees() {
    if (!options.eventId.value && !isUiOnlyMode.value) {
      assignees.value = []
      return
    }

    const targetEventId = options.eventId.value || 'mock-event-id'
    isLoadingAssignees.value = true
    try {
      assignees.value = await fetchAssigneesByEvent(targetEventId)
    } catch (error) {
      reportApiError(toast, { title: 'Could not load assignees', error })
      assignees.value = []
    } finally {
      isLoadingAssignees.value = false
    }
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

  async function reloadAll() {
    await Promise.all([loadTasks(), loadAssignees()])
  }

  watch(
    () => options.eventId.value,
    () => {
      reloadAll()
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

  function openManageAssigneesModal() {
    isManageAssigneesOpen.value = true
  }

  function openRemoveModal(task: TaskRecord) {
    if (task.status !== 'TODO') {
      return
    }
    taskForRemove.value = task
    isRemoveModalOpen.value = true
  }

  function closeRemoveModal() {
    isRemoveModalOpen.value = false
    taskForRemove.value = null
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

  function handleMoveToTodo(task: TaskRecord) {
    return handleStatusChange({ taskId: task._id, status: 'TODO' })
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

  async function handleAssigneeChange(payload: { taskId: string; assigneeId: string | null }) {
    if (mutationsDisabled.value) {
      return
    }

    const previous = tasks.value.find((task) => task._id === payload.taskId)
    if (!previous) {
      return
    }

    const nextAssignee =
      payload.assigneeId == null
        ? null
        : assignees.value.find((item) => item._id === payload.assigneeId) ?? null

    tasks.value = tasks.value.map((task) =>
      task._id === payload.taskId
        ? {
            ...task,
            assignee: nextAssignee
              ? { _id: nextAssignee._id, name: nextAssignee.name }
              : null,
          }
        : task
    )
    updatingTaskId.value = payload.taskId

    try {
      const response = await updateTaskAssignee(payload.taskId, payload.assigneeId)
      if (response.task) {
        tasks.value = updateTaskInList(tasks.value, response.task as TaskRecord)
      }
    } catch (error) {
      tasks.value = updateTaskInList(tasks.value, previous)
      reportApiError(toast, { title: 'Could not update assignee', error })
    } finally {
      updatingTaskId.value = null
    }
  }

  async function handleFormSaved() {
    await reloadAll()
  }

  async function handleAssigneesChanged() {
    await reloadAll()
  }

  async function confirmRemoveTask() {
    if (!taskForRemove.value || mutationsDisabled.value || taskForRemove.value.status !== 'TODO') {
      return
    }

    const taskId = taskForRemove.value._id
    isRemoveSubmitting.value = true
    try {
      const response = await hardDeleteTask(taskId)
      tasks.value = removeTaskFromList(tasks.value, taskId)
      syncSummary()
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
      closeRemoveModal()
    } catch (error) {
      reportApiError(toast, { title: 'Could not remove task', error })
    } finally {
      isRemoveSubmitting.value = false
    }
  }

  return {
    isUiOnlyMode,
    tasks,
    assignees,
    assigneeSelectItems,
    isLoading,
    isLoadingAssignees,
    updatingTaskId,
    searchQuery,
    priorityFilter,
    sortBy,
    selectedTab,
    tabItems,
    isFormOpen,
    editingTask,
    isDetailsOpen,
    selectedTask,
    isRemoveModalOpen,
    taskForRemove,
    isRemoveSubmitting,
    isManageAssigneesOpen,
    collapsedGroups,
    mutationsDisabled,
    toggleGroup,
    filteredTasks,
    tasksForTab,
    tasksForStatus,
    statusCount,
    statusLabel,
    loadTasks,
    loadAssignees,
    reloadAll,
    openCreateModal,
    openDetailsModal,
    openEditModal,
    openManageAssigneesModal,
    openRemoveModal,
    closeRemoveModal,
    handleStatusChange,
    handleMoveToTodo,
    handlePriorityChange,
    handleAssigneeChange,
    handleFormSaved,
    handleAssigneesChanged,
    confirmRemoveTask,
  }
}
