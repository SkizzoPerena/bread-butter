import type { AssigneeRecord } from '~/types/assignee'
import type { TaskRecord } from '~/types/task'

export function getAssigneeLabel(task: TaskRecord): string {
  return task.assignee?.name?.trim() || 'Me'
}

export interface AssigneeSelectItem {
  label: string
  value: string | null
}

export function buildAssigneeSelectItems(assignees: AssigneeRecord[]): AssigneeSelectItem[] {
  return [
    { label: 'Me', value: null },
    ...assignees.map((assignee) => ({
      label: assignee.name,
      value: assignee._id,
    })),
  ]
}
