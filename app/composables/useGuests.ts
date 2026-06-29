import type {
  BulkAssignTableResponse,
  CreateGuestResponse,
  CreateGuestsBulkResponse,
  DeleteGuestResponse,
  EventTablesResponse,
  GuestEntryInput,
  GuestsListResponse,
  SendInviteResponse,
  UpdateGuestInput,
  UpdateGuestResponse,
} from '~/types/guest'
import type { GuestRecord } from '~/types/event'
import { findMockSubEventRsvpByEmail } from '~/composables/useSubEventRsvps'
import type { TableAssignmentValue } from '~/utils/tableCode'

function normalizeGuestEntry(entry: GuestEntryInput) {
  return {
    firstName: entry.firstName.trim(),
    lastName: entry.lastName.trim(),
    email: entry.email.trim().toLowerCase(),
    mailingAddress: entry.mailingAddress?.trim() ?? '',
    contactNumber: entry.contactNumber?.trim() ?? '',
    envelopeName: entry.envelopeName?.trim() ?? '',
  }
}

export function useGuests() {
  const { apiRequest, isUiOnlyMode } = useApiMode()

  async function createGuest(
    eventId: string,
    entry: GuestEntryInput
  ): Promise<CreateGuestResponse> {
    const normalized = normalizeGuestEntry(entry)

    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 201,
        message: 'Guest added to the list.',
        guest: {
          _id: `mock-guest-${Date.now()}`,
          ...normalized,
          rsvp: null,
        },
      }
    }

    return apiRequest<CreateGuestResponse>('/user/guests', {
      method: 'POST',
      body: { eventId, ...normalized },
    })
  }

  async function createGuestsBulk(
    eventId: string,
    guests: GuestEntryInput[]
  ): Promise<CreateGuestsBulkResponse> {
    const normalized = guests.map((entry) => normalizeGuestEntry(entry))

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

  async function updateGuest(
    guestId: string,
    fields: UpdateGuestInput
  ): Promise<UpdateGuestResponse> {
    const body: UpdateGuestInput = {}
    if (fields.firstName !== undefined) body.firstName = fields.firstName.trim()
    if (fields.lastName !== undefined) body.lastName = fields.lastName.trim()
    if (fields.email !== undefined) body.email = fields.email.trim().toLowerCase()
    if (fields.mailingAddress !== undefined) body.mailingAddress = fields.mailingAddress.trim()
    if (fields.contactNumber !== undefined) body.contactNumber = fields.contactNumber.trim()
    if (fields.envelopeName !== undefined) body.envelopeName = fields.envelopeName.trim()
    if (fields.tableCode !== undefined) body.tableCode = fields.tableCode

    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Guest updated successfully.',
        guest: {
          _id: guestId,
          firstName: body.firstName ?? 'Maria',
          lastName: body.lastName ?? 'Santos',
          email: body.email ?? 'maria.santos@example.com',
          mailingAddress: body.mailingAddress ?? '',
          contactNumber: body.contactNumber ?? '',
          envelopeName: body.envelopeName ?? '',
          rsvp: null,
        },
      }
    }

    return apiRequest<UpdateGuestResponse>(`/user/guests/${guestId}`, {
      method: 'PATCH',
      body,
    })
  }

  async function fetchGuestsByEvent(
    eventId: string,
    subEventId?: string
  ): Promise<GuestRecord[]> {
    if (isUiOnlyMode.value) {
      const mockGuests: GuestRecord[] = [
        {
          _id: 'mock-guest-1',
          firstName: 'Maria',
          lastName: 'Santos',
          mailingAddress: '123 Rizal St, Manila',
          contactNumber: '+63 912 345 6789',
          envelopeName: 'Mr. & Mrs. Maria Santos',
          email: 'maria.santos@example.com',
          rsvp: null,
        },
        {
          _id: 'mock-guest-2',
          firstName: 'Juan',
          lastName: 'Dela Cruz',
          mailingAddress: '',
          contactNumber: '',
          envelopeName: 'Juan Dela Cruz',
          email: 'juan.delacruz@example.com',
          rsvp: null,
        },
        {
          _id: 'mock-guest-3',
          firstName: 'Ana',
          lastName: 'Reyes',
          mailingAddress: '45 Mabini Ave, Quezon City',
          contactNumber: '',
          envelopeName: 'Ana Reyes',
          email: 'ana.reyes@example.com',
          rsvp: null,
        },
      ]

      if (subEventId) {
        return mockGuests.map((guest) => {
          const subEventRsvp = findMockSubEventRsvpByEmail(subEventId, guest.email)
          return {
            ...guest,
            rsvp: subEventRsvp
              ? {
                  _id: subEventRsvp._id,
                  status: subEventRsvp.status,
                  invitedAt: subEventRsvp.invitedAt,
                  respondedAt: subEventRsvp.respondedAt,
                }
              : null,
          }
        })
      }

      return mockGuests
    }

    const query = subEventId
      ? `?subEventId=${encodeURIComponent(subEventId)}`
      : ''
    const response = await apiRequest<GuestsListResponse>(
      `/user/guests/event/${eventId}${query}`
    )
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

  async function fetchEventTables(eventId: string): Promise<string[]> {
    if (isUiOnlyMode.value) {
      return ['A', 'B']
    }

    const response = await apiRequest<EventTablesResponse>(
      `/user/guests/event/${eventId}/tables`
    )
    return response.tableCodes ?? []
  }

  async function assignGuestsTableBulk(
    eventId: string,
    guestIds: string[],
    tableCode: TableAssignmentValue
  ): Promise<BulkAssignTableResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Guests assigned to table.',
        tableCode: tableCode === '__new__' ? 'C' : tableCode,
        guests: [],
      }
    }

    return apiRequest<BulkAssignTableResponse>(
      `/user/guests/event/${eventId}/bulk/table`,
      {
        method: 'PATCH',
        body: { guestIds, tableCode },
      }
    )
  }

  return {
    createGuest,
    createGuestsBulk,
    updateGuest,
    fetchGuestsByEvent,
    sendGuestInvite,
    sendAllGuestInvites,
    deleteGuest,
    fetchEventTables,
    assignGuestsTableBulk,
  }
}
