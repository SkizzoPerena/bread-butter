import type { EventRecord, GuestRecord, GuestStats, RsvpSummary } from '~/types/event'
import type { CustomSiteRecord } from '~/types/customSite'
import type { InvitationRecord } from '~/types/invitation'
import { useCustomSite, uiMockSitesStore } from '~/composables/useCustomSite'
import { useInvitation } from '~/composables/useInvitation'

export type EventFlowStepAction = 'website' | 'invitation' | 'rsvp' | 'guestList'

export interface EventFlowStep {
  stepNumber: number
  action: EventFlowStepAction
  label: string
  route: string
  description: string
}

export const EVENT_FLOW_STEPS: EventFlowStep[] = [
  {
    stepNumber: 1,
    action: 'website',
    label: 'Website',
    route: '/website-maker',
    description: 'Design and publish your personalized event website.',
  },
  {
    stepNumber: 2,
    action: 'invitation',
    label: 'Invitation',
    route: '/invitation-maker',
    description: 'Create and save your digital event invitation.',
  },
  {
    stepNumber: 3,
    action: 'rsvp',
    label: 'RSVP',
    route: '/event/rsvp',
    description: 'Configure RSVP questions and attendance tracking.',
  },
  {
    stepNumber: 4,
    action: 'guestList',
    label: 'Guest List',
    route: '/event/guests',
    description: 'Add your guests and manage attendee details.',
  },
]

export interface FlowDataOverrides {
  eventRecord?: EventRecord | null
  guestList?: GuestRecord[] | null
  guestStats?: GuestStats | null
  rsvpSummary?: RsvpSummary | null
  customSites?: CustomSiteRecord[] | null
  invitation?: InvitationRecord | null
}

function getFlowStorageKey(eventId: string, action: EventFlowStepAction): string {
  return `bb_flow_${eventId || 'mock'}_${action}`
}

export function isLocalStepMarkedCompleted(eventId: string, action: EventFlowStepAction): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(getFlowStorageKey(eventId, action)) === 'true'
  } catch {
    return false
  }
}

export function markStepCompletedLocally(eventId: string, action: EventFlowStepAction, completed = true): void {
  if (typeof window === 'undefined') return
  try {
    if (completed) {
      localStorage.setItem(getFlowStorageKey(eventId, action), 'true')
    } else {
      localStorage.removeItem(getFlowStorageKey(eventId, action))
    }
  } catch (err) {
    console.warn('[useEventFlowProgress] Failed to update local step progress', err)
  }
}

export function useEventFlowProgress() {
  const { fetchCustomSitesByEvent } = useCustomSite()
  const { fetchInvitationByEvent } = useInvitation()

  const stepStatus = ref<Record<EventFlowStepAction, boolean>>({
    website: false,
    invitation: false,
    rsvp: false,
    guestList: false,
  })

  const isLoadingFlow = ref(false)

  // Current step is the lowest-number step that is NOT yet completed
  const currentFlowStep = computed<EventFlowStep | null>(() => {
    for (const step of EVENT_FLOW_STEPS) {
      if (!stepStatus.value[step.action]) {
        return step
      }
    }
    return null
  })

  const currentFlowStepAction = computed<EventFlowStepAction | null>(() => {
    return currentFlowStep.value?.action ?? null
  })

  async function loadFlowStatus(eventId: string, overrides?: FlowDataOverrides): Promise<void> {
    const activeId = eventId || 'mock-event-id'
    isLoadingFlow.value = true

    try {
      // 1. Check Website completion
      let isWebsiteDone = isLocalStepMarkedCompleted(activeId, 'website')
      if (!isWebsiteDone) {
        if (overrides?.customSites) {
          isWebsiteDone = overrides.customSites.some((s) => Boolean(s.isPublished))
        } else {
          try {
            const sites = await fetchCustomSitesByEvent(activeId)
            isWebsiteDone = sites.some((s) => Boolean(s.isPublished))
          } catch {
            // Check fallback in uiMockSitesStore
            const mockSites = Object.values(uiMockSitesStore.value).filter((s) => s.event === activeId)
            isWebsiteDone = mockSites.some((s) => Boolean(s.isPublished))
          }
        }
      }

      // 2. Check Invitation completion
      let isInvitationDone = isLocalStepMarkedCompleted(activeId, 'invitation')
      if (!isInvitationDone) {
        if (overrides?.invitation !== undefined) {
          const inv = overrides.invitation
          isInvitationDone = Boolean(inv && (inv._id || inv.cardImageUrl || inv.requestLine || inv.eventVenue))
        } else {
          try {
            const inv = await fetchInvitationByEvent(activeId)
            isInvitationDone = Boolean(inv && (inv._id || inv.cardImageUrl || inv.requestLine || inv.eventVenue))
          } catch {
            isInvitationDone = false
          }
        }
      }

      // 3. Check RSVP completion
      let isRsvpDone = isLocalStepMarkedCompleted(activeId, 'rsvp')
      if (!isRsvpDone) {
        const hasQuestions = Boolean(overrides?.eventRecord?.questions && overrides.eventRecord.questions.length > 0)
        const summary = overrides?.rsvpSummary
        const hasRsvps = Boolean(
          summary &&
          (Number(summary.totalSent) > 0 ||
            Number(summary.going) > 0 ||
            Number(summary.pending) > 0 ||
            Number(summary.notGoing) > 0)
        )
        isRsvpDone = hasQuestions || hasRsvps
      }

      // 4. Check Guest List completion
      let isGuestListDone = isLocalStepMarkedCompleted(activeId, 'guestList')
      if (!isGuestListDone) {
        const guestCount = overrides?.guestList?.length ?? 0
        const totalGuests = overrides?.guestStats?.total ?? 0
        isGuestListDone = guestCount > 0 || totalGuests > 0
      }

      stepStatus.value = {
        website: isWebsiteDone,
        invitation: isInvitationDone,
        rsvp: isRsvpDone,
        guestList: isGuestListDone,
      }
    } finally {
      isLoadingFlow.value = false
    }
  }

  function setStepComplete(eventId: string, action: EventFlowStepAction, completed = true) {
    stepStatus.value[action] = completed
    markStepCompletedLocally(eventId, action, completed)
  }

  return {
    EVENT_FLOW_STEPS,
    stepStatus,
    isLoadingFlow,
    currentFlowStep,
    currentFlowStepAction,
    loadFlowStatus,
    setStepComplete,
  }
}
