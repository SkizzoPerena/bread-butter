import type {
  AssigneeRecord,
  AssigneesByEventResponse,
  AssigneeResponse,
  CreateAssigneePayload,
  DeleteAssigneeResponse,
  UpdateAssigneePayload,
} from '~/types/assignee'

const MOCK_ASSIGNEES: AssigneeRecord[] = [
  {
    _id: 'mock-assignee-1',
    event: 'mock-event-id',
    name: 'Florist',
  },
]

export function useAssignees() {
  const { apiRequest, isUiOnlyMode } = useApiMode()

  async function fetchAssigneesByEvent(eventId: string): Promise<AssigneeRecord[]> {
    if (isUiOnlyMode.value) {
      return MOCK_ASSIGNEES.map((item) => ({ ...item, event: eventId }))
    }

    const response = await apiRequest<AssigneesByEventResponse>(
      `/user/assignees/event/${eventId}`
    )
    return response.assignees ?? []
  }

  async function createAssignee(
    eventId: string,
    payload: Omit<CreateAssigneePayload, 'eventId'>
  ): Promise<AssigneeResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 201,
        message: 'Assignee created successfully.',
        assignee: {
          _id: `mock-assignee-${Date.now()}`,
          event: eventId,
          name: payload.name.trim(),
        },
      }
    }

    return apiRequest<AssigneeResponse>('/user/assignees', {
      method: 'POST',
      body: { eventId, name: payload.name.trim() },
    })
  }

  async function updateAssignee(
    assigneeId: string,
    payload: UpdateAssigneePayload
  ): Promise<AssigneeResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Assignee updated successfully.',
        assignee: {
          _id: assigneeId,
          event: 'mock-event-id',
          name: payload.name.trim(),
        },
      }
    }

    return apiRequest<AssigneeResponse>(`/user/assignees/${assigneeId}`, {
      method: 'PATCH',
      body: { name: payload.name.trim() },
    })
  }

  async function deleteAssignee(assigneeId: string): Promise<DeleteAssigneeResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Assignee deleted successfully.',
        tasksUpdated: 0,
      }
    }

    return apiRequest<DeleteAssigneeResponse>(`/user/assignees/${assigneeId}`, {
      method: 'DELETE',
    })
  }

  return {
    fetchAssigneesByEvent,
    createAssignee,
    updateAssignee,
    deleteAssignee,
  }
}
