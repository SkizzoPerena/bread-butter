import type { TaskRecord } from '~/types/task'

export function getDeadlineStorageKey(eventId: string): string {
  return `bpb_task_deadlines_${eventId || 'mock-event-id'}`
}

export function getTaskDeadlineOverrides(eventId: string): Record<string, string> {
  if (!import.meta.client) return {}
  try {
    const raw = localStorage.getItem(getDeadlineStorageKey(eventId))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export function setTaskDeadlineOverride(eventId: string, taskId: string, deadline: string): void {
  if (!import.meta.client) return
  try {
    const overrides = getTaskDeadlineOverrides(eventId)
    overrides[taskId] = deadline
    localStorage.setItem(getDeadlineStorageKey(eventId), JSON.stringify(overrides))
  } catch (err) {
    console.error('Failed to save task deadline override to localStorage', err)
  }
}

export function removeTaskDeadlineOverride(eventId: string, taskId: string): void {
  if (!import.meta.client) return
  try {
    const overrides = getTaskDeadlineOverrides(eventId)
    delete overrides[taskId]
    localStorage.setItem(getDeadlineStorageKey(eventId), JSON.stringify(overrides))
  } catch (err) {
    console.error('Failed to remove task deadline override from localStorage', err)
  }
}

export function shiftTaskDeadlineOverrides(eventId: string, diffMs: number): void {
  if (!import.meta.client || diffMs === 0) return
  try {
    const overrides = getTaskDeadlineOverrides(eventId)
    let changed = false
    for (const [taskId, iso] of Object.entries(overrides)) {
      const time = new Date(iso).getTime()
      if (!Number.isNaN(time)) {
        overrides[taskId] = new Date(time + diffMs).toISOString()
        changed = true
      }
    }
    if (changed) {
      localStorage.setItem(getDeadlineStorageKey(eventId), JSON.stringify(overrides))
    }
  } catch (err) {
    console.error('Failed to shift task deadline overrides in localStorage', err)
  }
}

export function shiftAllEventTaskDeadlines(
  eventId: string,
  diffMs: number,
  tasks?: TaskRecord[]
): void {
  if (!import.meta.client || diffMs === 0) return
  try {
    const overrides = getTaskDeadlineOverrides(eventId)
    if (tasks && tasks.length) {
      for (const t of tasks) {
        if (!overrides[t._id] && t.deadline) {
          overrides[t._id] = t.deadline
        }
      }
    }
    let changed = false
    for (const [taskId, iso] of Object.entries(overrides)) {
      const time = new Date(iso).getTime()
      if (!Number.isNaN(time)) {
        overrides[taskId] = new Date(time + diffMs).toISOString()
        changed = true
      }
    }
    if (changed) {
      localStorage.setItem(getDeadlineStorageKey(eventId), JSON.stringify(overrides))
    }
  } catch (err) {
    console.error('Failed to shift all event task deadlines in localStorage', err)
  }
}

export function applyDeadlineOverrides(tasks: TaskRecord[], eventId: string): TaskRecord[] {
  if (!tasks.length) return tasks
  const overrides = getTaskDeadlineOverrides(eventId)
  if (!Object.keys(overrides).length) return tasks
  return tasks.map((task) => {
    if (overrides[task._id]) {
      return { ...task, deadline: overrides[task._id] }
    }
    return task
  })
}
