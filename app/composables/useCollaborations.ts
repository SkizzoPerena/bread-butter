import type {
  CollaborationActionResponse,
  CollaborationInvite,
  CollaborationListResponse,
  CollaboratorRole,
  EventCollaboratorsResponse,
  EventInvitesResponse
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

  async function inviteCollaborator(
    eventId: string,
    email: string,
    role: CollaboratorRole = 'USER'
  ): Promise<{ success: boolean; message?: string }> {
    if (isUiOnlyMode.value) {
      return { success: true, message: 'Collaboration invite sent.' }
    }

    return tracked(actorRole(), () => apiRequest<{ success: boolean; message?: string }>(
      `/user/events/${eventId}/collaborations`,
      {
        method: 'POST',
        body: { email, role },
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

  /** Everyone working on an event. Works for the owner, collaborators and partner collaborators. */
  async function listEventCollaborators(eventId: string): Promise<EventCollaboratorsResponse> {
    return loadPageData({
      mock: () => ({
        success: true,
        status: 200,
        owner: { _id: 'mock-owner', firstName: 'Jane', lastName: 'Host', email: 'jane@example.com' },
        collaborators: [],
        partnerCollaborators: [
          { _id: 'mock-partner', firstName: 'Cora', lastName: 'Coordinator', email: 'cora@example.com', joinedVia: 'VOUCHER' }
        ]
      }),
      // apiRequest sends this to /partner/... when a partner is viewing the event.
      fetch: () => apiRequest<EventCollaboratorsResponse>(`/user/events/${eventId}/collaborators`)
    })
  }

  /** Invites the owner sent that nobody has answered yet. */
  async function listEventInvites(eventId: string): Promise<EventInvitesResponse> {
    return loadPageData({
      mock: () => ({ success: true, status: 200, invites: [] }),
      fetch: () => apiRequest<EventInvitesResponse>(`/user/events/${eventId}/collaborations`)
    })
  }

  async function cancelEventInvite(eventId: string, collaborationId: string): Promise<CollaborationActionResponse> {
    if (isUiOnlyMode.value) {
      return { success: true, status: 200, message: 'Collaboration invite canceled.' }
    }
    return apiRequest<CollaborationActionResponse>(`/user/events/${eventId}/collaborations/${collaborationId}`, {
      method: 'DELETE'
    })
  }

  /** The owner removes someone, or a collaborator leaves (pass their own id). */
  async function removeCollaborator(eventId: string, accountId: string): Promise<CollaborationActionResponse> {
    if (isUiOnlyMode.value) {
      return { success: true, status: 200, message: 'Collaborator access revoked.' }
    }
    return apiRequest<CollaborationActionResponse>(`/user/events/${eventId}/collaborators/${accountId}`, {
      method: 'DELETE'
    })
  }

  async function listIncomingUserCollaborations(): Promise<CollaborationListResponse> {
    return loadPageData({
      mock: () => ({ success: true, status: 200, collaborations: mockCollaborations }),
      fetch: () => apiRequest<CollaborationListResponse>('/user/collaborations/incoming')
    })
  }

  async function acceptUserCollaboration(collaborationId: string): Promise<CollaborationActionResponse> {
    if (isUiOnlyMode.value) {
      return { success: true, status: 200, message: 'Collaboration invite accepted.', eventId: 'mock-event-1' }
    }
    return tracked('user', () => apiRequest<CollaborationActionResponse>(`/user/collaborations/${collaborationId}/accept`, {
      method: 'PATCH'
    }), { event: 'collaboration_accepted' }, {
      event: 'collaboration_accept_rejected',
      reasons: COLLABORATION_ACCEPT_REASONS,
    })
  }

  async function denyUserCollaboration(collaborationId: string): Promise<CollaborationActionResponse> {
    if (isUiOnlyMode.value) {
      return { success: true, status: 200, message: 'Collaboration invite denied.' }
    }
    return apiRequest<CollaborationActionResponse>(`/user/collaborations/${collaborationId}/deny`, {
      method: 'PATCH'
    })
  }

  return {
    listIncomingCollaborations,
    acceptCollaboration,
    denyCollaboration,
    inviteCollaborator,
    listEventCollaborators,
    listEventInvites,
    cancelEventInvite,
    removeCollaborator,
    listIncomingUserCollaborations,
    acceptUserCollaboration,
    denyUserCollaboration,
  }
}
