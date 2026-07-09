import type {
  CreateEventPayload,
  EventRecord,
  EventResponse,
  EventsListResponse,
  SelectedEventDetail,
  SelectedEventResponse,
  UpdateEventPayload,
  UpdateEventResponse
} from '~/types/event'

export function useEvents() {
  const { apiRequest, apiUpload, isUiOnlyMode } = useApiMode()

  async function fetchUserEvents(): Promise<EventRecord[]> {
    if (isUiOnlyMode.value) {
      return []
    }
    const response = await apiRequest<EventsListResponse>('/user/events')
    return response.events
  }

  async function fetchEvent(eventId: string): Promise<SelectedEventDetail> {
    if (isUiOnlyMode.value) {
      throw new Error('fetchEvent requires real API mode')
    }
    const response = await apiRequest<SelectedEventResponse>(`/user/events/${eventId}`)
    return {
      event: response.event,
      guestList: response.guestList ?? [],
      rsvpSummary: response.rsvpSummary ?? null,
      tasks: response.tasks ?? null,
    }
  }

  async function createEvent(payload: CreateEventPayload): Promise<EventRecord> {
    if (isUiOnlyMode.value) {
      return {
        _id: 'mock-event-id',
        eventType: payload.eventType,
        eventName: payload.eventName,
        description: payload.description,
        venue: payload.venue,
        eventDate: payload.eventDate,
        status: 'ONGOING',
        isCatholicWedding: payload.isCatholicWedding ?? false,
        coverImageURL: payload.coverImageURL ?? null,
        tierPricePhp: 10000,
        latestPayment: payload.payLater
          ? null
          : {
              _id: 'mock-payment-id',
              type: 'EVENT_CREATION_FEE',
              amount: 10000,
              transactionId: payload.transactionId ?? '',
              proofOfPaymentURL: 'mock-proof-url',
              status: 'PENDING'
            }
      }
    }

    const formData = new FormData()
    formData.append('eventType', payload.eventType)
    formData.append('eventName', payload.eventName)
    formData.append('description', payload.description)
    formData.append('venue', payload.venue)
    formData.append('eventDate', payload.eventDate)
    formData.append('priceTierId', payload.priceTierId)

    if (payload.isCatholicWedding !== undefined) {
      formData.append('isCatholicWedding', String(Boolean(payload.isCatholicWedding)))
    }

    if (payload.coverImage) {
      formData.append('coverImage', payload.coverImage)
    } else if (payload.coverImageURL) {
      formData.append('coverImageURL', payload.coverImageURL)
    }

    if (!payload.payLater) {
      if (payload.transactionId?.trim()) {
        formData.append('transactionId', payload.transactionId.trim())
      }
      if (payload.proofOfPayment) {
        formData.append('proofOfPayment', payload.proofOfPayment)
      }
    }

    const response = await apiUpload<EventResponse>('/user/events', formData)
    return response.event
  }

  async function updateEvent(eventId: string, payload: UpdateEventPayload): Promise<void> {
    if (isUiOnlyMode.value) {
      return
    }

    const formData = new FormData()
    formData.append('eventType', payload.eventType)
    formData.append('eventName', payload.eventName)
    formData.append('description', payload.description)
    formData.append('venue', payload.venue)

    if (payload.eventDate) {
      formData.append('eventDate', payload.eventDate)
    }

    if (payload.isCatholicWedding !== undefined) {
      formData.append('isCatholicWedding', String(Boolean(payload.isCatholicWedding)))
    }

    if (payload.coverImage) {
      formData.append('coverImage', payload.coverImage)
    } else if (payload.coverImageURL) {
      formData.append('coverImageURL', payload.coverImageURL)
    }

    await apiUpload<UpdateEventResponse>(`/user/events/${eventId}`, formData, {
      method: 'PATCH'
    })
  }

  return {
    fetchUserEvents,
    fetchEvent,
    createEvent,
    updateEvent
  }
}
