import type { GatheringRecord, SeatingGuestRecord } from '~/types/seating'

export type JamFlowStepAction = 'invite' | 'rsvp' | 'guests'

export interface JamFlowStep {
  stepNumber: number
  action: JamFlowStepAction
  label: string
  description: string
}

export const JAM_FLOW_STEPS: JamFlowStep[] = [
  {
    stepNumber: 1,
    action: 'invite',
    label: 'Invitation',
    description: 'Customize and save your digital invitation.',
  },
  {
    stepNumber: 2,
    action: 'rsvp',
    label: 'RSVP',
    description: 'Configure and save your RSVP questions.',
  },
  {
    stepNumber: 3,
    action: 'guests',
    label: 'Guest List',
    description: 'Insert at least one guest into your guest list.',
  },
]

function getJamFlowStorageKey(gatheringId: string, action: JamFlowStepAction): string {
  return `bb_jam_flow_${gatheringId || 'mock'}_${action}`
}

export function isJamLocalStepMarkedCompleted(gatheringId: string, action: JamFlowStepAction): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(getJamFlowStorageKey(gatheringId, action)) === 'true'
  } catch {
    return false
  }
}

export function markJamStepCompletedLocally(gatheringId: string, action: JamFlowStepAction, completed = true): void {
  if (typeof window === 'undefined') return
  try {
    if (completed) {
      localStorage.setItem(getJamFlowStorageKey(gatheringId, action), 'true')
    } else {
      localStorage.removeItem(getJamFlowStorageKey(gatheringId, action))
    }
  } catch (err) {
    console.warn('[useJamFlowProgress] Failed to update local jam step progress', err)
  }
}

export function useJamFlowProgress() {
  const stepStatus = ref<Record<JamFlowStepAction, boolean>>({
    invite: false,
    rsvp: false,
    guests: false,
  })

  // Current step is the lowest-number step that is NOT yet completed
  const currentJamFlowStep = computed<JamFlowStep | null>(() => {
    for (const step of JAM_FLOW_STEPS) {
      if (!stepStatus.value[step.action]) {
        return step
      }
    }
    return null
  })

  const currentJamFlowStepAction = computed<JamFlowStepAction | null>(() => {
    return currentJamFlowStep.value?.action ?? null
  })

  function evaluateJamFlowStatus(
    gatheringId: string,
    gathering?: GatheringRecord | null,
    guests?: SeatingGuestRecord[] | null,
  ) {
    const activeId = gatheringId || 'mock-gathering-id'

    // 1. Check Invitation completion:
    let isInviteDone = false
    const d = gathering?.invitationDesign
    if (d) {
      if (d.mode === 'IMAGE') {
        isInviteDone = Boolean(d.imageUrl)
      } else {
        isInviteDone = Boolean(d.headline || d.requestLine || d.imageUrl || gathering?.invitationMessage || d.primaryName)
      }
    } else if (gathering?.invitationMessage) {
      isInviteDone = true
    }

    if (isInviteDone) {
      markJamStepCompletedLocally(activeId, 'invite', true)
    } else if (isJamLocalStepMarkedCompleted(activeId, 'invite')) {
      isInviteDone = true
    }

    // 2. Check RSVP completion:
    let isRsvpDone = Boolean(gathering?.questions && gathering.questions.length > 0)
    if (isRsvpDone) {
      markJamStepCompletedLocally(activeId, 'rsvp', true)
    } else if (isJamLocalStepMarkedCompleted(activeId, 'rsvp')) {
      isRsvpDone = true
    }

    // 3. Check Guest List completion:
    let isGuestsDone = Boolean(guests && guests.length > 0)
    if (isGuestsDone) {
      markJamStepCompletedLocally(activeId, 'guests', true)
    } else if (isJamLocalStepMarkedCompleted(activeId, 'guests')) {
      isGuestsDone = true
    }

    stepStatus.value = {
      invite: isInviteDone,
      rsvp: isRsvpDone,
      guests: isGuestsDone,
    }
  }

  return {
    stepStatus,
    currentJamFlowStep,
    currentJamFlowStepAction,
    evaluateJamFlowStatus,
  }
}
