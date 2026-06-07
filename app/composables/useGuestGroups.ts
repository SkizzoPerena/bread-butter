import type {
  AddGuestsToGroupResponse,
  CreateGuestGroupPayload,
  CreateGuestGroupResponse,
  GuestGroupRecord,
  GuestGroupsListResponse,
  RemoveGuestFromGroupResponse,
  UpdateGuestGroupPayload,
  UpdateGuestGroupResponse,
  DeleteGuestGroupResponse,
} from '~/types/guest_group'

export function useGuestGroups() {
  const { apiRequest, isUiOnlyMode } = useApiMode()

  async function fetchGuestGroupsByEvent(eventId: string): Promise<GuestGroupRecord[]> {
    if (isUiOnlyMode.value) {
      return []
    }

    const response = await apiRequest<GuestGroupsListResponse>(
      `/user/guest-groups/event/${eventId}`
    )
    return response.guestGroups ?? []
  }

  async function createGuestGroup(
    eventId: string,
    payload: CreateGuestGroupPayload
  ): Promise<CreateGuestGroupResponse> {
    const body: CreateGuestGroupPayload & { eventId: string } = {
      eventId,
      guestIds: payload.guestIds,
    }
    if (payload.name?.trim()) {
      body.name = payload.name.trim()
    }

    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 201,
        message: 'Guest group created successfully.',
        guestGroup: {
          _id: `mock-group-${Date.now()}`,
          event: eventId,
          name: body.name ?? null,
          guests: payload.guestIds.map((id, index) => ({
            _id: id,
            name: `Guest ${index + 1}`,
            email: `guest${index + 1}@example.com`,
            rsvp: null,
          })),
        },
      }
    }

    return apiRequest<CreateGuestGroupResponse>('/user/guest-groups', {
      method: 'POST',
      body,
    })
  }

  async function addGuestsToGroup(
    groupId: string,
    guestIds: string[]
  ): Promise<AddGuestsToGroupResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Guests added to the group.',
        guestGroup: {
          _id: groupId,
          event: 'mock-event-id',
          name: null,
          guests: guestIds.map((id, index) => ({
            _id: id,
            name: `Guest ${index + 1}`,
            email: `guest${index + 1}@example.com`,
            rsvp: null,
          })),
        },
      }
    }

    return apiRequest<AddGuestsToGroupResponse>(`/user/guest-groups/${groupId}/guests`, {
      method: 'POST',
      body: { guestIds },
    })
  }

  async function updateGuestGroup(
    groupId: string,
    payload: UpdateGuestGroupPayload
  ): Promise<UpdateGuestGroupResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Guest group updated successfully.',
        guestGroup: {
          _id: groupId,
          event: 'mock-event-id',
          name: payload.name ?? null,
          guests: (payload.guestIds ?? []).map((id, index) => ({
            _id: id,
            name: `Guest ${index + 1}`,
            email: `guest${index + 1}@example.com`,
            rsvp: null,
          })),
        },
      }
    }

    return apiRequest<UpdateGuestGroupResponse>(`/user/guest-groups/${groupId}`, {
      method: 'PATCH',
      body: payload,
    })
  }

  async function deleteGuestGroup(groupId: string): Promise<DeleteGuestGroupResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Guest group deleted successfully.',
      }
    }

    return apiRequest<DeleteGuestGroupResponse>(`/user/guest-groups/${groupId}`, {
      method: 'DELETE',
    })
  }

  async function removeGuestFromGroup(
    groupId: string,
    guestId: string
  ): Promise<RemoveGuestFromGroupResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Guest removed from the group.',
      }
    }

    return apiRequest<RemoveGuestFromGroupResponse>(
      `/user/guest-groups/${groupId}/guests/${guestId}`,
      { method: 'DELETE' }
    )
  }

  return {
    fetchGuestGroupsByEvent,
    createGuestGroup,
    addGuestsToGroup,
    updateGuestGroup,
    deleteGuestGroup,
    removeGuestFromGroup,
  }
}
