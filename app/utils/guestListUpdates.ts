import type { GuestRecord, RsvpSummary } from '~/types/event'
import type { SendInviteResponse } from '~/types/guest'

export function appendGuestToList(
  guestList: GuestRecord[],
  guest: GuestRecord
): GuestRecord[] {
  const exists = guestList.some(
    (entry) => entry._id === guest._id || entry.email.toLowerCase() === guest.email.toLowerCase()
  )
  if (exists) {
    return guestList
  }
  return [...guestList, guest]
}

export function applySendInviteToGuestList(
  guestList: GuestRecord[],
  rsvpSummary: RsvpSummary | null,
  guestId: string,
  response: SendInviteResponse
): { guestList: GuestRecord[]; rsvpSummary: RsvpSummary | null } {
  if (response.created <= 0 && response.skippedAlreadyInvited <= 0) {
    return { guestList, rsvpSummary }
  }

  const invitedAt = new Date().toISOString()
  const updatedGuestList = guestList.map((guest) => {
    if (guest._id !== guestId) {
      return guest
    }

    const existingRsvp = guest.rsvp
    return {
      ...guest,
      rsvp: {
        _id: existingRsvp?._id ?? `rsvp-${guestId}`,
        status: existingRsvp?.status ?? 'PENDING',
        invitedAt: existingRsvp?.invitedAt ?? invitedAt,
        respondedAt: existingRsvp?.respondedAt ?? null,
      },
    }
  })

  let updatedRsvpSummary = rsvpSummary
  if (rsvpSummary && response.created > 0) {
    updatedRsvpSummary = {
      ...rsvpSummary,
      totalSent: rsvpSummary.totalSent + response.created,
      pending: rsvpSummary.pending + response.created,
    }
  }

  return { guestList: updatedGuestList, rsvpSummary: updatedRsvpSummary }
}

export function applySendAllInvitesToGuestList(
  guestList: GuestRecord[],
  rsvpSummary: RsvpSummary | null,
  response: SendInviteResponse
): { guestList: GuestRecord[]; rsvpSummary: RsvpSummary | null } {
  if (response.created <= 0 && response.skippedAlreadyInvited <= 0) {
    return { guestList, rsvpSummary }
  }

  const invitedAt = new Date().toISOString()
  const updatedGuestList = guestList.map((guest) => {
    if (guest.rsvp?.invitedAt) {
      return guest
    }

    return {
      ...guest,
      rsvp: {
        _id: guest.rsvp?._id ?? `rsvp-${guest._id}`,
        status: guest.rsvp?.status ?? 'PENDING',
        invitedAt,
        respondedAt: guest.rsvp?.respondedAt ?? null,
      },
    }
  })

  let updatedRsvpSummary = rsvpSummary
  if (rsvpSummary && response.created > 0) {
    updatedRsvpSummary = {
      ...rsvpSummary,
      totalSent: rsvpSummary.totalSent + response.created,
      pending: rsvpSummary.pending + response.created,
    }
  }

  return { guestList: updatedGuestList, rsvpSummary: updatedRsvpSummary }
}

export function removeGuestFromList(
  guestList: GuestRecord[],
  rsvpSummary: RsvpSummary | null,
  guestId: string
): { guestList: GuestRecord[]; rsvpSummary: RsvpSummary | null } {
  const guest = guestList.find((entry) => entry._id === guestId)
  if (!guest) {
    return { guestList, rsvpSummary }
  }

  const hadInvite = Boolean(guest.rsvp?.invitedAt)
  const status = guest.rsvp?.status

  let updatedRsvpSummary = rsvpSummary
  if (rsvpSummary && hadInvite) {
    updatedRsvpSummary = {
      ...rsvpSummary,
      totalSent: Math.max(0, rsvpSummary.totalSent - 1),
      pending: status === 'PENDING'
        ? Math.max(0, rsvpSummary.pending - 1)
        : rsvpSummary.pending,
      going: status === 'GOING'
        ? Math.max(0, rsvpSummary.going - 1)
        : rsvpSummary.going,
      notGoing: status === 'NOT_GOING'
        ? Math.max(0, rsvpSummary.notGoing - 1)
        : rsvpSummary.notGoing,
    }
  }

  return {
    guestList: guestList.filter((entry) => entry._id !== guestId),
    rsvpSummary: updatedRsvpSummary,
  }
}

export function formatGuestValidationErrors(error: unknown): string | null {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { errors?: unknown[]; message?: string } }).data
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      return data.errors
        .filter((entry): entry is string => typeof entry === 'string')
        .join('\n')
    }
  }
  return null
}
