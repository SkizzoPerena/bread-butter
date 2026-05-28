export type TaskPriorityBadgeColor = 'error' | 'secondary' | 'success' | 'info'

export interface TaskPriorityOption {
  label: string
  value: number
}

export const TASK_PRIORITY_OPTIONS: TaskPriorityOption[] = [
  { label: 'Urgent (1)', value: 1 },
  { label: 'High (2)', value: 2 },
  { label: 'Medium (3)', value: 3 },
  { label: 'Low (4)', value: 4 },
  { label: 'Low (5)', value: 5 },
]

export type PriorityFilterValue = 'all' | 'urgent' | 'high' | 'medium' | 'low'

export const PRIORITY_FILTER_OPTIONS: { label: string; value: PriorityFilterValue }[] = [
  { label: 'All priorities', value: 'all' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
]

export function mapTaskPriority(priority: number): { label: string; color: TaskPriorityBadgeColor } {
  if (priority <= 1) {
    return { label: 'Urgent', color: 'error' }
  }
  if (priority === 2) {
    return { label: 'High', color: 'info' }
  }
  if (priority === 3) {
    return { label: 'Medium', color: 'secondary' }
  }
  return { label: 'Low', color: 'success' }
}

export function matchesPriorityFilter(priority: number, filter: PriorityFilterValue): boolean {
  if (filter === 'all') {
    return true
  }
  if (filter === 'urgent') {
    return priority <= 1
  }
  if (filter === 'high') {
    return priority === 2
  }
  if (filter === 'medium') {
    return priority === 3
  }
  return priority >= 4
}
