import type { EventRecord } from '~/types/event'
import type { SelectedEventDetail } from '~/types/event'
import { clearUiPendingPayment, clearUiUnpaidEvent } from '~/utils/paymentPendingGuard'

export function clearUserSessionData() {
  const userEventsCache = useState<EventRecord[]>('bpb-user-events-list-cache', () => [])
  const eventCache = useState<Record<string, SelectedEventDetail>>('bpb-events-detail-cache', () => ({}))
  const { setActiveEvent } = useActiveEvent()

  userEventsCache.value = []
  eventCache.value = {}
  clearUiPendingPayment()
  clearUiUnpaidEvent()
  setActiveEvent(null)
}
