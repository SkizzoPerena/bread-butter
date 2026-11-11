import type {
  InvitationMutationResponse,
  InvitationRecord,
  InvitationResponse,
  InvitationSavePayload,
} from '~/types/invitation'
import { actorRole, tracked } from '~/utils/analytics'

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
    bannerImageUrl: payload.bannerImageUrl,
  }
}

export function useInvitation() {
  const { apiRequest, apiUpload, isUiOnlyMode } = useApiMode()

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
    const response = await tracked(actorRole(), () => apiRequest<InvitationMutationResponse>('/user/invitations', {
      method: 'POST',
      body: payload,
    }), { event: 'invitation_saved' })
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
    const response = await tracked(actorRole(), () => apiRequest<InvitationMutationResponse>(
      `/user/invitations/${invitationId}`,
      {
        method: 'PATCH',
        body: payload,
      }
    ), { event: 'invitation_saved' })
    if (!response.invitation) {
      throw new Error(response.message || 'Invitation was not returned.')
    }
    return response.invitation
  }

  async function uploadInvitationCardImage(
    invitationId: string,
    file: File | Blob,
    buttonColor?: string
  ): Promise<InvitationRecord> {
    if (isUiOnlyMode.value) {
      const url = URL.createObjectURL(file)
      return {
        _id: invitationId,
        event: 'mock-event-id',
        requestLine: '',
        eventLabel: '',
        eventDate: '',
        eventTime: '',
        eventVenue: '',
        blocks: [],
        deadlineText: '',
        deadlineDate: '',
        cardImageUrl: url,
        cardImageUpdatedAt: new Date().toISOString()
      }
    }
    const form = new FormData()
    form.append('image', file, 'invitation-card.jpg')
    // The email's reply button takes the card's accent color.
    if (buttonColor && /^#[0-9a-f]{6}$/i.test(buttonColor)) {
      form.append('buttonColor', buttonColor)
    }
    let response: InvitationMutationResponse
    try {
      response = await apiUpload<InvitationMutationResponse>(
        `/user/invitations/${invitationId}/card-image`,
        form,
        { method: 'PATCH' }
      )
    } catch (err: any) {
      if (err?.status === 404 || err?.statusCode === 404) {
        response = await apiUpload<InvitationMutationResponse>(
          `/invitations/${invitationId}/card-image`,
          form,
          { method: 'PATCH' }
        )
      } else {
        throw err
      }
    }
    if (!response.invitation) {
      throw new Error(response.message || 'Invitation was not returned.')
    }
    return response.invitation
  }

  return {
    fetchInvitationByEvent,
    createInvitation,
    updateInvitation,
    uploadInvitationCardImage,
  }
}
