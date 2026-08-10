import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import {
  type EventFeature,
  isEventFeatureAllowed,
} from '~/utils/eventTierFeatures'

export function useEventFeatureGate() {
  const toast = useToast()
  const route = useRoute()
  const { fetchEvent } = useEvents()
  const { isUiOnlyMode } = useApiMode()

  const eventId = computed(() => {
    const value = route.query.eventId
    return typeof value === 'string' ? value : ''
  })

  async function requireEventFeature(feature: EventFeature): Promise<boolean> {
    const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
    if (!id) {
      toast.add({
        title: 'Missing event',
        description: 'Open an event from your dashboard first.',
        color: 'error',
      })
      navigateTo('/user/dashboard')
      return false
    }

    if (isUiOnlyMode.value) {
      return true
    }

    try {
      const detail = await fetchEvent(id)
      if (!isEventFeatureAllowed(detail.event, feature)) {
        toast.add({
          title: 'Feature not available',
          description: 'This feature is not included in your event plan.',
          color: 'error',
        })
        await navigateTo({ path: '/user/event-dashboard', query: { eventId: id } })
        return false
      }
      return true
    } catch (error) {
      reportApiError(toast, { title: 'Could not verify event access', error })
      await navigateTo({ path: '/user/event-dashboard', query: { eventId: id } })
      return false
    }
  }

  return {
    requireEventFeature,
  }
}
