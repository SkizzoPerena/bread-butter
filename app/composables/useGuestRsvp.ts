import type {
  GuestRsvpFormResponse,
  GuestRsvpRespondPayload,
  GuestRsvpRespondResponse,
} from '~/types/rsvp'
import { GuestRsvpError } from '~/types/rsvp'
import { isValidRsvpObjectId } from '~/types/rsvp'

export const MOCK_RSVP_PENDING_ID = '664f1a2b3c4d5e6f7a8b9c0d'
export const MOCK_RSVP_RESPONDED_ID = '664f1a2b3c4d5e6f7a8b9c0e'
export const MOCK_RSVP_SUB_EVENT_ID = '664f1a2b3c4d5e6f7a8b9c0f'

const MOCK_FORM: GuestRsvpFormResponse = {
  success: true,
  status: 200,
  alreadyResponded: false,
  rsvp: {
    _id: MOCK_RSVP_PENDING_ID,
    name: 'maria santos',
    email: 'maria.santos@example.com',
    status: 'PENDING',
    respondedAt: null,
    answers: [],
    subEventId: null,
  },
  invitation: {
    _id: 'mock-invitation-id',
    event: 'mock-event-id',
    requestLine: 'Together with their families',
    eventLabel: "Jane & John's Wedding",
    eventDate: '2026-05-18T00:00:00.000Z',
    eventTime: '2026-05-18T16:00:00.000Z',
    eventVenue: 'Manila Cathedral',
    blocks: [
      { type: 'heading', content: 'Schedule of Events' },
      {
        type: 'text',
        content: 'Ceremony begins at 4:00 PM, with dinner and dancing to follow.',
      },
    ],
    deadlineText: 'Please let us know if you can make it so we can accommodate you.',
    deadlineDate: '2026-04-18T00:00:00.000Z',
  },
  subEvent: null,
  questions: [
    {
      question: 'Will you attend the ceremony?',
      type: 'YES/NO',
      notes: 'Let us know if you need any accommodations.',
    },
    {
      question: 'Meal preference?',
      type: 'OPTIONS',
      options: ['Chicken', 'Fish', 'Vegetarian'],
      notes: 'Add any allergy details (optional).',
    },
    { question: 'Any dietary restrictions?', type: 'TEXT' },
  ],
}

const MOCK_RESPONDED_FORM: GuestRsvpFormResponse = {
  ...MOCK_FORM,
  alreadyResponded: true,
  rsvp: {
    _id: MOCK_RSVP_RESPONDED_ID,
    name: 'juan dela cruz',
    email: 'juan.delacruz@example.com',
    status: 'GOING',
    respondedAt: '2026-04-01T10:00:00.000Z',
    answers: [
      { question: 'Will you attend the ceremony?', answer: true, notes: '' },
      {
        question: 'Meal preference?',
        answer: 'Chicken',
        notes: 'No shellfish, please.',
      },
      { question: 'Any dietary restrictions?', answer: 'None', notes: '' },
    ],
    subEventId: null,
  },
}

const MOCK_SUB_EVENT_FORM: GuestRsvpFormResponse = {
  success: true,
  status: 200,
  alreadyResponded: false,
  rsvp: {
    _id: MOCK_RSVP_SUB_EVENT_ID,
    name: 'ana reyes',
    email: 'ana.reyes@example.com',
    status: 'PENDING',
    respondedAt: null,
    answers: [],
    subEventId: 'mock-sub-event-id',
  },
  invitation: null,
  subEvent: {
    name: 'Welcome Party',
    eventDate: '2026-05-16T00:00:00.000Z',
    venue: 'The Garden Pavilion',
    description: 'Casual gathering for out-of-town guests.',
  },
  questions: [],
}

function parseGuestRsvpError(error: unknown): GuestRsvpError {
  if (error instanceof GuestRsvpError) {
    return error
  }

  const err = error as {
    status?: number
    statusCode?: number
    data?: { message?: string; alreadyResponded?: boolean }
  }
  const status = err.status ?? err.statusCode ?? 500
  const data = err.data

  if (status === 404) {
    return new GuestRsvpError('RSVP not found', 404, { notFound: true })
  }

  if (status === 409 && data?.alreadyResponded) {
    return new GuestRsvpError(
      data.message || 'You have already responded to this RSVP.',
      409,
      { alreadyResponded: true }
    )
  }

  return new GuestRsvpError(data?.message || 'Could not complete RSVP request.', status)
}

function getMockForm(rsvpId: string): GuestRsvpFormResponse {
  if (!isValidRsvpObjectId(rsvpId)) {
    throw new GuestRsvpError('RSVP not found', 404, { notFound: true })
  }

  if (rsvpId === MOCK_RSVP_RESPONDED_ID) {
    return { ...MOCK_RESPONDED_FORM, rsvp: { ...MOCK_RESPONDED_FORM.rsvp, _id: rsvpId } }
  }

  if (rsvpId === MOCK_RSVP_SUB_EVENT_ID) {
    return { ...MOCK_SUB_EVENT_FORM, rsvp: { ...MOCK_SUB_EVENT_FORM.rsvp, _id: rsvpId } }
  }

  if (rsvpId === MOCK_RSVP_PENDING_ID) {
    return MOCK_FORM
  }

  throw new GuestRsvpError('RSVP not found', 404, { notFound: true })
}

export function useGuestRsvp() {
  const { apiRequest, isUiOnlyMode } = useApiMode()

  async function fetchGuestRsvpForm(rsvpId: string): Promise<GuestRsvpFormResponse> {
    if (!isValidRsvpObjectId(rsvpId)) {
      throw new GuestRsvpError('RSVP not found', 404, { notFound: true })
    }

    if (isUiOnlyMode.value) {
      return getMockForm(rsvpId)
    }

    try {
      return await apiRequest<GuestRsvpFormResponse>(
        `/guest/rsvps/${encodeURIComponent(rsvpId)}/form`,
        { authenticated: false }
      )
    } catch (error) {
      throw parseGuestRsvpError(error)
    }
  }

  async function submitGuestRsvpResponse(
    rsvpId: string,
    payload: GuestRsvpRespondPayload
  ): Promise<GuestRsvpRespondResponse> {
    if (!isValidRsvpObjectId(rsvpId)) {
      throw new GuestRsvpError('RSVP not found', 404, { notFound: true })
    }

    if (isUiOnlyMode.value) {
      const form = getMockForm(rsvpId)
      if (form.alreadyResponded) {
        throw new GuestRsvpError(
          'You have already responded to this RSVP.',
          409,
          { alreadyResponded: true }
        )
      }
      return {
        success: true,
        status: 200,
        message: 'RSVP responded.',
        rsvp: {
          _id: rsvpId,
          name: form.rsvp.name,
          email: form.rsvp.email,
          status: payload.status,
          respondedAt: new Date().toISOString(),
          answers: payload.answers,
        },
      }
    }

    try {
      return await apiRequest<GuestRsvpRespondResponse>(
        `/guest/rsvps/${encodeURIComponent(rsvpId)}/respond`,
        {
          method: 'PATCH',
          body: payload,
          authenticated: false,
        }
      )
    } catch (error) {
      throw parseGuestRsvpError(error)
    }
  }

  return {
    fetchGuestRsvpForm,
    submitGuestRsvpResponse,
  }
}
