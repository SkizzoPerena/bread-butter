import type { EventRecord } from '~/types/event'
import type { SelectedEventDetail } from '~/types/event'

export function clearUserSessionData() {
  const userEventsCache = useState<EventRecord[]>('bpb-user-events-list-cache', () => [])
  const eventCache = useState<Record<string, SelectedEventDetail>>('bpb-events-detail-cache', () => ({}))
  const { setActiveEvent } = useActiveEvent()

  userEventsCache.value = []
  eventCache.value = {}
  setActiveEvent(null)
}
