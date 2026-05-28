import type { EventQuestion } from '~/types/event'

export function useEventQuestions() {
  const { apiRequest, executeAction } = useApiMode()

  async function updateEventQuestions(eventId: string, questions: EventQuestion[]) {
    return executeAction({
      api: () =>
        apiRequest<{ success: boolean; message: string }>(
          `/user/events/${eventId}/questions`,
          { method: 'PATCH', body: { questions } }
        ),
      uiOnly: () => undefined,
    })
  }

  return { updateEventQuestions }
}
