import type {
  AddGuestsToRoleResponse,
  CreateGuestRolePayload,
  CreateGuestRoleResponse,
  DeleteGuestRoleResponse,
  GuestRoleRecord,
  GuestRolesListResponse,
  RemoveGuestFromRoleResponse,
  UpdateGuestRoleResponse,
} from '~/types/guest_role'

export function useGuestRoles() {
  const { apiRequest, isUiOnlyMode } = useApiMode()

  async function fetchGuestRolesByEvent(eventId: string): Promise<GuestRoleRecord[]> {
    if (isUiOnlyMode.value) {
      return []
    }

    const response = await apiRequest<GuestRolesListResponse>(
      `/user/guest-roles/event/${eventId}`
    )
    return response.guestRoles ?? []
  }

  async function createGuestRole(
    eventId: string,
    payload: CreateGuestRolePayload
  ): Promise<CreateGuestRoleResponse> {
    const body = {
      eventId,
      name: payload.name.trim(),
    }

    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 201,
        message: 'Guest role created successfully.',
        guestRole: {
          _id: `mock-role-${Date.now()}`,
          event: eventId,
          name: body.name,
          guests: [],
        },
      }
    }

    return apiRequest<CreateGuestRoleResponse>('/user/guest-roles', {
      method: 'POST',
      body,
    })
  }

  async function updateGuestRole(
    roleId: string,
    name: string
  ): Promise<UpdateGuestRoleResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Guest role updated successfully.',
        guestRole: {
          _id: roleId,
          event: 'mock-event-id',
          name: name.trim(),
          guests: [],
        },
      }
    }

    return apiRequest<UpdateGuestRoleResponse>(`/user/guest-roles/${roleId}`, {
      method: 'PATCH',
      body: { name: name.trim() },
    })
  }

  async function deleteGuestRole(roleId: string): Promise<DeleteGuestRoleResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Guest role deleted successfully.',
      }
    }

    return apiRequest<DeleteGuestRoleResponse>(`/user/guest-roles/${roleId}`, {
      method: 'DELETE',
    })
  }

  async function addGuestsToRole(
    roleId: string,
    guestIds: string[]
  ): Promise<AddGuestsToRoleResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Guests assigned to the role.',
        guestRole: {
          _id: roleId,
          event: 'mock-event-id',
          name: 'Mock Role',
          guests: guestIds.map((id, index) => ({
            _id: id,
            name: `Guest ${index + 1}`,
            email: `guest${index + 1}@example.com`,
            rsvp: null,
          })),
        },
      }
    }

    return apiRequest<AddGuestsToRoleResponse>(`/user/guest-roles/${roleId}/guests`, {
      method: 'POST',
      body: { guestIds },
    })
  }

  async function removeGuestFromRole(
    roleId: string,
    guestId: string
  ): Promise<RemoveGuestFromRoleResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Guest removed from the role.',
        guestRole: {
          _id: roleId,
          event: 'mock-event-id',
          name: 'Mock Role',
          guests: [],
        },
      }
    }

    return apiRequest<RemoveGuestFromRoleResponse>(
      `/user/guest-roles/${roleId}/guests/${guestId}`,
      { method: 'DELETE' }
    )
  }

  return {
    fetchGuestRolesByEvent,
    createGuestRole,
    updateGuestRole,
    deleteGuestRole,
    addGuestsToRole,
    removeGuestFromRole,
  }
}
