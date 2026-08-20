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
import type { PriceTierRecord } from '~/types/priceTier'
import { usePriceTiers } from '~/composables/usePriceTiers'

export function useEvents() {
  const { apiRequest, apiUpload, isUiOnlyMode } = useApiMode()
  const { fetchAvailablePriceTiers } = usePriceTiers()

  const eventCache = useState<Record<string, SelectedEventDetail>>('bpb-events-detail-cache', () => ({}))
  const userEventsCache = useState<EventRecord[]>('bpb-user-events-list-cache', () => [])

  function enrichEventTier(event: EventRecord, tiers: PriceTierRecord[]): EventRecord {
    if (!event) return event
    if (tiers && tiers.length > 0) {
      if (typeof event.priceTier === 'string') {
        const match = tiers.find((t) => t._id === event.priceTier || t.code === event.priceTier)
        if (match) {
          event.priceTier = { ...match }
          event.tierPricePhp = match.pricePhp
        }
      } else if (event.priceTier && typeof event.priceTier === 'object') {
        const id = (event.priceTier as any)._id
        const code = (event.priceTier as any).code
        const match = tiers.find((t) => (id && t._id === id) || (code && t.code === code))
        if (match) {
          event.priceTier = { ...match, ...event.priceTier }
          if (!event.tierPricePhp && match.pricePhp) {
            event.tierPricePhp = match.pricePhp
          }
        }
      }
    }
    return event
  }

  async function fetchUserEvents(forceRefresh = false): Promise<EventRecord[]> {
    if (isUiOnlyMode.value) {
      return []
    }
    if (!forceRefresh && userEventsCache.value.length > 0) {
      return userEventsCache.value
    }
    const [tiers, response] = await Promise.all([
      fetchAvailablePriceTiers().catch(() => []),
      apiRequest<EventsListResponse>('/user/events')
    ])
    const enriched = (response.events ?? []).map((e) => enrichEventTier(e, tiers))
    userEventsCache.value = enriched
    return enriched
  }

  async function fetchEvent(eventId: string, forceRefresh = false): Promise<SelectedEventDetail> {
    if (isUiOnlyMode.value) {
      throw new Error('fetchEvent requires real API mode')
    }
    if (!forceRefresh && eventCache.value[eventId]) {
      return eventCache.value[eventId]
    }
    const [tiers, response] = await Promise.all([
      fetchAvailablePriceTiers().catch(() => []),
      apiRequest<SelectedEventResponse>(`/user/events/${eventId}`)
    ])
    const event = enrichEventTier(response.event, tiers)
    const detail: SelectedEventDetail = {
      event,
      guestList: response.guestList ?? [],
      rsvpSummary: response.rsvpSummary ?? null,
      tasks: response.tasks ?? null,
    }
    eventCache.value[eventId] = detail
    return detail
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
    userEventsCache.value = [] // Invalidate cache
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

    delete eventCache.value[eventId]
    userEventsCache.value = []
  }

  return {
    fetchUserEvents,
    fetchEvent,
    createEvent,
    updateEvent
  }
}
