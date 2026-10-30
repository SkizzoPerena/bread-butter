import type { EventRecord } from '~/types/event'
import { mapEventTypeToApi, isWeddingEventType } from '~/types/event'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { useTasks, shiftMockTaskDeadlines } from '~/composables/useTasks'
import { shiftAllEventTaskDeadlines, shiftTaskDeadlineOverrides } from '~/utils/taskDeadlineStorage'
import { toDateInputValue } from '~/utils/invitationForm'

export interface UseEventSettingsFormOptions {
  eventId: Ref<string>
  eventRecord: Ref<EventRecord | null>
}

export function useEventSettingsForm(options: UseEventSettingsFormOptions) {
  const toast = useToast()
  const { isUiOnlyMode } = useApiMode()
  const { updateEvent } = useEvents()
  const { fetchTasksByEvent } = useTasks()
  const { setActiveEvent } = useActiveEvent()

  const isSubmitting = ref(false)
  const isDateEditEnabled = ref(false)
  const isDateWarningModalOpen = ref(false)

  const form = reactive<{
    eventName: string
    eventType: string
    eventDate: string
    description: string
    venue: string
    isCatholicWedding: boolean
  }>({
    eventName: '',
    eventType: 'WEDDING',
    eventDate: '',
    description: '',
    venue: '',
    isCatholicWedding: false,
  })

  const isWeddingEvent = computed(() => isWeddingEventType(form.eventType))

  const isEventCancelled = computed(
    () => options.eventRecord.value?.status === 'CANCELLED'
  )

  const dateShiftDays = computed(() => {
    const original = options.eventRecord.value?.eventDate
    if (!original || !form.eventDate) return 0
    const originalDate = new Date(original)
    const newDateObj = new Date(`${form.eventDate}T00:00:00`)
    if (Number.isNaN(originalDate.getTime()) || Number.isNaN(newDateObj.getTime())) return 0
    const originalUtc = Date.UTC(originalDate.getUTCFullYear(), originalDate.getUTCMonth(), originalDate.getUTCDate())
    const newUtc = Date.UTC(newDateObj.getFullYear(), newDateObj.getMonth(), newDateObj.getDate())
    const diffMs = newUtc - originalUtc
    return Math.round(diffMs / (1000 * 60 * 60 * 24))
  })

  function resetFormFromEvent() {
    const record = options.eventRecord.value
    if (!record) {
      return
    }

    form.eventName = record.eventName
    form.eventType = mapEventTypeToApi(record.eventType)
    form.eventDate = record.eventDate ? toDateInputValue(record.eventDate) : ''
    form.description = record.description
    form.venue = record.venue
    form.isCatholicWedding = Boolean(record.isCatholicWedding)
    isDateEditEnabled.value = false
    isDateWarningModalOpen.value = false
  }

  function promptEnableDateEdit() {
    if (isDateEditEnabled.value) {
      return
    }
    isDateWarningModalOpen.value = true
  }

  function confirmEnableDateEdit() {
    isDateWarningModalOpen.value = false
    isDateEditEnabled.value = true
  }

  function cancelEnableDateEdit() {
    isDateWarningModalOpen.value = false
    const record = options.eventRecord.value
    if (record?.eventDate) {
      form.eventDate = toDateInputValue(record.eventDate)
    }
    isDateEditEnabled.value = false
  }

  watch(
    () => form.eventType,
    (nextType) => {
      if (!isWeddingEventType(nextType)) {
        form.isCatholicWedding = false
      }
    }
  )

  watch(
    () => options.eventRecord.value,
    () => {
      resetFormFromEvent()
    },
    { immediate: true }
  )

  async function submit() {
    if (!options.eventRecord.value) {
      return
    }

    if (!form.eventName.trim()) {
      toast.add({ title: 'Missing event name', color: 'error' })
      return
    }
    if (!form.eventDate) {
      toast.add({ title: 'Missing event date', color: 'error' })
      return
    }
    if (!form.venue.trim()) {
      toast.add({ title: 'Missing venue', color: 'error' })
      return
    }
    if (!form.description.trim()) {
      toast.add({ title: 'Missing description', color: 'error' })
      return
    }

    isSubmitting.value = true
    try {
      const targetEventId = options.eventId.value || 'mock-event-id'
      const nextEventType = mapEventTypeToApi(form.eventType)
      const nextCatholic = isWeddingEvent.value ? form.isCatholicWedding : false

      const originalIso = options.eventRecord.value?.eventDate
      const nextDateIso = form.eventDate.includes('T')
        ? form.eventDate
        : new Date(`${form.eventDate}T00:00:00.000Z`).toISOString()

      // Calculate time difference for moving tasks
      let diffMs = 0
      if (originalIso && nextDateIso) {
        const originalTime = new Date(originalIso).getTime()
        const newTime = new Date(nextDateIso).getTime()
        if (!Number.isNaN(originalTime) && !Number.isNaN(newTime)) {
          diffMs = newTime - originalTime
        }
      }

      if (diffMs !== 0) {
        try {
          const tasks = await fetchTasksByEvent(targetEventId)
          shiftAllEventTaskDeadlines(targetEventId, diffMs, tasks)
        } catch {
          shiftTaskDeadlineOverrides(targetEventId, diffMs)
        }
        shiftMockTaskDeadlines(diffMs)
      }

      if (!isUiOnlyMode.value) {
        await updateEvent(targetEventId, {
          eventType: nextEventType,
          eventName: form.eventName.trim(),
          eventDate: nextDateIso,
          description: form.description.trim(),
          venue: form.venue.trim(),
          isCatholicWedding: nextCatholic,
        })
      }

      const updated: EventRecord = {
        ...options.eventRecord.value,
        eventType: nextEventType,
        eventName: form.eventName.trim(),
        eventDate: nextDateIso,
        description: form.description.trim(),
        venue: form.venue.trim(),
        isCatholicWedding: nextCatholic,
      }
      options.eventRecord.value = updated
      setActiveEvent(updated)
      isDateEditEnabled.value = false

      toast.add({
        title: 'Event updated',
        description: diffMs !== 0
          ? 'Your event details and task schedules have been updated.'
          : 'Your event details have been saved.',
      })
      resetFormFromEvent()
    } catch (error) {
      reportApiError(toast, { title: 'Could not update event', error })
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    form,
    isSubmitting,
    isEventCancelled,
    isWeddingEvent,
    isDateEditEnabled,
    isDateWarningModalOpen,
    dateShiftDays,
    promptEnableDateEdit,
    confirmEnableDateEdit,
    cancelEnableDateEdit,
    resetFormFromEvent,
    submit,
  }
}
