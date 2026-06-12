import type {
  EventRsvpsListResponse,
  FetchEventRsvpsOptions,
  RsvpRecord,
  RsvpStatusFilter,
} from '~/types/rsvp'

const MOCK_RSVPS: RsvpRecord[] = [
  {
    _id: 'mock-rsvp-1',
    name: 'maria santos',
    email: 'maria.santos@example.com',
    status: 'GOING',
    invitedAt: '2026-04-01T10:00:00.000Z',
    respondedAt: '2026-04-02T14:30:00.000Z',
    answers: [
      { question: 'Will you be attending the ceremony?', answer: 'Yes' },
      { question: 'Meal preference?', answer: 'Chicken' },
      { question: 'Do you have any dietary restrictions?', answer: 'Vegetarian' },
    ],
  },
  {
    _id: 'mock-rsvp-2',
    name: 'juan dela cruz',
    email: 'juan.delacruz@example.com',
    status: 'GOING',
    invitedAt: '2026-04-01T10:00:00.000Z',
    respondedAt: '2026-04-03T09:15:00.000Z',
    answers: [
      { question: 'Will you need a plus one?', answer: 'Yes' },
      { question: 'Will you be attending the ceremony?', answer: 'Yes' },
      { question: 'Meal preference?', answer: 'Beef' },
    ],
  },
  {
    _id: 'mock-rsvp-3',
    name: 'ana reyes',
    email: 'ana.reyes@example.com',
    status: 'NOT_GOING',
    invitedAt: '2026-04-01T10:00:00.000Z',
    respondedAt: '2026-04-05T11:00:00.000Z',
    answers: [
      { question: 'Will you be attending the ceremony?', answer: 'No' },
      { question: 'Meal preference?', answer: 'Fish' },
    ],
  },
  {
    _id: 'mock-rsvp-4',
    name: 'carlos lim',
    email: 'carlos.lim@example.com',
    status: 'PENDING',
    invitedAt: '2026-04-01T10:00:00.000Z',
    respondedAt: null,
    answers: [],
  },
]

function filterMockRsvps(
  rsvps: RsvpRecord[],
  status: RsvpStatusFilter
): RsvpRecord[] {
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

export function useRsvps() {
  const { apiRequest, isUiOnlyMode } = useApiMode()

  async function fetchEventRsvps(
    eventId: string,
    options: FetchEventRsvpsOptions = {}
  ): Promise<EventRsvpsListResponse> {
    const page = options.page ?? 1
    const limit = options.limit ?? 25
    const status = options.status ?? 'ALL'

    if (isUiOnlyMode.value) {
      const filtered = filterMockRsvps(MOCK_RSVPS, status)
      return paginateMockRsvps(filtered, page, limit)
    }

    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      status,
    })

    return apiRequest<EventRsvpsListResponse>(
      `/user/rsvps/event/${eventId}?${query.toString()}`
    )
  }

  async function fetchAllEventRsvps(eventId: string): Promise<RsvpRecord[]> {
    if (isUiOnlyMode.value) {
      return [...MOCK_RSVPS]
    }

    const pageSize = 100
    const allRsvps: RsvpRecord[] = []
    let page = 1
    let totalPages = 1

    do {
      const response = await fetchEventRsvps(eventId, {
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

  return { fetchEventRsvps, fetchAllEventRsvps }
}
