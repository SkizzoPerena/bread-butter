import type {
  CollaborationActionResponse,
  CollaborationInvite,
  CollaborationListResponse
} from '~/types/collaboration'

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

    return apiRequest<CollaborationActionResponse>(`/partner/collaborations/${collaborationId}/accept`, {
      method: 'PATCH'
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

  return {
    listIncomingCollaborations,
    acceptCollaboration,
    denyCollaboration
  }
}
