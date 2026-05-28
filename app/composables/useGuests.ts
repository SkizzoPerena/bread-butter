import type {
  CreateGuestResponse,
  CreateGuestsBulkResponse,
  DeleteGuestResponse,
  GuestEntryInput,
  GuestsListResponse,
  SendInviteResponse
} from '~/types/guest'
import type { GuestRecord } from '~/types/event'

export function useGuests() {
  const { apiRequest, isUiOnlyMode } = useApiMode()

  async function createGuest(
    eventId: string,
    entry: GuestEntryInput
  ): Promise<CreateGuestResponse> {
    const name = entry.name.trim()
    const email = entry.email.trim().toLowerCase()

    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 201,
        message: 'Guest added to the list.',
        guest: {
          _id: `mock-guest-${Date.now()}`,
          name,
          email,
          rsvp: null,
        },
      }
    }

    return apiRequest<CreateGuestResponse>('/user/guests', {
      method: 'POST',
      body: { eventId, name, email },
    })
  }

  async function createGuestsBulk(
    eventId: string,
    guests: GuestEntryInput[]
  ): Promise<CreateGuestsBulkResponse> {
    const normalized = guests.map((entry) => ({
      name: entry.name.trim(),
      email: entry.email.trim().toLowerCase(),
    }))

    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 201,
        message: 'Guests added to the list.',
        requested: normalized.length,
        created: normalized.length,
        skippedExisting: 0,
      }
    }

    return apiRequest<CreateGuestsBulkResponse>(`/user/guests/event/${eventId}/bulk`, {
      method: 'POST',
      body: { guests: normalized },
    })
  }

  async function fetchGuestsByEvent(eventId: string): Promise<GuestRecord[]> {
    if (isUiOnlyMode.value) {
      return []
    }

    const response = await apiRequest<GuestsListResponse>(`/user/guests/event/${eventId}`)
    return response.guests ?? []
  }

  async function sendAllGuestInvites(eventId: string): Promise<SendInviteResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 201,
        message: 'RSVP invites processed.',
        requested: 3,
        created: 1,
        skippedAlreadyInvited: 2,
        notFound: 0,
      }
    }

    return apiRequest<SendInviteResponse>(`/user/rsvps/event/${eventId}/send`, {
      method: 'POST',
      body: {},
    })
  }

  async function sendGuestInvite(guestId: string): Promise<SendInviteResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 201,
        message: 'RSVP invites processed.',
        requested: 1,
        created: 1,
        skippedAlreadyInvited: 0,
        notFound: 0,
      }
    }

    return apiRequest<SendInviteResponse>(`/user/rsvps/guest/${guestId}/send`, {
      method: 'POST',
    })
  }

  async function deleteGuest(guestId: string): Promise<DeleteGuestResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Guest removed from the list.',
      }
    }

    return apiRequest<DeleteGuestResponse>(`/user/guests/${guestId}`, {
      method: 'DELETE',
    })
  }

  return {
    createGuest,
    createGuestsBulk,
    fetchGuestsByEvent,
    sendGuestInvite,
    sendAllGuestInvites,
    deleteGuest,
  }
}
