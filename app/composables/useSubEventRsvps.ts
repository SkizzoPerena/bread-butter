import type { EventRsvpsListResponse, RsvpRecord, RsvpStatusFilter } from '~/types/rsvp'
import type { SendInviteResponse } from '~/types/guest'
import type { RsvpSummary } from '~/types/event'
import { formatGuestDisplayName } from '~/utils/guestName'

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

export function findMockSubEventRsvpByEmail(
  subEventId: string,
  email: string
): RsvpRecord | null {
  const normalized = email.toLowerCase()
  return (
    getMockSubEventRsvps(subEventId).find(
      (rsvp) => rsvp.email.toLowerCase() === normalized
    ) ?? null
  )
}

export function addMockSubEventRsvp(
  subEventId: string,
  guest: { _id: string; firstName: string; lastName: string; email: string }
): RsvpRecord {
  const rsvps = getMockSubEventRsvps(subEventId)
  const existing = findMockSubEventRsvpByEmail(subEventId, guest.email)
  if (existing) {
    return existing
  }

  const rsvp: RsvpRecord = {
    _id: `mock-sub-rsvp-${guest._id}`,
    name: formatGuestDisplayName(guest.firstName, guest.lastName),
    email: guest.email,
    status: 'PENDING',
    invitedAt: new Date().toISOString(),
    respondedAt: null,
    answers: [],
  }
  rsvps.push(rsvp)
  return rsvp
}

export function removeMockSubEventRsvp(rsvpId: string): boolean {
  for (const rsvps of MOCK_SUB_EVENT_RSVPS.values()) {
    const index = rsvps.findIndex((rsvp) => rsvp._id === rsvpId)
    if (index >= 0) {
      rsvps.splice(index, 1)
      return true
    }
  }
  return false
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
      const mockGuestDirectory: Record<
        string,
        { _id: string; firstName: string; lastName: string; email: string }
      > = {
        'mock-guest-1': {
          _id: 'mock-guest-1',
          firstName: 'Maria',
          lastName: 'Santos',
          email: 'maria.santos@example.com',
        },
        'mock-guest-2': {
          _id: 'mock-guest-2',
          firstName: 'Juan',
          lastName: 'Dela Cruz',
          email: 'juan.delacruz@example.com',
        },
        'mock-guest-3': {
          _id: 'mock-guest-3',
          firstName: 'Ana',
          lastName: 'Reyes',
          email: 'ana.reyes@example.com',
        },
      }

      const ids = guestIds ?? []
      let created = 0
      let skippedAlreadyInvited = 0
      let notFound = 0

      for (const guestId of ids) {
        const guest = mockGuestDirectory[guestId]
        if (!guest) {
          notFound += 1
          continue
        }
        const existing = findMockSubEventRsvpByEmail(subEventId, guest.email)
        if (existing) {
          skippedAlreadyInvited += 1
          continue
        }
        addMockSubEventRsvp(subEventId, guest)
        created += 1
      }

      return {
        success: true,
        status: 201,
        message: 'Sub-event RSVP invites processed.',
        requested: ids.length,
        created,
        skippedAlreadyInvited,
        notFound,
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

  async function deleteSubEventRsvp(rsvpId: string): Promise<{ success: boolean; message: string }> {
    if (isUiOnlyMode.value) {
      removeMockSubEventRsvp(rsvpId)
      return { success: true, message: 'RSVP deleted.' }
    }

    return apiRequest<{ success: boolean; message: string }>(`/user/rsvps/${rsvpId}`, {
      method: 'DELETE',
    })
  }

  return {
    fetchSubEventRsvps,
    fetchAllSubEventRsvps,
    sendSubEventInvites,
    sendSubEventGuestInvite,
    deleteSubEventRsvp,
    rsvpsToSummary,
  }
}
