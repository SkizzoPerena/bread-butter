export type TaskStatus = 'ONGOING' | 'COMPLETED' | 'CANCELLED'

export interface TaskAttachedFile {
  fileName: string
  description?: string
  fileType: string
  fileURL: string
}

export interface TaskRecord {
  _id: string
  event: string
  title: string
  details: string
  budget: number
  status: TaskStatus
  priority: number
  deadline?: string | null
  parentTask?: string | null
  subtasks?: TaskRecord[]
  attachedFileURLs?: TaskAttachedFile[]
}

export interface TasksByEventResponse {
  success: boolean
  status: number
  tasks: TaskRecord[]
}

export interface TaskResponse {
  success: boolean
  status?: number
  task: TaskRecord
}

export interface CreateTaskResponse {
  success: boolean
  status: number
  message: string
  task: TaskRecord
}

export interface UpdateTaskMessageResponse {
  success: boolean
  status: number
  message: string
  task?: TaskRecord
}

export interface DeleteTaskResponse {
  success: boolean
  status: number
  message: string
  promotedSubtasks?: number
}

export interface CreateTaskPayload {
  eventId: string
  title: string
  details: string
  budget: number
  priority: number
  deadline: string
}

export interface UpdateTaskDetailsPayload {
  title?: string
  details?: string
  keepImageURLs?: string[]
}
