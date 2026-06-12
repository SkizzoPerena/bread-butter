import type { EventRsvpsListResponse, RsvpRecord, RsvpStatusFilter } from '~/types/rsvp'
import type { SendInviteResponse } from '~/types/guest'
import type { RsvpSummary } from '~/types/event'

const MOCK_SUB_EVENT_RSVPS = new Map<string, RsvpRecord[]>([
  [
    'mock-sub-event-1',
    [
      {
        _id: 'mock-sub-rsvp-1',
        name: 'maria santos',
        email: 'maria.santos@example.com',
        status: 'GOING',
        invitedAt: '2026-04-01T10:00:00.000Z',
        respondedAt: '2026-04-02T14:30:00.000Z',
        answers: [],
      },
      {
        _id: 'mock-sub-rsvp-2',
        name: 'juan dela cruz',
        email: 'juan.delacruz@example.com',
        status: 'PENDING',
        invitedAt: '2026-04-01T10:00:00.000Z',
        respondedAt: null,
        answers: [],
      },
    ],
  ],
  [
    'mock-sub-event-2',
    [
      {
        _id: 'mock-sub-rsvp-3',
        name: 'ana reyes',
        email: 'ana.reyes@example.com',
        status: 'NOT_GOING',
        invitedAt: '2026-04-01T10:00:00.000Z',
        respondedAt: '2026-04-05T11:00:00.000Z',
        answers: [],
      },
    ],
  ],
])

function getMockSubEventRsvps(subEventId: string): RsvpRecord[] {
  if (!MOCK_SUB_EVENT_RSVPS.has(subEventId)) {
    MOCK_SUB_EVENT_RSVPS.set(subEventId, [])
  }
  return MOCK_SUB_EVENT_RSVPS.get(subEventId)!
}

function filterMockRsvps(rsvps: RsvpRecord[], status: RsvpStatusFilter): RsvpRecord[] {
  if (status === 'ALL') {
    return rsvps
  }
  return rsvps.filter((rsvp) => rsvp.status === status)
}

function paginateMockRsvps(
  rsvps: RsvpRecord[],
  page: number,
  limit: number
): EventRsvpsListResponse {
  const total = rsvps.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = (safePage - 1) * limit

  return {
    success: true,
    page: safePage,
    limit,
    total,
    totalPages,
    rsvps: rsvps.slice(start, start + limit),
  }
}

export function rsvpsToSummary(rsvps: RsvpRecord[]): RsvpSummary {
  return {
    totalSent: rsvps.length,
    going: rsvps.filter((rsvp) => rsvp.status === 'GOING').length,
    notGoing: rsvps.filter((rsvp) => rsvp.status === 'NOT_GOING').length,
    pending: rsvps.filter((rsvp) => rsvp.status === 'PENDING').length,
  }
}

export function useSubEventRsvps() {
  const { apiRequest, isUiOnlyMode } = useApiMode()

  async function fetchSubEventRsvps(
    subEventId: string,
    options: { page?: number; limit?: number; status?: RsvpStatusFilter } = {}
  ): Promise<EventRsvpsListResponse> {
    const page = options.page ?? 1
    const limit = options.limit ?? 25
    const status = options.status ?? 'ALL'

    if (isUiOnlyMode.value) {
      const filtered = filterMockRsvps(getMockSubEventRsvps(subEventId), status)
      return paginateMockRsvps(filtered, page, limit)
    }

    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      status,
    })

    return apiRequest<EventRsvpsListResponse>(
      `/user/rsvps/sub-event/${subEventId}?${query.toString()}`
    )
  }

  async function fetchAllSubEventRsvps(subEventId: string): Promise<RsvpRecord[]> {
    if (isUiOnlyMode.value) {
      return [...getMockSubEventRsvps(subEventId)]
    }

    const pageSize = 100
    const allRsvps: RsvpRecord[] = []
    let page = 1
    let totalPages = 1

    do {
      const response = await fetchSubEventRsvps(subEventId, {
        page,
        limit: pageSize,
        status: 'ALL',
      })
      allRsvps.push(...(response.rsvps ?? []))
      totalPages = response.totalPages ?? 1
      page += 1
    } while (page <= totalPages)

    return allRsvps
  }

  async function sendSubEventInvites(
    subEventId: string,
    guestIds?: string[]
  ): Promise<SendInviteResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 201,
        message: 'Sub-event RSVP invites processed.',
        requested: guestIds?.length ?? 2,
        created: 1,
        skippedAlreadyInvited: 1,
        notFound: 0,
      }
    }

    return apiRequest<SendInviteResponse>(`/user/rsvps/sub-event/${subEventId}/send`, {
      method: 'POST',
      body: guestIds?.length ? { guestIds } : {},
    })
  }

  async function sendSubEventGuestInvite(
    subEventId: string,
    guestId: string
  ): Promise<SendInviteResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 201,
        message: 'Sub-event RSVP invites processed.',
        requested: 1,
        created: 1,
        skippedAlreadyInvited: 0,
        notFound: 0,
      }
    }

    return apiRequest<SendInviteResponse>(
      `/user/rsvps/sub-event/${subEventId}/guest/${guestId}/send`,
      { method: 'POST' }
    )
  }

  return {
    fetchSubEventRsvps,
    fetchAllSubEventRsvps,
    sendSubEventInvites,
    sendSubEventGuestInvite,
    rsvpsToSummary,
  }
}
