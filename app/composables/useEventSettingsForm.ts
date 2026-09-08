import type { EventRecord, EventTypeLabel } from '~/types/event'
import { mapApiToEventTypeLabel, mapEventTypeToApi, isWeddingEventType } from '~/types/event'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'

export interface UseEventSettingsFormOptions {
  eventId: Ref<string>
  eventRecord: Ref<EventRecord | null>
}

export function useEventSettingsForm(options: UseEventSettingsFormOptions) {
  const toast = useToast()
  const { isUiOnlyMode } = useApiMode()
  const { updateEvent } = useEvents()
  const { setActiveEvent } = useActiveEvent()

  const isSubmitting = ref(false)

  const form = reactive<{
    eventName: string
    eventType: EventTypeLabel
    description: string
    venue: string
    isCatholicWedding: boolean
  }>({
    eventName: '',
    eventType: 'Wedding',
    description: '',
    venue: '',
    isCatholicWedding: false,
  })

  const isWeddingEvent = computed(() => isWeddingEventType(form.eventType))

  const isEventCancelled = computed(
    () => options.eventRecord.value?.status === 'CANCELLED'
  )

  function resetFormFromEvent() {
    const record = options.eventRecord.value
    if (!record) {
      return
    }

    form.eventName = record.eventName
    form.eventType = mapApiToEventTypeLabel(record.eventType) as EventTypeLabel
    form.description = record.description
    form.venue = record.venue
    form.isCatholicWedding = Boolean(record.isCatholicWedding)
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

      if (!isUiOnlyMode.value) {
        await updateEvent(targetEventId, {
          eventType: nextEventType,
          eventName: form.eventName.trim(),
          description: form.description.trim(),
          venue: form.venue.trim(),
          isCatholicWedding: nextCatholic,
        })
      }

      const updated: EventRecord = {
        ...options.eventRecord.value,
        eventType: nextEventType,
        eventName: form.eventName.trim(),
        description: form.description.trim(),
        venue: form.venue.trim(),
        isCatholicWedding: nextCatholic,
      }
      options.eventRecord.value = updated
      setActiveEvent(updated)

      toast.add({
        title: 'Event updated',
        description: 'Your event details have been saved.',
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
    resetFormFromEvent,
    submit,
  }
}
