import { reportApiError } from '~/types/auth'
import { useApiRole } from '~/composables/useApiRole'
import { useEvents } from '~/composables/useEvents'
import {
  type EventFeature,
  isEventFeatureAllowed,
  resolveEventDashboardPath,
} from '~/utils/eventTierFeatures'

export function useEventFeatureGate() {
  const toast = useToast()
  const route = useRoute()
  const { fetchEvent, getCachedEvent } = useEvents()
  const { isUiOnlyMode } = useApiMode()
  const { isPartnerRole, withRoleQuery } = useApiRole()

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
      navigateTo('/')
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
          description: 'Upgrade your event plan to unlock this feature.',
          color: 'error',
        })
        await navigateTo({ path: '/event/upgrade', query: withRoleQuery({ eventId: id }) })
        return false
      }
      return true
    } catch (error) {
      reportApiError(toast, { title: 'Could not verify event access', error })
      const cached = getCachedEvent(id)
      await navigateTo({
        path: isPartnerRole.value ? `/partners/events/${id}` : resolveEventDashboardPath(cached),
        query: isPartnerRole.value ? undefined : withRoleQuery({ eventId: id })
      })
      return false
    }
  }

  return {
    requireEventFeature,
  }
}
