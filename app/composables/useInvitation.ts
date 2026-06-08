import type {
  InvitationMutationResponse,
  InvitationRecord,
  InvitationResponse,
  InvitationSavePayload,
} from '~/types/invitation'

const MOCK_INVITATION_ID = 'mock-invitation-id'

function mockInvitation(eventId: string, payload: InvitationSavePayload): InvitationRecord {
  return {
    _id: MOCK_INVITATION_ID,
    event: eventId,
    requestLine: payload.requestLine,
    eventLabel: payload.eventLabel,
    eventDate: payload.eventDate,
    eventTime: payload.eventTime,
    eventVenue: payload.eventVenue,
    blocks: payload.blocks,
    deadlineText: payload.deadlineText,
    deadlineDate: payload.deadlineDate,
  }
}

export function useInvitation() {
  const { apiRequest, isUiOnlyMode } = useApiMode()

  async function fetchInvitationByEvent(eventId: string): Promise<InvitationRecord | null> {
    if (isUiOnlyMode.value) {
      return null
    }
    const response = await apiRequest<InvitationResponse>(
      `/user/invitations/events/${eventId}`
    )
    return response.invitation ?? null
  }

  async function createInvitation(payload: InvitationSavePayload): Promise<InvitationRecord> {
    if (isUiOnlyMode.value) {
      return mockInvitation(payload.eventId, payload)
    }
    const response = await apiRequest<InvitationMutationResponse>('/user/invitations', {
      method: 'POST',
      body: payload,
    })
    if (!response.invitation) {
      throw new Error(response.message || 'Invitation was not returned.')
    }
    return response.invitation
  }

  async function updateInvitation(
    invitationId: string,
    payload: Omit<InvitationSavePayload, 'eventId'>
  ): Promise<InvitationRecord> {
    if (isUiOnlyMode.value) {
      return mockInvitation('mock-event-id', {
        eventId: 'mock-event-id',
        ...payload,
      })
    }
    const response = await apiRequest<InvitationMutationResponse>(
      `/user/invitations/${invitationId}`,
      {
        method: 'PATCH',
        body: payload,
      }
    )
    if (!response.invitation) {
      throw new Error(response.message || 'Invitation was not returned.')
    }
    return response.invitation
  }

  return {
    fetchInvitationByEvent,
    createInvitation,
    updateInvitation,
  }
}
