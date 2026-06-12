import type {
  CreateSubEventPayload,
  CreateSubEventResponse,
  DeleteSubEventResponse,
  SubEventRecord,
  SubEventsListResponse,
  UpdateSubEventPayload,
  UpdateSubEventResponse,
} from '~/types/subEvent'

const MOCK_SUB_EVENTS: SubEventRecord[] = [
  {
    _id: 'mock-sub-event-1',
    event: 'mock-event-id',
    name: 'Welcome Party',
    description: 'Casual gathering for out-of-town guests.',
    venue: 'The Garden Pavilion',
    eventDate: '2026-05-16T00:00:00.000Z',
  },
  {
    _id: 'mock-sub-event-2',
    event: 'mock-event-id',
    name: 'Rehearsal Dinner',
    description: 'Dinner with the wedding party and close family.',
    venue: 'Harbor View Restaurant',
    eventDate: '2026-05-17T00:00:00.000Z',
  },
]

export function useSubEvents() {
  const { apiRequest, isUiOnlyMode } = useApiMode()

  async function fetchSubEventsByEvent(eventId: string): Promise<SubEventRecord[]> {
    if (isUiOnlyMode.value) {
      return MOCK_SUB_EVENTS.map((subEvent) => ({
        ...subEvent,
        event: eventId,
      }))
    }

    const response = await apiRequest<SubEventsListResponse>(
      `/user/sub-events/event/${eventId}`
    )
    return response.subEvents ?? []
  }

  async function findSubEventById(
    eventId: string,
    subEventId: string
  ): Promise<SubEventRecord | null> {
    const subEvents = await fetchSubEventsByEvent(eventId)
    return subEvents.find((subEvent) => subEvent._id === subEventId) ?? null
  }

  async function createSubEvent(
    payload: CreateSubEventPayload
  ): Promise<SubEventRecord> {
    const body = {
      eventId: payload.eventId,
      name: payload.name.trim(),
      eventDate: payload.eventDate,
      ...(payload.description?.trim()
        ? { description: payload.description.trim() }
        : {}),
      ...(payload.venue?.trim() ? { venue: payload.venue.trim() } : {}),
    }

    if (isUiOnlyMode.value) {
      const created: SubEventRecord = {
        _id: `mock-sub-event-${Date.now()}`,
        event: payload.eventId,
        name: body.name,
        description: body.description ?? null,
        venue: body.venue ?? null,
        eventDate: body.eventDate,
      }
      MOCK_SUB_EVENTS.push(created)
      return created
    }

    const response = await apiRequest<CreateSubEventResponse>('/user/sub-events', {
      method: 'POST',
      body,
    })
    return response.subEvent
  }

  async function updateSubEvent(
    subEventId: string,
    payload: UpdateSubEventPayload
  ): Promise<SubEventRecord> {
    if (isUiOnlyMode.value) {
      const index = MOCK_SUB_EVENTS.findIndex((subEvent) => subEvent._id === subEventId)
      if (index === -1) {
        throw new Error('Sub-event not found')
      }
      const current = MOCK_SUB_EVENTS[index]!
      const updated: SubEventRecord = {
        ...current,
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.description !== undefined
          ? { description: payload.description }
          : {}),
        ...(payload.venue !== undefined ? { venue: payload.venue } : {}),
        ...(payload.eventDate !== undefined ? { eventDate: payload.eventDate } : {}),
      }
      MOCK_SUB_EVENTS[index] = updated
      return updated
    }

    const response = await apiRequest<UpdateSubEventResponse>(
      `/user/sub-events/${subEventId}`,
      { method: 'PATCH', body: payload }
    )
    return response.subEvent
  }

  async function deleteSubEvent(subEventId: string): Promise<void> {
    if (isUiOnlyMode.value) {
      const index = MOCK_SUB_EVENTS.findIndex((subEvent) => subEvent._id === subEventId)
      if (index !== -1) {
        MOCK_SUB_EVENTS.splice(index, 1)
      }
      return
    }

    await apiRequest<DeleteSubEventResponse>(`/user/sub-events/${subEventId}`, {
      method: 'DELETE',
    })
  }

  return {
    fetchSubEventsByEvent,
    findSubEventById,
    createSubEvent,
    updateSubEvent,
    deleteSubEvent,
  }
}
