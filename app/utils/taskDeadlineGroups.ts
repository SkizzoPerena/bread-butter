import { getLocalTimeZone, today } from '@internationalized/date'
import type { TaskRecord } from '~/types/task'
import { parseIsoToCalendarDate } from '~/utils/taskFormat'

export type DeadlineGroupKey = 'overdue' | 'none' | `month-${number}`

export interface DeadlineTaskGroup {
  key: DeadlineGroupKey
  label: string
  sortOrder: number
  tasks: TaskRecord[]
}

export function getDeadlineMonthOffset(
  deadline: string | null | undefined
): 'overdue' | 'none' | number {
  if (!deadline) {
    return 'none'
  }

  const calendarDate = parseIsoToCalendarDate(deadline)
  if (!calendarDate) {
    return 'none'
  }

  const now = today(getLocalTimeZone())
  const months = (calendarDate.year - now.year) * 12 + (calendarDate.month - now.month)
  if (months < 0) {
    return 'overdue'
  }

  return months
}

export function deadlineGroupLabel(offset: 'overdue' | 'none' | number): string {
  if (offset === 'overdue') {
    return 'Overdue'
  }
  if (offset === 'none') {
    return 'No Deadline'
  }
  if (offset === 0) {
    return 'Due This Month'
  }
  if (offset === 1) {
    return 'Due in 1 Month'
  }
  return `Due in ${offset} Months`
}

function deadlineGroupKey(offset: 'overdue' | 'none' | number): DeadlineGroupKey {
  if (offset === 'overdue') {
    return 'overdue'
  }
  if (offset === 'none') {
    return 'none'
  }
  return `month-${offset}`
}

function deadlineGroupSortOrder(offset: 'overdue' | 'none' | number): number {
  if (offset === 'overdue') {
    return -1
  }
  if (offset === 'none') {
    return 10_000
  }
  return offset
}

/** Groups tasks by calendar month relative to today; preserves input order within each bucket. */
export function groupTasksByDeadlineMonth(tasks: TaskRecord[]): DeadlineTaskGroup[] {
  const groups: DeadlineTaskGroup[] = []
  const indexByKey = new Map<string, number>()

  for (const task of tasks) {
    const offset = getDeadlineMonthOffset(task.deadline)
    const key = deadlineGroupKey(offset)
    const keyStr = String(key)

    let groupIndex = indexByKey.get(keyStr)
    if (groupIndex === undefined) {
      groupIndex = groups.length
      indexByKey.set(keyStr, groupIndex)
      groups.push({
        key,
        label: deadlineGroupLabel(offset),
        sortOrder: deadlineGroupSortOrder(offset),
        tasks: [],
      })
    }

    groups[groupIndex].tasks.push(task)
  }

  return groups.sort((a, b) => a.sortOrder - b.sortOrder)
}
