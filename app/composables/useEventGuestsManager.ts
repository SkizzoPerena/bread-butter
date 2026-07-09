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
import { formatTableLabel } from '~/utils/tableCode'
import { formatGuestDisplayName } from '~/utils/guestName'

const rsvpOptions = ['Attending', 'Pending', 'Not Attending'] as const

export type GuestTableRow = {
  guestId: string
  firstName: string
  lastName: string
  displayName: string
  mailingAddress: string
  contactNumber: string
  envelopeName: string
  email: string
  guests: number
  rsvpStatus: typeof rsvpOptions[number]
  invitationSent: boolean
  rsvpId?: string | null
  groupId?: string | null
  groupName?: string | null
  groupSize?: number | null
  roleNames?: string[]
  tableCode?: string | null
  tableLabel?: string | null
}

export const addGuestSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  mailingAddress: z.string().optional(),
  contactNumber: z.string().optional(),
  envelopeName: z.string().optional(),
})

export const editGuestSchema = addGuestSchema

export type AddGuestSchema = z.output<typeof addGuestSchema>
export type EditGuestSchema = z.output<typeof editGuestSchema>

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
  const { createGuest, updateGuest, fetchGuestsByEvent, sendGuestInvite, sendAllGuestInvites, deleteGuest } =
    useGuests()

  const guestList = options.guestList ?? ref<GuestRecord[]>([])
  const isLoadingGuests = options.isLoadingGuests ?? ref(false)
  const autoLoadGuests = options.autoLoadGuests ?? !options.guestList
  const isAddGuestModalOpen = ref(false)
  const isEditGuestModalOpen = ref(false)
  const isSubmittingGuest = ref(false)
  const isUpdatingGuest = ref(false)
  const editingGuestId = ref<string | null>(null)
  const sendingGuestId = ref<string | null>(null)
  const isInvitingAll = ref(false)
  const deletingGuestId = ref<string | null>(null)
  const isRemoveGuestModalOpen = ref(false)
  const guestToRemove = ref<GuestTableRow | null>(null)
  const isNoQuestionsWarningOpen = ref(false)
  const pendingInviteAction = ref<'all' | string | null>(null)

  const addGuestState = reactive<AddGuestSchema>({
    firstName: '',
    lastName: '',
    email: '',
    mailingAddress: '',
    contactNumber: '',
    envelopeName: '',
  })

  const editGuestState = reactive<EditGuestSchema>({
    firstName: '',
    lastName: '',
    email: '',
    mailingAddress: '',
    contactNumber: '',
    envelopeName: '',
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

  const canInviteAll = computed(
    () =>
      uninvitedGuestsCount.value > 0
      && !mutationsDisabled.value
      && Boolean(options.eventId.value || isUiOnlyMode.value)
      && guestListSize.value > 0
      && hasEmailCredits.value
      && (remainingEmails.value == null || remainingEmails.value >= uninvitedGuestsCount.value)
  )

  function canSendGuestInvite(person: GuestTableRow): boolean {
    if (person.invitationSent || mutationsDisabled.value) {
      return false
    }
    if (remainingEmails.value == null) {
      return true
    }
    return remainingEmails.value > 0
  }

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
    const roleNames = (guest.roles ?? []).map((role) => role.name)
    return {
      guestId: guest._id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      displayName: formatGuestDisplayName(guest.firstName, guest.lastName),
      mailingAddress: guest.mailingAddress ?? '',
      contactNumber: guest.contactNumber ?? '',
      envelopeName: guest.envelopeName ?? '',
      email: guest.email,
      guests: guest.rsvp?.status === 'GOING' ? 1 : 0,
      rsvpStatus: mapRsvpStatusToLabel(guest.rsvp?.status),
      invitationSent: Boolean(guest.rsvp?.invitedAt),
      roleNames,
      tableCode: guest.tableCode ?? null,
      tableLabel: formatTableLabel(guest.tableCode),
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
    addGuestState.firstName = ''
    addGuestState.lastName = ''
    addGuestState.email = ''
    addGuestState.mailingAddress = ''
    addGuestState.contactNumber = ''
    addGuestState.envelopeName = ''
  }

  function resetEditGuestForm() {
    editGuestState.firstName = ''
    editGuestState.lastName = ''
    editGuestState.email = ''
    editGuestState.mailingAddress = ''
    editGuestState.contactNumber = ''
    editGuestState.envelopeName = ''
    editingGuestId.value = null
  }

  function openEditGuestModal(person: GuestTableRow) {
    editingGuestId.value = person.guestId
    editGuestState.firstName = person.firstName
    editGuestState.lastName = person.lastName
    editGuestState.email = person.email
    editGuestState.mailingAddress = person.mailingAddress
    editGuestState.contactNumber = person.contactNumber
    editGuestState.envelopeName = person.envelopeName
    isEditGuestModalOpen.value = true
  }

  function closeEditGuestModal() {
    isEditGuestModalOpen.value = false
    resetEditGuestForm()
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
        firstName: payload.data.firstName,
        lastName: payload.data.lastName,
        email: payload.data.email,
        mailingAddress: payload.data.mailingAddress,
        contactNumber: payload.data.contactNumber,
        envelopeName: payload.data.envelopeName,
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

  async function handleEditGuest(payload: FormSubmitEvent<EditGuestSchema>) {
    const guestId = editingGuestId.value
    if (!guestId) {
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

    isUpdatingGuest.value = true
    try {
      const response = await updateGuest(guestId, {
        firstName: payload.data.firstName,
        lastName: payload.data.lastName,
        email: payload.data.email,
        mailingAddress: payload.data.mailingAddress,
        contactNumber: payload.data.contactNumber,
        envelopeName: payload.data.envelopeName,
      })

      guestList.value = guestList.value.map((guest) =>
        guest._id === guestId ? response.guest : guest
      )

      toast.add({
        title: 'Guest updated',
        description: response.message,
      })
      closeEditGuestModal()
      await options.onGuestListMutated?.()
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
        title: 'Could not update guest',
        error,
        fallback: getApiErrorMessage(error),
      })
    } finally {
      isUpdatingGuest.value = false
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
      if (
        options.eventRecord.value &&
        typeof response.remainingEmails === 'number'
      ) {
        options.eventRecord.value = {
          ...options.eventRecord.value,
          remainingEmails: response.remainingEmails,
        }
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
      if (
        options.eventRecord.value &&
        typeof response.remainingEmails === 'number'
      ) {
        options.eventRecord.value = {
          ...options.eventRecord.value,
          remainingEmails: response.remainingEmails,
        }
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
    isEditGuestModalOpen,
    isSubmittingGuest,
    isUpdatingGuest,
    editingGuestId,
    sendingGuestId,
    isInvitingAll,
    deletingGuestId,
    isRemoveGuestModalOpen,
    guestToRemove,
    isNoQuestionsWarningOpen,
    addGuestState,
    editGuestState,
    editGuestSchema,
    mutationsDisabled,
    tableRows,
    guestListSize,
    isGuestListEmpty,
    invitationsSentCount,
    canInviteAll,
    canSendGuestInvite,
    remainingEmails,
    hasEmailCredits,
    rsvpStats,
    loadGuests,
    resetAddGuestForm,
    resetEditGuestForm,
    handleAddGuest,
    openEditGuestModal,
    closeEditGuestModal,
    handleEditGuest,
    openRemoveGuestModal,
    closeRemoveGuestModal,
    handleRemoveGuest,
    handleInviteAll,
    handleSendGuestInvite,
    confirmInviteWithoutQuestions,
  }
}
