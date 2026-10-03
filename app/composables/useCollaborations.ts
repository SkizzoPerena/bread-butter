import type {
  CollaborationActionResponse,
  CollaborationInvite,
  CollaborationListResponse
} from '~/types/collaboration'
import {
  COLLABORATION_ACCEPT_REASONS,
  COLLABORATION_INVITE_REASONS,
  actorRole,
  tracked,
} from '~/utils/analytics'

const mockCollaborations: CollaborationInvite[] = [
  {
    _id: 'mock-collab-1',
    event: {
      _id: 'mock-event-1',
      eventName: 'Arielle and Marco Wedding',
      eventDate: new Date().toISOString(),
      venue: 'Manila Cathedral',
      status: 'ONGOING'
    },
    invitedBy: {
      firstName: 'Bread',
      lastName: 'Butter',
      email: 'planner@example.com'
    },
    createdAt: new Date().toISOString()
  }
]

export function useCollaborations() {
  const { apiRequest, loadPageData, isUiOnlyMode } = useApiMode()

  async function listIncomingCollaborations(): Promise<CollaborationListResponse> {
    return loadPageData({
      mock: () => ({ success: true, status: 200, collaborations: mockCollaborations }),
      fetch: () => apiRequest<CollaborationListResponse>('/partner/collaborations/incoming')
    })
  }

  async function acceptCollaboration(collaborationId: string): Promise<CollaborationActionResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Collaboration invite accepted.',
        eventId: 'mock-event-1'
      }
    }

    return tracked('partner', () => apiRequest<CollaborationActionResponse>(`/partner/collaborations/${collaborationId}/accept`, {
      method: 'PATCH'
    }), { event: 'collaboration_accepted' }, {
      event: 'collaboration_accept_rejected',
      reasons: COLLABORATION_ACCEPT_REASONS,
    })
  }

  async function denyCollaboration(collaborationId: string): Promise<CollaborationActionResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Collaboration invite denied.'
      }
    }

    return apiRequest<CollaborationActionResponse>(`/partner/collaborations/${collaborationId}/deny`, {
      method: 'PATCH'
    })
  }

  async function inviteCollaborator(eventId: string, email: string): Promise<{ success: boolean; message?: string }> {
    if (isUiOnlyMode.value) {
      return { success: true, message: 'Collaboration invite sent.' }
    }

    return tracked(actorRole(), () => apiRequest<{ success: boolean; message?: string }>(
      `/user/events/${eventId}/collaborations`,
      {
        method: 'POST',
        body: { email },
      }
    ), {
      event: 'collaborator_invited',
      props: { event_id: eventId },
    }, {
      event: 'collaborator_invite_rejected',
      reasons: COLLABORATION_INVITE_REASONS,
      props: { event_id: eventId },
    })
  }

  return {
    listIncomingCollaborations,
    acceptCollaboration,
    denyCollaboration,
    inviteCollaborator,
  }
}
