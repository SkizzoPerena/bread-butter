import type { EventRecord } from '~/types/event'

export function useEventPlaylist() {
  const { apiRequest, executeAction } = useApiMode()

  const isSubmitting = ref(false)

  async function updateEventPlaylist(eventId: string, playlist: string) {
    isSubmitting.value = true
    try {
      return await executeAction({
        api: () =>
          apiRequest<{
            success: boolean
            message: string
            event: EventRecord
          }>(`/user/events/${eventId}/playlist`, {
            method: 'PATCH',
            body: { playlist },
          }),
        uiOnly: () => ({
          success: true,
          message: 'Playlist updated successfully.',
          event: { _id: eventId, playlist } as EventRecord,
        }),
      })
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    isSubmitting,
    updateEventPlaylist,
  }
}
