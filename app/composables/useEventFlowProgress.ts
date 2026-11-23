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
    description: 'Save and publish your custom event website.',
  },
  {
    stepNumber: 2,
    action: 'invitation',
    label: 'Invitation',
    route: '/invitation-maker',
    description: 'Save and publish your personalized digital invitation.',
  },
  {
    stepNumber: 3,
    action: 'rsvp',
    label: 'RSVP',
    route: '/event/rsvp',
    description: 'Configure and save your RSVP questions.',
  },
  {
    stepNumber: 4,
    action: 'guestList',
    label: 'Guest List',
    route: '/event/guests',
    description: 'Insert at least one guest into your guest list.',
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
      // 1. Check Website completion:
      // "to clear the website alert, the user should save and publish a website."
      let isWebsiteDone = false
      if (overrides?.customSites) {
        isWebsiteDone = overrides.customSites.some((s) => Boolean(s.isPublished))
      } else {
        try {
          const sites = await fetchCustomSitesByEvent(activeId)
          if (sites && sites.length > 0) {
            isWebsiteDone = sites.some((s) => Boolean(s.isPublished))
          }
        } catch {
          // Check fallback in uiMockSitesStore
          const mockSites = Object.values(uiMockSitesStore.value).filter((s) => s.event === activeId)
          isWebsiteDone = mockSites.some((s) => Boolean(s.isPublished))
        }
      }
      if (isWebsiteDone) {
        markStepCompletedLocally(activeId, 'website', true)
      } else if (isLocalStepMarkedCompleted(activeId, 'website')) {
        isWebsiteDone = true
      }

      // 2. Check Invitation completion:
      // "to clear the invitation alert, the user should save and publish their own invitation, not the pre-filled template."
      let isInvitationDone = false
      const isCustomizedInvitation = (inv?: InvitationRecord | null) => {
        if (!inv || !inv._id) return false
        const label = inv.eventLabel?.trim().toLowerCase()
        if (!label || label === 'alex & jordan are getting married!') {
          return false
        }
        return true
      }

      if (overrides?.invitation !== undefined) {
        isInvitationDone = isCustomizedInvitation(overrides.invitation)
      } else {
        try {
          const inv = await fetchInvitationByEvent(activeId)
          isInvitationDone = isCustomizedInvitation(inv)
        } catch {
          isInvitationDone = false
        }
      }
      if (isInvitationDone) {
        markStepCompletedLocally(activeId, 'invitation', true)
      } else if (isLocalStepMarkedCompleted(activeId, 'invitation')) {
        isInvitationDone = true
      }

      // 3. Check RSVP completion:
      // "to clear the rsvp alert, the user should have saved questions at least once"
      let isRsvpDone = isLocalStepMarkedCompleted(activeId, 'rsvp')
      if (!isRsvpDone) {
        const hasSavedQuestions = Boolean(
          overrides?.eventRecord?.questions && overrides.eventRecord.questions.length > 0
        )
        isRsvpDone = hasSavedQuestions
        if (isRsvpDone) {
          markStepCompletedLocally(activeId, 'rsvp', true)
        }
      }

      // 4. Check Guest List completion:
      // "to clear the guest list alert, the user should have inserted at least a single guest"
      let isGuestListDone = false
      if (overrides?.guestList !== undefined && overrides.guestList !== null) {
        isGuestListDone = overrides.guestList.length > 0
      } else if (overrides?.guestStats?.total !== undefined && overrides.guestStats.total !== null) {
        isGuestListDone = overrides.guestStats.total > 0
      } else {
        isGuestListDone = isLocalStepMarkedCompleted(activeId, 'guestList')
      }
      if (isGuestListDone) {
        markStepCompletedLocally(activeId, 'guestList', true)
      } else {
        markStepCompletedLocally(activeId, 'guestList', false)
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
