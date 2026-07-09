import type { EventRecord, GuestRecord, RsvpSummary } from '~/types/event'
import { reportApiError } from '~/types/auth'
import {
  applyBulkSendInvitesToGuestList,
  clearSubEventInviteFromList,
} from '~/utils/guestListUpdates'
import type { GuestTableRow } from '~/composables/useEventGuestsManager'
import { mapRsvpStatusToBadgeColor, mapRsvpStatusToLabel } from '~/utils/rsvpDisplay'
import { formatGuestDisplayName } from '~/utils/guestName'
import { guestRowMatchesDirectSearch } from '~/utils/guestSearch'

export interface SubEventGuestTableRow extends GuestTableRow {
  rsvpId: string
}

export interface UseSubEventGuestsManagerOptions {
  eventId: Ref<string>
  subEventId: Ref<string>
  eventRecord: Ref<EventRecord | null>
  isEventCancelled?: Ref<boolean | undefined>
  rsvpSummary: Ref<RsvpSummary | null>
  onInvitesSent?: () => void | Promise<void>
}

export function useSubEventGuestsManager(options: UseSubEventGuestsManagerOptions) {
  const toast = useToast()
  const { isUiOnlyMode } = useApiMode()
  const { fetchGuestsByEvent } = useGuests()
  const { sendSubEventInvites, deleteSubEventRsvp } = useSubEventRsvps()

  const guestList = ref<GuestRecord[]>([])
  const isLoadingGuests = ref(false)
  const uninvitingGuestId = ref<string | null>(null)
  const isSendingInvites = ref(false)
  const selectedInviteGuestIds = ref<Set<string>>(new Set())
  const inviteSearchQuery = ref('')

  const remainingEmails = computed(() => {
    const value = options.eventRecord.value?.remainingEmails
    return typeof value === 'number' ? value : null
  })

  const hasEmailCredits = computed(() => {
    if (remainingEmails.value == null) {
      return true
    }
    return remainingEmails.value > 0
  })

  const canBulkInvite = computed(() => {
    const count = selectedInviteGuestIds.value.size
    if (count === 0 || mutationsDisabled.value) {
      return false
    }
    if (remainingEmails.value == null) {
      return true
    }
    return remainingEmails.value >= count
  })

  const mutationsDisabled = computed(() => Boolean(options.isEventCancelled?.value))

  const invitedGuests = computed(() =>
    guestList.value.filter((guest) => Boolean(guest.rsvp?.invitedAt))
  )

  const uninvitedGuests = computed(() =>
    guestList.value.filter((guest) => !guest.rsvp?.invitedAt)
  )

  const tableRows = computed<SubEventGuestTableRow[]>(() =>
    invitedGuests.value.map((guest) => ({
      guestId: guest._id,
      rsvpId: guest.rsvp!._id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      displayName: formatGuestDisplayName(guest.firstName, guest.lastName),
      mailingAddress: guest.mailingAddress ?? '',
      contactNumber: guest.contactNumber ?? '',
      envelopeName: guest.envelopeName ?? '',
      email: guest.email,
      guests: guest.rsvp?.status === 'GOING' ? 1 : 0,
      rsvpStatus: mapRsvpStatusToLabel(guest.rsvp?.status),
      invitationSent: true,
    }))
  )

  const filteredUninvitedGuests = computed(() => {
    const query = inviteSearchQuery.value.trim().toLowerCase()
    if (!query) {
      return uninvitedGuests.value
    }
    return uninvitedGuests.value.filter((guest) =>
      guestRowMatchesDirectSearch(
        {
          firstName: guest.firstName,
          lastName: guest.lastName,
          displayName: formatGuestDisplayName(guest.firstName, guest.lastName),
          email: guest.email,
          mailingAddress: guest.mailingAddress ?? '',
          contactNumber: guest.contactNumber ?? '',
          envelopeName: guest.envelopeName ?? '',
        },
        query
      )
    )
  })

  const isGuestListEmpty = computed(
    () => !isLoadingGuests.value && tableRows.value.length === 0
  )

  const canInviteGuests = computed(
    () =>
      uninvitedGuests.value.length > 0
      && !mutationsDisabled.value
      && hasEmailCredits.value
      && Boolean(options.subEventId.value || isUiOnlyMode.value)
  )

  const allUninvitedSelected = computed(() => {
    const visible = filteredUninvitedGuests.value
    return visible.length > 0 && visible.every((guest) => selectedInviteGuestIds.value.has(guest._id))
  })

  const someUninvitedSelected = computed(() => {
    const visible = filteredUninvitedGuests.value
    const selectedCount = visible.filter((guest) =>
      selectedInviteGuestIds.value.has(guest._id)
    ).length
    return selectedCount > 0 && selectedCount < visible.length
  })

  async function loadGuests() {
    if (!options.eventId.value && !isUiOnlyMode.value) {
      guestList.value = []
      return
    }
    if (!options.subEventId.value && !isUiOnlyMode.value) {
      guestList.value = []
      return
    }

    isLoadingGuests.value = true
    try {
      guestList.value = await fetchGuestsByEvent(
        options.eventId.value || 'mock-event-id',
        options.subEventId.value || undefined
      )
    } catch (error) {
      reportApiError(toast, { title: 'Could not load guests', error })
      guestList.value = []
    } finally {
      isLoadingGuests.value = false
    }
  }

  watch(
    [() => options.eventId.value, () => options.subEventId.value],
    () => {
      loadGuests()
    },
    { immediate: true }
  )

  function toggleInviteSelection(guestId: string, selected: boolean) {
    const next = new Set(selectedInviteGuestIds.value)
    if (selected) {
      next.add(guestId)
    } else {
      next.delete(guestId)
    }
    selectedInviteGuestIds.value = next
  }

  function toggleSelectAllUninvited(selected: boolean) {
    if (!selected) {
      selectedInviteGuestIds.value = new Set()
      return
    }
    selectedInviteGuestIds.value = new Set(
      filteredUninvitedGuests.value.map((guest) => guest._id)
    )
  }

  function clearInviteSelection() {
    selectedInviteGuestIds.value = new Set()
    inviteSearchQuery.value = ''
  }

  async function handleBulkInvite(guestIds: string[]) {
    if (isSendingInvites.value || guestIds.length === 0) {
      return
    }
    if (!hasEmailCredits.value) {
      toast.add({
        title: 'No email credits remaining',
        description: 'You have used all invitation emails included in your event plan.',
        color: 'error',
      })
      return
    }
    if (remainingEmails.value != null && guestIds.length > remainingEmails.value) {
      toast.add({
        title: 'Not enough email credits',
        description: `You need ${guestIds.length} credits but only ${remainingEmails.value} remain.`,
        color: 'error',
      })
      return
    }
    if (mutationsDisabled.value) {
      toast.add({
        title: 'Event cancelled',
        description: 'Cannot send invitations for a cancelled event.',
        color: 'error',
      })
      return
    }

    isSendingInvites.value = true
    try {
      const response = await sendSubEventInvites(
        options.subEventId.value || 'mock-sub-event-1',
        guestIds
      )
      const updated = applyBulkSendInvitesToGuestList(
        guestList.value,
        options.rsvpSummary.value,
        guestIds,
        response
      )
      guestList.value = updated.guestList
      options.rsvpSummary.value = updated.rsvpSummary
      if (
        options.eventRecord.value &&
        typeof response.remainingEmails === 'number'
      ) {
        options.eventRecord.value = {
          ...options.eventRecord.value,
          remainingEmails: response.remainingEmails,
        }
      }
      await loadGuests()
      await options.onInvitesSent?.()
      toast.add({
        title: 'Invitations sent',
        description: response.message,
      })
    } catch (error) {
      reportApiError(toast, { title: 'Could not send invitations', error })
    } finally {
      isSendingInvites.value = false
    }
  }

  async function handleUninvite(guestId: string, rsvpId: string) {
    if (!guestId || !rsvpId || uninvitingGuestId.value || isSendingInvites.value) {
      return
    }
    if (mutationsDisabled.value) {
      toast.add({
        title: 'Event cancelled',
        description: 'Cannot modify invitations for a cancelled event.',
        color: 'error',
      })
      return
    }

    uninvitingGuestId.value = guestId
    try {
      await deleteSubEventRsvp(rsvpId)
      const updated = clearSubEventInviteFromList(
        guestList.value,
        options.rsvpSummary.value,
        guestId
      )
      guestList.value = updated.guestList
      options.rsvpSummary.value = updated.rsvpSummary
      await loadGuests()
      await options.onInvitesSent?.()
      toast.add({
        title: 'Guest uninvited',
        description: 'The invitation has been removed from this schedule.',
      })
    } catch (error) {
      reportApiError(toast, { title: 'Could not uninvite guest', error })
    } finally {
      uninvitingGuestId.value = null
    }
  }

  return {
    guestList,
    isLoadingGuests,
    uninvitingGuestId,
    isSendingInvites,
    remainingEmails,
    hasEmailCredits,
    canBulkInvite,
    mutationsDisabled,
    invitedGuests,
    uninvitedGuests,
    filteredUninvitedGuests,
    tableRows,
    isGuestListEmpty,
    canInviteGuests,
    selectedInviteGuestIds,
    inviteSearchQuery,
    allUninvitedSelected,
    someUninvitedSelected,
    loadGuests,
    toggleInviteSelection,
    toggleSelectAllUninvited,
    clearInviteSelection,
    handleBulkInvite,
    handleUninvite,
    mapRsvpStatusToBadgeColor,
  }
}
