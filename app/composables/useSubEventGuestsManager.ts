import type { EventRecord, GuestRecord, RsvpSummary } from '~/types/event'
import { reportApiError } from '~/types/auth'
import {
  applySendAllInvitesToGuestList,
  applySendInviteToGuestList,
} from '~/utils/guestListUpdates'
import type { GuestTableRow } from '~/composables/useEventGuestsManager'
import { mapRsvpStatusToBadgeColor, mapRsvpStatusToLabel } from '~/utils/rsvpDisplay'

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
  const { sendSubEventInvites, sendSubEventGuestInvite } = useSubEventRsvps()

  const guestList = ref<GuestRecord[]>([])
  const isLoadingGuests = ref(false)
  const sendingGuestId = ref<string | null>(null)
  const isInvitingAll = ref(false)

  const mutationsDisabled = computed(() => Boolean(options.isEventCancelled?.value))

  const tableRows = computed<GuestTableRow[]>(() =>
    guestList.value.map((guest) => ({
      guestId: guest._id,
      name: guest.name,
      email: guest.email,
      guests: guest.rsvp?.status === 'GOING' ? 1 : 0,
      rsvpStatus: mapRsvpStatusToLabel(guest.rsvp?.status),
      invitationSent: Boolean(guest.rsvp?.invitedAt),
    }))
  )

  const isGuestListEmpty = computed(
    () => !isLoadingGuests.value && tableRows.value.length === 0
  )

  const uninvitedGuestsCount = computed(() =>
    guestList.value.filter((guest) => !guest.rsvp?.invitedAt).length
  )

  const canInviteAll = computed(
    () =>
      uninvitedGuestsCount.value > 0
      && !mutationsDisabled.value
      && Boolean(options.subEventId.value || isUiOnlyMode.value)
      && tableRows.value.length > 0
  )

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

  async function handleInviteAll() {
    if (isInvitingAll.value || !canInviteAll.value) {
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

    isInvitingAll.value = true
    try {
      const response = await sendSubEventInvites(
        options.subEventId.value || 'mock-sub-event-1'
      )
      const updated = applySendAllInvitesToGuestList(
        guestList.value,
        options.rsvpSummary.value,
        response
      )
      guestList.value = updated.guestList
      options.rsvpSummary.value = updated.rsvpSummary
      toast.add({
        title: 'Invitations sent',
        description: response.message,
      })
      await options.onInvitesSent?.()
    } catch (error) {
      reportApiError(toast, { title: 'Could not send invitations', error })
    } finally {
      isInvitingAll.value = false
    }
  }

  async function handleSendGuestInvite(guestId: string) {
    if (!guestId || sendingGuestId.value || isInvitingAll.value) {
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

    sendingGuestId.value = guestId
    try {
      const response = await sendSubEventGuestInvite(
        options.subEventId.value || 'mock-sub-event-1',
        guestId
      )
      const updated = applySendInviteToGuestList(
        guestList.value,
        options.rsvpSummary.value,
        guestId,
        response
      )
      guestList.value = updated.guestList
      options.rsvpSummary.value = updated.rsvpSummary
      toast.add({ title: 'Invitation sent', description: response.message })
      await options.onInvitesSent?.()
    } catch (error) {
      reportApiError(toast, { title: 'Could not send invitation', error })
    } finally {
      sendingGuestId.value = null
    }
  }

  return {
    guestList,
    isLoadingGuests,
    sendingGuestId,
    isInvitingAll,
    mutationsDisabled,
    tableRows,
    isGuestListEmpty,
    canInviteAll,
    loadGuests,
    handleInviteAll,
    handleSendGuestInvite,
    mapRsvpStatusToBadgeColor,
  }
}
