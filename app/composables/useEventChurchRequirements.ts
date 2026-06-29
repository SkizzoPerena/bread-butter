import type {
  ChurchRequirementParty,
  ChurchRequirementRecord,
  CreateRequirementPayload,
  DeleteRequirementResponse,
  RequirementResponse,
  RequirementsByEventResponse,
  UpdatePartyRequirementPayload,
  UpdateRequirementDetailsPayload,
} from '~/types/churchRequirement'
import churchRequirementsSeed from '~/data/church_requirements.json'

let mockRequirements: ChurchRequirementRecord[] = []

function buildMockRequirements(eventId: string): ChurchRequirementRecord[] {
  return (churchRequirementsSeed as Omit<ChurchRequirementRecord, '_id' | 'event'>[]).map(
    (item, index) => ({
      ...item,
      _id: `mock-requirement-${index}`,
      event: eventId,
      templateKey: item.templateKey ?? (item as { taskKey?: string }).taskKey ?? null,
      groom: { ...item.groom, attachedFile: item.groom?.attachedFile ?? null },
      bride: { ...item.bride, attachedFile: item.bride?.attachedFile ?? null },
    })
  )
}

function getMockRequirements(eventId: string): ChurchRequirementRecord[] {
  if (mockRequirements.length === 0 || mockRequirements[0]?.event !== eventId) {
    mockRequirements = buildMockRequirements(eventId)
  }
  return mockRequirements
}

function replaceMockRequirement(updated: ChurchRequirementRecord) {
  mockRequirements = mockRequirements.map((item) =>
    item._id === updated._id ? updated : item
  )
}

export function useEventChurchRequirements() {
  const { apiRequest, apiUpload, isUiOnlyMode } = useApiMode()

  const isLoading = ref(false)
  const isSubmitting = ref(false)

  async function fetchRequirementsByEvent(eventId: string) {
    isLoading.value = true
    try {
      if (isUiOnlyMode.value) {
        return {
          success: true,
          status: 200,
          requirements: getMockRequirements(eventId),
        } satisfies RequirementsByEventResponse
      }

      return await apiRequest<RequirementsByEventResponse>(
        `/user/church-requirements/event/${eventId}`
      )
    } finally {
      isLoading.value = false
    }
  }

  async function createRequirement(payload: CreateRequirementPayload) {
    isSubmitting.value = true
    try {
      if (isUiOnlyMode.value) {
        const requirement: ChurchRequirementRecord = {
          _id: `mock-requirement-${Date.now()}`,
          event: payload.eventId,
          templateKey: null,
          displayName: payload.displayName,
          category: payload.category ?? '',
          timeline: payload.timeline ?? '',
          sourceUrl: payload.sourceUrl ?? '',
          description: payload.description ?? '',
          groom: { status: 'required', dateAcquired: null, notes: '', attachedFile: null },
          bride: { status: 'required', dateAcquired: null, notes: '', attachedFile: null },
        }
        mockRequirements = [...getMockRequirements(payload.eventId), requirement]
        return {
          success: true,
          status: 201,
          message: 'Church requirement created successfully.',
          requirement,
        } satisfies RequirementResponse
      }

      return await apiRequest<RequirementResponse>('/user/church-requirements', {
        method: 'POST',
        body: payload,
      })
    } finally {
      isSubmitting.value = false
    }
  }

  async function updateRequirementDetails(
    requirementId: string,
    payload: UpdateRequirementDetailsPayload
  ) {
    isSubmitting.value = true
    try {
      if (isUiOnlyMode.value) {
        const existing = mockRequirements.find((item) => item._id === requirementId)
        if (!existing) {
          throw new Error('Requirement not found')
        }
        const requirement = { ...existing, ...payload }
        replaceMockRequirement(requirement)
        return {
          success: true,
          status: 200,
          message: 'Church requirement updated successfully.',
          requirement,
        } satisfies RequirementResponse
      }

      return await apiRequest<RequirementResponse>(
        `/user/church-requirements/${requirementId}/details`,
        {
          method: 'PATCH',
          body: payload,
        }
      )
    } finally {
      isSubmitting.value = false
    }
  }

  async function updatePartyRequirement(
    requirementId: string,
    party: ChurchRequirementParty,
    payload: UpdatePartyRequirementPayload,
    file?: File
  ) {
    isSubmitting.value = true
    try {
      if (isUiOnlyMode.value) {
        const existing = mockRequirements.find((item) => item._id === requirementId)
        if (!existing) {
          throw new Error('Requirement not found')
        }
        const nextParty = {
          ...existing[party],
          ...(payload.status !== undefined ? { status: payload.status } : {}),
          ...(payload.dateAcquired !== undefined ? { dateAcquired: payload.dateAcquired } : {}),
          ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
          ...(file
            ? {
                attachedFile: {
                  fileName: file.name,
                  fileType: file.type,
                  fileURL: URL.createObjectURL(file),
                },
              }
            : {}),
        }
        const requirement = { ...existing, [party]: nextParty }
        replaceMockRequirement(requirement)
        return {
          success: true,
          status: 200,
          message: 'Church requirement updated successfully.',
          requirement,
        } satisfies RequirementResponse
      }

      if (file) {
        const formData = new FormData()
        if (payload.status !== undefined) {
          formData.append('status', payload.status)
        }
        if (payload.dateAcquired !== undefined) {
          formData.append('dateAcquired', payload.dateAcquired ?? '')
        }
        if (payload.notes !== undefined) {
          formData.append('notes', payload.notes)
        }
        formData.append('file', file)

        return await apiUpload<RequirementResponse>(
          `/user/church-requirements/${requirementId}/party/${party}`,
          formData,
          { method: 'PATCH' }
        )
      }

      return await apiRequest<RequirementResponse>(
        `/user/church-requirements/${requirementId}/party/${party}`,
        {
          method: 'PATCH',
          body: payload,
        }
      )
    } finally {
      isSubmitting.value = false
    }
  }

  async function deletePartyFile(requirementId: string, party: ChurchRequirementParty) {
    isSubmitting.value = true
    try {
      if (isUiOnlyMode.value) {
        const existing = mockRequirements.find((item) => item._id === requirementId)
        if (!existing) {
          throw new Error('Requirement not found')
        }
        const requirement = {
          ...existing,
          [party]: { ...existing[party], attachedFile: null },
        }
        replaceMockRequirement(requirement)
        return {
          success: true,
          status: 200,
          message: 'Church requirement file removed successfully.',
          requirement,
        } satisfies RequirementResponse
      }

      return await apiRequest<RequirementResponse>(
        `/user/church-requirements/${requirementId}/party/${party}/file`,
        { method: 'DELETE' }
      )
    } finally {
      isSubmitting.value = false
    }
  }

  async function deleteRequirement(requirementId: string) {
    isSubmitting.value = true
    try {
      if (isUiOnlyMode.value) {
        mockRequirements = mockRequirements.filter((item) => item._id !== requirementId)
        return {
          success: true,
          status: 200,
          message: 'Church requirement deleted successfully.',
        } satisfies DeleteRequirementResponse
      }

      return await apiRequest<DeleteRequirementResponse>(
        `/user/church-requirements/${requirementId}`,
        { method: 'DELETE' }
      )
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    isLoading,
    isSubmitting,
    fetchRequirementsByEvent,
    createRequirement,
    updateRequirementDetails,
    updatePartyRequirement,
    deletePartyFile,
    deleteRequirement,
  }
}
