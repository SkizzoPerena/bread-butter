import type {
  CustomSiteMutationResponse,
  CustomSiteRecord,
  CustomSiteResponse,
  CustomSitesListResponse,
} from '~/types/customSite'
import { NOT_FULLY_PAID_REASONS, actorRole, tracked } from '~/utils/analytics'

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

export const uiMockSitesStore = ref<Record<string, CustomSiteRecord>>({})

function parseMockRecordFromFormData(eventId: string, formData: FormData, existingId?: string): CustomSiteRecord {
  const base = mockCustomSite(eventId)
  const siteName = formData.get('siteName')?.toString() || base.siteName
  const title = formData.get('title')?.toString() || base.title
  const subtitle = formData.get('subtitle')?.toString() || base.subtitle
  const templateType = formData.get('templateType')?.toString() || base.templateType
  const rawColorPalette = formData.get('colorPalette')?.toString()
  let colorPalette = base.colorPalette
  if (rawColorPalette) {
    try {
      colorPalette = JSON.parse(rawColorPalette)
    } catch {
      colorPalette = rawColorPalette
    }
  }
  const colorPaletteName = formData.get('colorPaletteName')?.toString() || base.colorPaletteName
  const motif = formData.get('motif')?.toString() || base.motif
  const invertColors = formData.get('invertColors') === 'true'
  const simplifiedColors = formData.get('simplifiedColors') === 'true'
  const singlePageSite = formData.get('singlePageSite') !== 'false'

  const record: CustomSiteRecord = {
    ...base,
    _id: existingId || base._id,
    siteName,
    title,
    subtitle,
    templateType,
    colorPalette,
    colorPaletteName,
    motif,
    invertColors,
    simplifiedColors,
    singlePageSite,
  }

  uiMockSitesStore.value[siteName] = record
  uiMockSitesStore.value[record._id] = record
  return record
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
      const records = Object.values(uiMockSitesStore.value).filter((s) => s.event === eventId)
      return records.length > 0 ? records : [mockCustomSite(eventId)]
    }
    const response = await apiRequest<CustomSitesListResponse>(
      `/user/custom-site/events/${eventId}`
    )
    return response.customSites ?? []
  }

  async function fetchCustomSite(customSiteId: string): Promise<CustomSiteRecord> {
    if (isUiOnlyMode.value) {
      return uiMockSitesStore.value[customSiteId] || mockCustomSite('mock-event-id')
    }
    const response = await apiRequest<CustomSiteResponse>(
      `/user/custom-site/${customSiteId}`
    )
    return response.customSite
  }

  async function createCustomSite(formData: FormData): Promise<CustomSiteRecord> {
    if (isUiOnlyMode.value) {
      const eventId = formData.get('event')?.toString() ?? 'mock-event-id'
      return { ...parseMockRecordFromFormData(eventId, formData), isPublished: false }
    }
    const response = await tracked(actorRole(), () => apiUpload<CustomSiteMutationResponse>(
      '/user/custom-site',
      formData
    ), {
      event: 'custom_site_saved',
      props: { event_id: formData.get('event')?.toString() || undefined },
    })
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
      return parseMockRecordFromFormData(eventId, formData, customSiteId)
    }
    const response = await tracked(actorRole(), () => apiUpload<CustomSiteMutationResponse>(
      `/user/custom-site/${customSiteId}`,
      formData,
      { method: 'PATCH' }
    ), {
      event: 'custom_site_saved',
      props: { event_id: formData.get('event')?.toString() || undefined },
    })
    if (!response.customSite) {
      return await fetchCustomSite(customSiteId)
    }
    return response.customSite
  }

  async function publishCustomSite(customSiteId: string): Promise<void> {
    if (isUiOnlyMode.value) {
      return
    }
    await tracked(actorRole(), () => apiRequest<CustomSiteMutationResponse>(
      `/user/custom-site/${customSiteId}/publish`,
      { method: 'PATCH' }
    ), { event: 'custom_site_published' }, {
      event: 'custom_site_publish_rejected',
      reasons: NOT_FULLY_PAID_REASONS,
    })
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
