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
import { EVENT_CANCELLED_REASONS, TASK_DELETE_REASONS, actorRole, matchReason, capture, tracked } from '~/utils/analytics'

const MOCK_ASSIGNEE = { _id: 'mock-assignee-1', name: 'Florist' }

const MOCK_TASKS: TaskRecord[] = [
  {
    _id: 'mock-task-0',
    event: 'mock-event-id',
    title: 'Book a live band',
    details: 'Find and book a live band for the reception.',
    status: 'TODO',
    priority: 1,
    deadline: '2026-08-15T00:00:00.000Z',
    parentTask: null,
    subtasks: [],
    assignee: null,
  },
  {
    _id: 'mock-task-1',
    event: 'mock-event-id',
    title: 'Book a photo booth',
    details: 'Find and book a photo booth service for the reception.',
    status: 'ONGOING',
    priority: 1,
    deadline: '2026-06-15T00:00:00.000Z',
    parentTask: null,
    subtasks: [],
    assignee: MOCK_ASSIGNEE,
  },
  {
    _id: 'mock-task-2',
    event: 'mock-event-id',
    title: 'Finalize catering menu',
    details: 'Confirm final menu choices with the caterer.',
    status: 'ONGOING',
    priority: 3,
    deadline: '2026-07-01T00:00:00.000Z',
    parentTask: null,
    subtasks: [],
    assignee: null,
  },
  {
    _id: 'mock-task-3',
    event: 'mock-event-id',
    title: 'Send wedding invitations',
    details: 'Design, print, and mail invitations.',
    status: 'COMPLETED',
    priority: 2,
    deadline: '2026-05-01T00:00:00.000Z',
    parentTask: null,
    subtasks: [],
    assignee: null,
  },
]

export function useTasks() {
  const { apiRequest, apiUpload, isUiOnlyMode } = useApiMode()

  async function fetchTasksByEvent(eventId: string): Promise<TaskRecord[]> {
    if (isUiOnlyMode.value) {
      return MOCK_TASKS.map((task) => ({ ...task, event: eventId }))
    }

    const response = await apiRequest<TasksByEventResponse>(`/user/tasks/event/${eventId}`)
    return normalizeTaskList(response.tasks ?? [])
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
    return normalizeTask(response.task)
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
        priority: payload.priority,
        deadline: payload.deadline,
        status: 'TODO',
        parentTask: null,
        subtasks: [],
        attachedFileURLs: [],
        assignee: payload.assigneeId
          ? { _id: payload.assigneeId, name: 'Assignee' }
          : null,
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
    formData.append('priority', String(payload.priority))
    formData.append('deadline', payload.deadline)
    if (payload.assigneeId) {
      formData.append('assigneeId', payload.assigneeId)
    }
    for (const file of files ?? []) {
      formData.append('images', file)
    }

    const response = await tracked(actorRole(), () => apiUpload<CreateTaskResponse>('/user/tasks', formData), {
      event: 'task_created',
      props: { event_id: payload.eventId },
    }, {
      event: 'task_rejected',
      reasons: EVENT_CANCELLED_REASONS,
      props: { event_id: payload.eventId },
    })
    return { ...response, task: normalizeTask(response.task) }
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

    const response = await tracked(actorRole(), () => apiRequest<UpdateTaskMessageResponse>(`/user/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: { status },
    }), { event: 'task_status_changed', props: { status } }, {
      event: 'task_rejected',
      reasons: EVENT_CANCELLED_REASONS,
    })
    return response.task
      ? { ...response, task: normalizeTask(response.task) }
      : response
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

    const role = actorRole()
    try {
      return await apiRequest<UpdateTaskMessageResponse>(`/user/tasks/${taskId}/priority`, {
        method: 'PATCH',
        body: { priority },
      })
    } catch (error) {
      if (role) {
        const reason = matchReason(error, EVENT_CANCELLED_REASONS)
        if (reason) capture('task_rejected', { role, reason })
      }
      throw error
    }
  }

  async function updateTaskAssignee(
    taskId: string,
    assigneeId: string | null
  ): Promise<UpdateTaskMessageResponse> {
    if (isUiOnlyMode.value) {
      const base = MOCK_TASKS.find((task) => task._id === taskId) ?? MOCK_TASKS[0]
      return {
        success: true,
        status: 200,
        message: 'Task assignee updated successfully.',
        task: {
          ...base,
          _id: taskId,
          assignee: assigneeId ? { _id: assigneeId, name: 'Assignee' } : null,
        } as TaskRecord,
      }
    }

    const role = actorRole()
    let response: UpdateTaskMessageResponse
    try {
      response = await apiRequest<UpdateTaskMessageResponse>(`/user/tasks/${taskId}/assignee`, {
        method: 'PATCH',
        body: { assigneeId },
      })
    } catch (error) {
      if (role) {
        const reason = matchReason(error, EVENT_CANCELLED_REASONS)
        if (reason) capture('task_rejected', { role, reason })
      }
      throw error
    }
    return response.task
      ? { ...response, task: normalizeTask(response.task) }
      : response
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

    const role = actorRole()
    let response: UpdateTaskMessageResponse
    try {
      response = await apiUpload<UpdateTaskMessageResponse>(`/user/tasks/${taskId}/details`, formData, {
        method: 'PATCH',
      })
    } catch (error) {
      if (role) {
        const reason = matchReason(error, EVENT_CANCELLED_REASONS)
        if (reason) capture('task_rejected', { role, reason })
      }
      throw error
    }
    return response.task
      ? { ...response, task: normalizeTask(response.task) }
      : response
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

    const role = actorRole()
    try {
      const response = await apiRequest<DeleteTaskResponse>(`/user/tasks/${taskId}`, {
        method: 'DELETE',
      })
      if (role) capture('task_deleted', { role })
      return response
    } catch (error) {
      if (role) {
        const notTodo = matchReason(error, TASK_DELETE_REASONS)
        if (notTodo) capture('task_delete_rejected', { role, reason: notTodo })
        const cancelled = matchReason(error, EVENT_CANCELLED_REASONS)
        if (cancelled) capture('task_rejected', { role, reason: cancelled })
      }
      throw error
    }
  }

  return {
    fetchTasksByEvent,
    fetchTask,
    createTask,
    updateTaskStatus,
    updateTaskPriority,
    updateTaskAssignee,
    updateTaskDetails,
    hardDeleteTask,
  }
}

function normalizeTaskList(tasks: TaskRecord[]): TaskRecord[] {
  return tasks.map(normalizeTask)
}

function normalizeTask(task: TaskRecord): TaskRecord {
  if (task.status === 'CANCELLED') {
    return { ...task, status: 'TODO' }
  }
  return task
}
