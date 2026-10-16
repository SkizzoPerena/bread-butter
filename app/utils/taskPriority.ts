export type TaskPriorityBadgeColor = 'error' | 'secondary' | 'success' | 'info' | 'warning'

export interface TaskPriorityOption {
  label: string
  value: number
}

export const TASK_PRIORITY_OPTIONS: TaskPriorityOption[] = [
  { label: 'High', value: 1 },
  { label: 'Medium', value: 2 },
  { label: 'Low', value: 3 },
]

export type PriorityFilterValue = 'all' | 'high' | 'medium' | 'low'

export const PRIORITY_FILTER_OPTIONS: { label: string; value: PriorityFilterValue }[] = [
  { label: 'All priorities', value: 'all' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
]

export function mapTaskPriority(priority: number): { label: string; color: TaskPriorityBadgeColor } {
  if (priority <= 1) {
    return { label: 'High', color: 'error' }
  }
  if (priority === 2) {
    return { label: 'Medium', color: 'warning' }
  }
  return { label: 'Low', color: 'success' }
}

export function matchesPriorityFilter(priority: number, filter: PriorityFilterValue | string): boolean {
  if (filter === 'all') {
    return true
  }
  if (filter === 'high' || filter === 'urgent') {
    return priority <= 1
  }
  if (filter === 'medium') {
    return priority === 2
  }
  if (filter === 'low') {
    return priority >= 3
  }
  return true
}
