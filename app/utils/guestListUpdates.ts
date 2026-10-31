import type { GuestRecord, RsvpSummary } from '~/types/event'
import type { SendInviteResponse } from '~/types/guest'

export type InviteDelivery = 'Yes' | 'No' | 'Pending' | 'Not delivered'

export function inviteDeliveryLabel(rsvp: GuestRecord['rsvp']): InviteDelivery {
  if (!rsvp?.invitedAt) return 'No'
  if (rsvp.inviteEmailCreditRefundedAt) return 'Not delivered'
  return rsvp.inviteEmailSentAt ? 'Yes' : 'Pending'
}

/** Says what happened to the emails, because an invite can be recorded while its email fails. */
export function inviteResultToast(response: SendInviteResponse): {
  title: string
  description: string
  color?: 'warning'
} {
  const reported = response.emailsQueued !== undefined || response.emailsSent !== undefined
  const queued = response.emailsQueued ?? 0
  const failed = response.emailsFailed ?? 0
  const attempted = reported ? queued + (response.emailsSent ?? 0) + failed : response.created
  const resent = Math.max(0, attempted - response.created)
  const alreadyInvited = Math.max(0, response.skippedAlreadyInvited - resent)
  const alreadyInvitedNote = alreadyInvited > 0 ? `, ${alreadyInvited} already invited` : ''

  if (failed > 0) {
    return {
      title: 'Some invitations were not sent',
      description: `${failed} of ${attempted} could not be sent. Use Resend on those guests to try again.`,
      color: 'warning',
    }
  }
  if (attempted === 0 && response.created > 0) {
    return {
      title: 'Invitations saved, not sent yet',
      description: `Email is unavailable right now, so ${response.created} invitation(s) will be retried tomorrow morning.`,
      color: 'warning',
    }
  }
  if (attempted === 0) {
    return { title: 'No new invitations', description: `All ${alreadyInvited} guest(s) were already invited.` }
  }
  return queued > 0
    ? { title: 'Invitations on their way', description: `${attempted} invitation(s) queued to send${alreadyInvitedNote}.` }
    : { title: 'Invitations sent', description: `${attempted} invitation(s) sent${alreadyInvitedNote}.` }
}

function incrementRsvpSummaryForInvites(
  rsvpSummary: RsvpSummary,
  created: number
): RsvpSummary {
  return {
    ...rsvpSummary,
    totalSent: rsvpSummary.totalSent + created,
    emailsSent: (rsvpSummary.emailsSent ?? rsvpSummary.totalSent) + created,
    pending: rsvpSummary.pending + created,
  }
}

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
        inviteEmailSentAt: response.emailsSent ? invitedAt : null,
        inviteEmailCreditRefundedAt: null,
      },
    }
  })

  let updatedRsvpSummary = rsvpSummary
  if (rsvpSummary && response.created > 0) {
    updatedRsvpSummary = incrementRsvpSummaryForInvites(rsvpSummary, response.created)
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
    updatedRsvpSummary = incrementRsvpSummaryForInvites(rsvpSummary, response.created)
  }

  return { guestList: updatedGuestList, rsvpSummary: updatedRsvpSummary }
}

export function clearSubEventInviteFromList(
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
      noResponse: status === 'NO_RESPONSE'
        ? Math.max(0, (rsvpSummary.noResponse ?? 0) - 1)
        : rsvpSummary.noResponse,
    }
  }

  const updatedGuestList = guestList.map((entry) => {
    if (entry._id !== guestId) {
      return entry
    }
    return { ...entry, rsvp: null }
  })

  return { guestList: updatedGuestList, rsvpSummary: updatedRsvpSummary }
}

export function applyBulkSendInvitesToGuestList(
  guestList: GuestRecord[],
  rsvpSummary: RsvpSummary | null,
  guestIds: string[],
  response: SendInviteResponse
): { guestList: GuestRecord[]; rsvpSummary: RsvpSummary | null } {
  if (response.created <= 0) {
    return { guestList, rsvpSummary }
  }

  const guestIdSet = new Set(guestIds)
  const invitedAt = new Date().toISOString()
  const updatedGuestList = guestList.map((guest) => {
    if (!guestIdSet.has(guest._id) || guest.rsvp?.invitedAt) {
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
    updatedRsvpSummary = incrementRsvpSummaryForInvites(rsvpSummary, response.created)
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
      noResponse: status === 'NO_RESPONSE'
        ? Math.max(0, (rsvpSummary.noResponse ?? 0) - 1)
        : rsvpSummary.noResponse,
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
