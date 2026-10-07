import type {
  CustomSiteMutationResponse,
  CustomSiteRecord,
  CustomSiteResponse,
  CustomSitesListResponse,
} from '~/types/customSite'

const MOCK_CUSTOM_SITE_ID = 'mock-custom-site-id'

function mockCustomSite(eventId: string): CustomSiteRecord {
  return {
    _id: MOCK_CUSTOM_SITE_ID,
    event: eventId,
    templateType: 'format1',
    siteName: 'jane-and-john',
    title: "Jane & John's Wedding",
    subtitle: 'A story of love, life, and commitment',
    headerImageURL: '',
    passwordProtected: false,
    passcode: '',
    motif: 'Classic Romance',
    colorPaletteName: 'Blush & Mauve',
    isPublished: false,
    tidbits: [],
    contentSections: [],
    schedule: [],
    enabledComponents: [],
  }
}

export type CustomSiteSaveRequest = {
  method: 'POST' | 'PATCH'
  path: string
  url: string
}

export function useCustomSite() {
  const { apiRequest, apiUpload, isUiOnlyMode, apiBase } = useApiMode()

  function getSaveWebsiteEndpoint(customSiteId?: string | null): CustomSiteSaveRequest {
    const path = customSiteId ? `/user/custom-site/${customSiteId}` : '/user/custom-site'
    const method = customSiteId ? 'PATCH' : 'POST'
    const base = apiBase.value.replace(/\/$/, '')
    const url = `${base}/${path.replace(/^\//, '')}`
    return { method, path, url }
  }

  async function fetchCustomSitesByEvent(eventId: string): Promise<CustomSiteRecord[]> {
    if (isUiOnlyMode.value) {
      return []
    }
    const response = await apiRequest<CustomSitesListResponse>(
      `/user/custom-site/events/${eventId}`
    )
    return response.customSites ?? []
  }

  async function fetchCustomSite(customSiteId: string): Promise<CustomSiteRecord> {
    if (isUiOnlyMode.value) {
      return mockCustomSite('mock-event-id')
    }
    const response = await apiRequest<CustomSiteResponse>(
      `/user/custom-site/${customSiteId}`
    )
    return response.customSite
  }

  async function createCustomSite(formData: FormData): Promise<CustomSiteRecord> {
    if (isUiOnlyMode.value) {
      const eventId = formData.get('event')?.toString() ?? 'mock-event-id'
      return { ...mockCustomSite(eventId), isPublished: false }
    }
    const response = await apiUpload<CustomSiteMutationResponse>(
      '/user/custom-site',
      formData
    )
    if (!response.customSite) {
      throw new Error(response.message || 'Custom site was not returned.')
    }
    return response.customSite
  }

  async function updateCustomSite(
    customSiteId: string,
    formData: FormData
  ): Promise<CustomSiteRecord> {
    if (isUiOnlyMode.value) {
      const eventId = formData.get('event')?.toString() ?? 'mock-event-id'
      return mockCustomSite(eventId)
    }
    const response = await apiUpload<CustomSiteMutationResponse>(
      `/user/custom-site/${customSiteId}`,
      formData,
      { method: 'PATCH' }
    )
    if (!response.customSite) {
      return await fetchCustomSite(customSiteId)
    }
    return response.customSite
  }

  async function publishCustomSite(customSiteId: string): Promise<void> {
    if (isUiOnlyMode.value) {
      return
    }
    await apiRequest<CustomSiteMutationResponse>(
      `/user/custom-site/${customSiteId}/publish`,
      { method: 'PATCH' }
    )
  }

  async function unpublishCustomSite(customSiteId: string): Promise<void> {
    if (isUiOnlyMode.value) {
      return
    }
    await apiRequest<CustomSiteMutationResponse>(
      `/user/custom-site/${customSiteId}/unpublish`,
      { method: 'PATCH' }
    )
  }

  return {
    fetchCustomSitesByEvent,
    fetchCustomSite,
    createCustomSite,
    updateCustomSite,
    publishCustomSite,
    unpublishCustomSite,
    getSaveWebsiteEndpoint,
  }
}
