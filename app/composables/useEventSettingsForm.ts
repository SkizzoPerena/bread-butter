import type { EventRecord } from '~/types/event'
import { mapApiToEventTypeLabel, mapEventTypeToApi, EVENT_TYPE_OPTIONS } from '~/types/event'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'

export interface UseEventSettingsFormOptions {
  eventId: Ref<string>
  eventRecord: Ref<EventRecord | null>
}

type EventTypeLabel = (typeof EVENT_TYPE_OPTIONS)[number]

export function useEventSettingsForm(options: UseEventSettingsFormOptions) {
  const toast = useToast()
  const { isUiOnlyMode } = useApiMode()
  const { fetchEvent, updateEvent } = useEvents()
  const { setActiveEvent } = useActiveEvent()

  const isSubmitting = ref(false)

  const form = reactive<{
    eventName: string
    eventType: EventTypeLabel
    description: string
    venue: string
  }>({
    eventName: '',
    eventType: 'Wedding',
    description: '',
    venue: '',
  })

  const coverImageFile = ref<File | null>(null)
  const coverImageInput = ref<HTMLInputElement | null>(null)

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
    coverImageFile.value = null
    if (coverImageInput.value) {
      coverImageInput.value.value = ''
    }
  }

  watch(
    () => options.eventRecord.value,
    () => {
      resetFormFromEvent()
    },
    { immediate: true }
  )

  function onCoverImageChange(changeEvent: Event) {
    const input = changeEvent.target as HTMLInputElement
    coverImageFile.value = input.files?.[0] ?? null
  }

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

    const existingCoverUrl = options.eventRecord.value.coverImageURL?.trim()
    if (!coverImageFile.value && !existingCoverUrl) {
      toast.add({
        title: 'Cover image required',
        description: 'Please upload a cover image for your event.',
        color: 'error',
      })
      return
    }

    isSubmitting.value = true
    try {
      const targetEventId = options.eventId.value || 'mock-event-id'

      if (!isUiOnlyMode.value) {
        await updateEvent(targetEventId, {
          eventType: mapEventTypeToApi(form.eventType),
          eventName: form.eventName.trim(),
          description: form.description.trim(),
          venue: form.venue.trim(),
          coverImage: coverImageFile.value ?? undefined,
          coverImageURL: coverImageFile.value ? undefined : existingCoverUrl,
        })

        if (coverImageFile.value && options.eventId.value) {
          const detail = await fetchEvent(options.eventId.value)
          options.eventRecord.value = detail.event
          setActiveEvent(detail.event)
        } else {
          const updated: EventRecord = {
            ...options.eventRecord.value,
            eventType: mapEventTypeToApi(form.eventType),
            eventName: form.eventName.trim(),
            description: form.description.trim(),
            venue: form.venue.trim(),
          }
          options.eventRecord.value = updated
          setActiveEvent(updated)
        }
      } else {
        const updated: EventRecord = {
          ...options.eventRecord.value,
          eventType: mapEventTypeToApi(form.eventType),
          eventName: form.eventName.trim(),
          description: form.description.trim(),
          venue: form.venue.trim(),
        }
        options.eventRecord.value = updated
        setActiveEvent(updated)
      }

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
    coverImageFile,
    coverImageInput,
    isSubmitting,
    isEventCancelled,
    resetFormFromEvent,
    onCoverImageChange,
    submit,
  }
}
