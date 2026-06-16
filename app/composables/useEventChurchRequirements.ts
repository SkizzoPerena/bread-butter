import type {
  BulkPartyRequirementUpdate,
  BulkUpdatePartyRequirementsPayload,
  ChurchRequirementParty,
  ChurchRequirementRecord,
  ChurchRequirementResponse,
  UpdatePartyRequirementPayload,
} from '~/types/churchRequirement'
import churchRequirementsSeed from '~/data/church_requirements.json'

function applyUpdatesToMockRequirements(
  requirements: ChurchRequirementRecord['requirements'],
  updates: BulkPartyRequirementUpdate[]
) {
  return requirements.map((item) => {
    const itemUpdates = updates.filter((update) => update.taskKey === item.taskKey)
    if (itemUpdates.length === 0) {
      return item
    }

    let groom = item.groom
    let bride = item.bride

    for (const update of itemUpdates) {
      const next = {
        ...(update.party === 'groom' ? groom : bride),
        ...(update.status !== undefined ? { status: update.status } : {}),
        ...(update.dateRequested !== undefined ? { dateRequested: update.dateRequested } : {}),
        ...(update.dateAcquired !== undefined ? { dateAcquired: update.dateAcquired } : {}),
      }
      if (update.party === 'groom') {
        groom = next
      } else {
        bride = next
      }
    }

    return { ...item, groom, bride }
  })
}

export function useEventChurchRequirements() {
  const { apiRequest, executeAction } = useApiMode()

  const isLoading = ref(false)
  const isSubmitting = ref(false)

  async function fetchChurchRequirements(eventId: string) {
    isLoading.value = true
    try {
      return await executeAction({
        api: () =>
          apiRequest<ChurchRequirementResponse>(
            `/user/church-requirements/event/${eventId}`
          ),
        uiOnly: () => ({
          success: true,
          status: 200,
          churchRequirement: {
            _id: 'mock-church-requirement',
            event: eventId,
            requirements: churchRequirementsSeed as ChurchRequirementRecord['requirements'],
          },
        }),
      })
    } finally {
      isLoading.value = false
    }
  }

  async function updatePartyRequirement(
    eventId: string,
    taskKey: string,
    party: ChurchRequirementParty,
    payload: UpdatePartyRequirementPayload
  ) {
    isSubmitting.value = true
    try {
      return await executeAction({
        api: () =>
          apiRequest<ChurchRequirementResponse>(
            `/user/church-requirements/event/${eventId}/items/${encodeURIComponent(taskKey)}/${party}`,
            {
              method: 'PATCH',
              body: payload,
            }
          ),
        uiOnly: () => ({
          success: true,
          status: 200,
          churchRequirement: {
            _id: 'mock-church-requirement',
            event: eventId,
            requirements: applyUpdatesToMockRequirements(
              churchRequirementsSeed as ChurchRequirementRecord['requirements'],
              [{ taskKey, party, ...payload }]
            ),
          },
        }),
      })
    } finally {
      isSubmitting.value = false
    }
  }

  async function bulkUpdatePartyRequirements(
    eventId: string,
    payload: BulkUpdatePartyRequirementsPayload
  ) {
    isSubmitting.value = true
    try {
      return await executeAction({
        api: () =>
          apiRequest<ChurchRequirementResponse>(
            `/user/church-requirements/event/${eventId}/items/bulk`,
            {
              method: 'PATCH',
              body: payload,
            }
          ),
        uiOnly: () => ({
          success: true,
          status: 200,
          churchRequirement: {
            _id: 'mock-church-requirement',
            event: eventId,
            requirements: applyUpdatesToMockRequirements(
              churchRequirementsSeed as ChurchRequirementRecord['requirements'],
              payload.updates
            ),
          },
        }),
      })
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    isLoading,
    isSubmitting,
    fetchChurchRequirements,
    updatePartyRequirement,
    bulkUpdatePartyRequirements,
  }
}
