export interface AssigneeRecord {
  _id: string
  event: string
  name: string
  createdAt?: string
  updatedAt?: string
}

export interface AssigneesByEventResponse {
  success: boolean
  status: number
  assignees: AssigneeRecord[]
}

export interface AssigneeResponse {
  success: boolean
  status: number
  message: string
  assignee: AssigneeRecord
}

export interface DeleteAssigneeResponse {
  success: boolean
  status: number
  message: string
  tasksUpdated: number
}

export interface CreateAssigneePayload {
  eventId: string
  name: string
}

export interface UpdateAssigneePayload {
  name: string
}
