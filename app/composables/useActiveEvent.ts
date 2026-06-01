/**
 * Shared active event label for event-scoped layouts (e.g. event navbar).
 * Pages set this after loading the event; layouts read it.
 */
export function useActiveEvent() {
  const activeEventId = useState<string | null>('bpb-active-event-id', () => null)
  const activeEventName = useState<string>('bpb-active-event-name', () => '')

  function setActiveEvent(event: { _id?: string; eventName?: string } | null) {
    activeEventId.value = event?._id ?? null
    activeEventName.value = event?.eventName?.trim() ?? ''
  }

  const displayName = computed(() => activeEventName.value)

  return {
    activeEventId,
    activeEventName,
    displayName,
    setActiveEvent,
  }
}
