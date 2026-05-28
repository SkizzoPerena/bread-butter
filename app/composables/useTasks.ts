import type {
  CreateTaskPayload,
  CreateTaskResponse,
  DeleteTaskResponse,
  TaskRecord,
  TasksByEventResponse,
  TaskResponse,
  UpdateTaskDetailsPayload,
  UpdateTaskMessageResponse,
} from '~/types/task'
import type { TaskStatus } from '~/types/task'

const MOCK_TASKS: TaskRecord[] = [
  {
    _id: 'mock-task-1',
    event: 'mock-event-id',
    title: 'Book a photo booth',
    details: 'Find and book a photo booth service for the reception.',
    budget: 20000,
    status: 'ONGOING',
    priority: 1,
    deadline: '2026-06-15T00:00:00.000Z',
    parentTask: null,
    subtasks: [],
  },
  {
    _id: 'mock-task-2',
    event: 'mock-event-id',
    title: 'Finalize catering menu',
    details: 'Confirm final menu choices with the caterer.',
    budget: 15000,
    status: 'ONGOING',
    priority: 3,
    deadline: '2026-07-01T00:00:00.000Z',
    parentTask: null,
    subtasks: [],
  },
  {
    _id: 'mock-task-3',
    event: 'mock-event-id',
    title: 'Send wedding invitations',
    details: 'Design, print, and mail invitations.',
    budget: 10000,
    status: 'COMPLETED',
    priority: 2,
    deadline: '2026-05-01T00:00:00.000Z',
    parentTask: null,
    subtasks: [],
  },
]

export function useTasks() {
  const { apiRequest, apiUpload, isUiOnlyMode } = useApiMode()

  async function fetchTasksByEvent(eventId: string): Promise<TaskRecord[]> {
    if (isUiOnlyMode.value) {
      return MOCK_TASKS.map((task) => ({ ...task, event: eventId }))
    }

    const response = await apiRequest<TasksByEventResponse>(`/user/tasks/event/${eventId}`)
    return response.tasks ?? []
  }

  async function fetchTask(taskId: string): Promise<TaskRecord> {
    if (isUiOnlyMode.value) {
      const found = MOCK_TASKS.find((task) => task._id === taskId)
      if (!found) {
        throw new Error('Task not found')
      }
      return found
    }

    const response = await apiRequest<TaskResponse>(`/user/tasks/${taskId}`)
    return response.task
  }

  async function createTask(
    payload: CreateTaskPayload,
    files?: File[]
  ): Promise<CreateTaskResponse> {
    if (isUiOnlyMode.value) {
      const task: TaskRecord = {
        _id: `mock-task-${Date.now()}`,
        event: payload.eventId,
        title: payload.title,
        details: payload.details,
        budget: payload.budget,
        priority: payload.priority,
        deadline: payload.deadline,
        status: 'ONGOING',
        parentTask: null,
        subtasks: [],
        attachedFileURLs: [],
      }
      return {
        success: true,
        status: 201,
        message: 'Task created successfully.',
        task,
      }
    }

    const formData = new FormData()
    formData.append('eventId', payload.eventId)
    formData.append('title', payload.title)
    formData.append('details', payload.details)
    formData.append('budget', String(payload.budget))
    formData.append('priority', String(payload.priority))
    formData.append('deadline', payload.deadline)
    for (const file of files ?? []) {
      formData.append('images', file)
    }

    return apiUpload<CreateTaskResponse>('/user/tasks', formData)
  }

  async function updateTaskStatus(
    taskId: string,
    status: TaskStatus
  ): Promise<UpdateTaskMessageResponse> {
    if (isUiOnlyMode.value) {
      const base = MOCK_TASKS.find((task) => task._id === taskId) ?? MOCK_TASKS[0]
      return {
        success: true,
        status: 200,
        message: 'Task status updated successfully.',
        task: { ...base, _id: taskId, status } as TaskRecord,
      }
    }

    return apiRequest<UpdateTaskMessageResponse>(`/user/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: { status },
    })
  }

  async function updateTaskPriority(
    taskId: string,
    priority: number
  ): Promise<UpdateTaskMessageResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Task priority updated successfully.',
      }
    }

    return apiRequest<UpdateTaskMessageResponse>(`/user/tasks/${taskId}/priority`, {
      method: 'PATCH',
      body: { priority },
    })
  }

  async function updateTaskBudget(
    taskId: string,
    budget: number
  ): Promise<UpdateTaskMessageResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Task budget updated successfully.',
      }
    }

    return apiRequest<UpdateTaskMessageResponse>(`/user/tasks/${taskId}/budget`, {
      method: 'PATCH',
      body: { budget },
    })
  }

  async function updateTaskDetails(
    taskId: string,
    payload: UpdateTaskDetailsPayload,
    newFiles?: File[]
  ): Promise<UpdateTaskMessageResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Task details updated successfully.',
      }
    }

    const formData = new FormData()
    if (payload.title !== undefined) {
      formData.append('title', payload.title)
    }
    if (payload.details !== undefined) {
      formData.append('details', payload.details)
    }
    if (payload.keepImageURLs !== undefined) {
      formData.append('keepImageURLs', JSON.stringify(payload.keepImageURLs))
    }
    for (const file of newFiles ?? []) {
      formData.append('images', file)
    }

    return apiUpload<UpdateTaskMessageResponse>(`/user/tasks/${taskId}/details`, formData, {
      method: 'PATCH',
    })
  }

  async function hardDeleteTask(taskId: string): Promise<DeleteTaskResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Task permanently removed.',
        promotedSubtasks: 0,
      }
    }

    return apiRequest<DeleteTaskResponse>(`/user/tasks/${taskId}`, {
      method: 'DELETE',
    })
  }

  return {
    fetchTasksByEvent,
    fetchTask,
    createTask,
    updateTaskStatus,
    updateTaskPriority,
    updateTaskBudget,
    updateTaskDetails,
    hardDeleteTask,
  }
}
