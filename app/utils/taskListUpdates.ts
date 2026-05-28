import type { TasksSummary } from '~/types/event'
import type { TaskRecord, TaskStatus } from '~/types/task'

export interface TasksByStatusGroups {
  ONGOING: TaskRecord[]
  COMPLETED: TaskRecord[]
  CANCELLED: TaskRecord[]
}

export function isParentTask(task: TaskRecord): boolean {
  return task.parentTask == null
}

export function groupTasksByStatus(tasks: TaskRecord[]): TasksByStatusGroups {
  const parents = tasks.filter(isParentTask)
  return {
    ONGOING: parents.filter((task) => task.status === 'ONGOING'),
    COMPLETED: parents.filter((task) => task.status === 'COMPLETED'),
    CANCELLED: parents.filter((task) => task.status === 'CANCELLED'),
  }
}

export function moveTaskInList(
  tasks: TaskRecord[],
  taskId: string,
  newStatus: TaskStatus
): TaskRecord[] {
  return tasks.map((task) =>
    task._id === taskId ? { ...task, status: newStatus } : task
  )
}

export function updateTaskInList(tasks: TaskRecord[], updated: TaskRecord): TaskRecord[] {
  return tasks.map((task) => (task._id === updated._id ? { ...task, ...updated } : task))
}

export function appendTaskToList(tasks: TaskRecord[], task: TaskRecord): TaskRecord[] {
  if (tasks.some((entry) => entry._id === task._id)) {
    return tasks
  }
  return [...tasks, task]
}

export function removeTaskFromList(tasks: TaskRecord[], taskId: string): TaskRecord[] {
  return tasks
    .filter((task) => task._id !== taskId)
    .map((task) =>
      String(task.parentTask) === String(taskId) ? { ...task, parentTask: null } : task
    )
}

/** Task Tracker: completed vs active total (ongoing + completed; excludes cancelled). */
export function getTaskTrackerMetrics(byStatus: Record<string, number>) {
  const ongoing = byStatus.ONGOING ?? 0
  const completed = byStatus.COMPLETED ?? 0
  const activeTotal = ongoing + completed
  return { ongoing, completed, activeTotal }
}

export function patchTaskSummaryCounts(
  summary: TasksSummary | null,
  tasks: TaskRecord[]
): TasksSummary | null {
  if (!summary) {
    return summary
  }

  const parents = tasks.filter(isParentTask)
  const byStatus = parents.reduce<Record<string, number>>((acc, task) => {
    acc[task.status] = (acc[task.status] ?? 0) + 1
    return acc
  }, {})

  const totalAllocatedBudget = parents.reduce((sum, task) => sum + (task.budget ?? 0), 0)

  return {
    ...summary,
    totalTasks: parents.length,
    totalAllocatedBudget,
    byStatus,
    preview: {
      ...summary.preview,
      tasks: parents.slice(0, summary.preview.limit),
    },
  }
}
