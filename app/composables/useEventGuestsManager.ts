import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { EventRecord, GuestRecord, RsvpSummary } from '~/types/event'
import { getApiErrorMessage, reportApiError } from '~/types/auth'
import {
  appendGuestToList,
  applySendAllInvitesToGuestList,
  applySendInviteToGuestList,
  formatGuestValidationErrors,
  removeGuestFromList,
} from '~/utils/guestListUpdates'

const rsvpOptions = ['Attending', 'Pending', 'Not Attending'] as const

export type GuestTableRow = {
  guestId: string
  name: string
  email: string
  guests: number
  rsvpStatus: typeof rsvpOptions[number]
  invitationSent: boolean
  groupId?: string | null
  groupName?: string | null
  groupSize?: number | null
}

export const addGuestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
})

export type AddGuestSchema = z.output<typeof addGuestSchema>

export interface UseEventGuestsManagerOptions {
  eventId: Ref<string>
  eventRecord: Ref<EventRecord | null>
  isEventCancelled?: Ref<boolean | undefined>
  rsvpSummary?: Ref<RsvpSummary | null | undefined>
  guestList?: Ref<GuestRecord[]>
  isLoadingGuests?: Ref<boolean>
  autoLoadGuests?: boolean
  onGuestListMutated?: () => void | Promise<void>
}

export function useEventGuestsManager(options: UseEventGuestsManagerOptions) {
  const toast = useToast()
  const { isUiOnlyMode } = useApiMode()
  const { createGuest, fetchGuestsByEvent, sendGuestInvite, sendAllGuestInvites, deleteGuest } =
    useGuests()

  const guestList = options.guestList ?? ref<GuestRecord[]>([])
  const isLoadingGuests = options.isLoadingGuests ?? ref(false)
  const autoLoadGuests = options.autoLoadGuests ?? !options.guestList
  const isAddGuestModalOpen = ref(false)
  const isSubmittingGuest = ref(false)
  const sendingGuestId = ref<string | null>(null)
  const isInvitingAll = ref(false)
  const deletingGuestId = ref<string | null>(null)
  const isRemoveGuestModalOpen = ref(false)
  const guestToRemove = ref<GuestTableRow | null>(null)
  const isNoQuestionsWarningOpen = ref(false)
  const pendingInviteAction = ref<'all' | string | null>(null)

  const addGuestState = reactive<AddGuestSchema>({
    name: '',
    email: '',
  })

  const useDemoData = computed(
    () => !options.eventId.value || isUiOnlyMode.value
  )

  const mutationsDisabled = computed(() => Boolean(options.isEventCancelled?.value))

  const hasNoRsvpQuestions = computed(
    () => !(options.eventRecord.value?.questions?.length)
  )

  const tableRows = computed(() => guestList.value.map(mapGuestToPerson))

  const guestListSize = computed(() => tableRows.value.length)

  const isGuestListEmpty = computed(
    () => !isLoadingGuests.value && guestListSize.value === 0
  )

  const invitationsSentCount = computed(() => {
    if (!useDemoData.value && options.rsvpSummary?.value) {
      return options.rsvpSummary.value.totalSent
    }
    return guestList.value.filter((guest) => Boolean(guest.rsvp?.invitedAt)).length
  })

  const uninvitedGuestsCount = computed(() =>
    guestList.value.filter((guest) => !guest.rsvp?.invitedAt).length
  )

  const canInviteAll = computed(
    () =>
      uninvitedGuestsCount.value > 0
      && !mutationsDisabled.value
      && Boolean(options.eventId.value || isUiOnlyMode.value)
      && guestListSize.value > 0
  )

  const rsvpStats = computed(() => {
    if (options.rsvpSummary?.value) {
      return {
        responses:
          options.rsvpSummary.value.going + options.rsvpSummary.value.notGoing,
        attendees: options.rsvpSummary.value.going,
      }
    }
    return {
      responses: guestList.value.filter(
        (guest) => guest.rsvp?.status === 'GOING' || guest.rsvp?.status === 'NOT_GOING'
      ).length,
      attendees: guestList.value.filter((guest) => guest.rsvp?.status === 'GOING').length,
    }
  })

  function mapRsvpStatusToLabel(
    status?: string | null
  ): 'Attending' | 'Pending' | 'Not Attending' {
    if (status === 'GOING') {
      return 'Attending'
    }
    if (status === 'NOT_GOING') {
      return 'Not Attending'
    }
    return 'Pending'
  }

  function mapGuestToPerson(guest: GuestRecord): GuestTableRow {
    return {
      guestId: guest._id,
      name: guest.name,
      email: guest.email,
      guests: guest.rsvp?.status === 'GOING' ? 1 : 0,
      rsvpStatus: mapRsvpStatusToLabel(guest.rsvp?.status),
      invitationSent: Boolean(guest.rsvp?.invitedAt),
    }
  }

  async function loadGuests() {
    if (!options.eventId.value && !isUiOnlyMode.value) {
      guestList.value = []
      return
    }

    if (isUiOnlyMode.value) {
      guestList.value = []
      return
    }

    isLoadingGuests.value = true
    try {
      guestList.value = await fetchGuestsByEvent(options.eventId.value)
    } catch (error) {
      reportApiError(toast, { title: 'Could not load guests', error })
    } finally {
      isLoadingGuests.value = false
    }
  }

  if (autoLoadGuests) {
    watch(
      () => options.eventId.value,
      () => {
        loadGuests()
      },
      { immediate: true }
    )
  }

  function resetAddGuestForm() {
    addGuestState.name = ''
    addGuestState.email = ''
  }

  async function handleAddGuest(payload: FormSubmitEvent<AddGuestSchema>) {
    if (!options.eventId.value && !isUiOnlyMode.value) {
      toast.add({
        title: 'Missing event',
        description: 'Open an event from your dashboard first.',
        color: 'error',
      })
      return
    }

    if (mutationsDisabled.value) {
      toast.add({
        title: 'Event cancelled',
        description: 'Cannot modify the guest list for a cancelled event.',
        color: 'error',
      })
      return
    }

    isSubmittingGuest.value = true
    try {
      const targetEventId = options.eventId.value || 'mock-event-id'
      const response = await createGuest(targetEventId, {
        name: payload.data.name,
        email: payload.data.email,
      })

      guestList.value = appendGuestToList(guestList.value, response.guest)

      toast.add({
        title: 'Guest added',
        description: response.message,
      })
      isAddGuestModalOpen.value = false
      resetAddGuestForm()
    } catch (error) {
      const validationMessage = formatGuestValidationErrors(error)
      if (validationMessage) {
        toast.add({
          title: 'Validation failed',
          description: validationMessage,
          color: 'error',
        })
        return
      }
      reportApiError(toast, {
        title: 'Could not add guest',
        error,
        fallback: getApiErrorMessage(error),
      })
    } finally {
      isSubmittingGuest.value = false
    }
  }

  function openRemoveGuestModal(person: GuestTableRow) {
    guestToRemove.value = person
    isRemoveGuestModalOpen.value = true
  }

  function closeRemoveGuestModal() {
    isRemoveGuestModalOpen.value = false
    guestToRemove.value = null
  }

  async function handleRemoveGuest() {
    const person = guestToRemove.value
    if (!person?.guestId || deletingGuestId.value) {
      return
    }

    if (mutationsDisabled.value) {
      toast.add({
        title: 'Event cancelled',
        description: 'Cannot modify the guest list for a cancelled event.',
        color: 'error',
      })
      return
    }

    deletingGuestId.value = person.guestId
    try {
      const response = await deleteGuest(person.guestId)

      const updated = removeGuestFromList(
        guestList.value,
        options.rsvpSummary?.value ?? null,
        person.guestId
      )
      guestList.value = updated.guestList
      if (options.rsvpSummary) {
        options.rsvpSummary.value = updated.rsvpSummary
      }

      toast.add({
        title: 'Guest removed',
        description: response.message,
      })
      closeRemoveGuestModal()
      await options.onGuestListMutated?.()
    } catch (error) {
      reportApiError(toast, { title: 'Could not remove guest', error })
    } finally {
      deletingGuestId.value = null
    }
  }

  async function doInviteAll() {
    isInvitingAll.value = true
    try {
      const targetEventId = options.eventId.value || 'mock-event-id'
      const response = await sendAllGuestInvites(targetEventId)

      const updated = applySendAllInvitesToGuestList(
        guestList.value,
        options.rsvpSummary?.value ?? null,
        response
      )
      guestList.value = updated.guestList
      if (options.rsvpSummary) {
        options.rsvpSummary.value = updated.rsvpSummary
      }

      const skipped = response.skippedAlreadyInvited ?? 0
      let description = response.message
      if (response.created > 0 || skipped > 0) {
        description = `${response.created} invitation(s) sent`
        if (skipped > 0) {
          description += `, ${skipped} already invited`
        }
        description += '.'
      }

      toast.add({ title: 'Invitations sent', description })
    } catch (error) {
      reportApiError(toast, { title: 'Could not send invitations', error })
    } finally {
      isInvitingAll.value = false
    }
  }

  async function doSendGuestInvite(guestId: string) {
    sendingGuestId.value = guestId
    try {
      const response = await sendGuestInvite(guestId)

      const updated = applySendInviteToGuestList(
        guestList.value,
        options.rsvpSummary?.value ?? null,
        guestId,
        response
      )
      guestList.value = updated.guestList
      if (options.rsvpSummary) {
        options.rsvpSummary.value = updated.rsvpSummary
      }

      toast.add({ title: 'Invitation sent', description: response.message })
    } catch (error) {
      reportApiError(toast, { title: 'Could not send invitation', error })
    } finally {
      sendingGuestId.value = null
    }
  }

  async function handleInviteAll() {
    if (isInvitingAll.value || !canInviteAll.value) {
      return
    }

    if (!options.eventId.value && !isUiOnlyMode.value) {
      toast.add({
        title: 'Missing event',
        description: 'Open an event from your dashboard first.',
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

    if (hasNoRsvpQuestions.value) {
      pendingInviteAction.value = 'all'
      isNoQuestionsWarningOpen.value = true
      return
    }

    await doInviteAll()
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

    if (hasNoRsvpQuestions.value) {
      pendingInviteAction.value = guestId
      isNoQuestionsWarningOpen.value = true
      return
    }

    await doSendGuestInvite(guestId)
  }

  async function confirmInviteWithoutQuestions() {
    isNoQuestionsWarningOpen.value = false
    const action = pendingInviteAction.value
    pendingInviteAction.value = null
    if (!action) {
      return
    }
    if (action === 'all') {
      await doInviteAll()
    } else {
      await doSendGuestInvite(action)
    }
  }

  return {
    isUiOnlyMode,
    isLoadingGuests,
    isAddGuestModalOpen,
    isSubmittingGuest,
    sendingGuestId,
    isInvitingAll,
    deletingGuestId,
    isRemoveGuestModalOpen,
    guestToRemove,
    isNoQuestionsWarningOpen,
    addGuestState,
    mutationsDisabled,
    tableRows,
    guestListSize,
    isGuestListEmpty,
    invitationsSentCount,
    canInviteAll,
    rsvpStats,
    loadGuests,
    resetAddGuestForm,
    handleAddGuest,
    openRemoveGuestModal,
    closeRemoveGuestModal,
    handleRemoveGuest,
    handleInviteAll,
    handleSendGuestInvite,
    confirmInviteWithoutQuestions,
  }
}
