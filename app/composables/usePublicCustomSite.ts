import type {
  PublicCustomSiteMeta,
  PublicCustomSiteRecord,
  PublicCustomSiteUnavailableResponse,
  UnlockCustomSiteResponse,
} from '~/types/customSite'
import { PublicCustomSiteError } from '~/types/customSite'

const MOCK_PUBLISHED: PublicCustomSiteRecord = {
  _id: 'mock-public-site-1',
  event: 'mock-event-id',
  templateType: 'format1',
  siteName: 'jane-and-john',
  title: "Jane & John's Wedding",
  subtitle: 'A story of love, life, and commitment',
  headerImageURL: '',
  passwordProtected: false,
  motif: 'Classic Romance',
  colorPaletteName: 'Blush & Mauve',
  typography: {
    name: 'Romantic Script',
    headerFont: 'Parisienne',
    subheaderFont: 'Gambetta',
    bodyFont: 'Satoshi',
  },
  tidbits: [
    { title: 'What should I wear?', content: 'Semi-formal attire is requested.' },
  ],
  contentSections: [
    { type: 'heading', content: 'Our Story' },
    { type: 'paragraph', content: 'We met in college and never looked back.' },
  ],
  schedule: [
    {
      title: 'Ceremony',
      description: 'Join us as we say our vows.',
      location: 'Manila Cathedral',
    },
  ],
  enabledComponents: ['q-and-a', 'schedule'],
  closing: {
    title: 'See you there!',
    message: 'We cannot wait to celebrate with you.',
  },
  whereToStay: { location: 'Intramuros, Manila' },
  isPublished: true,
}

const MOCK_PROTECTED: PublicCustomSiteRecord = {
  ...MOCK_PUBLISHED,
  _id: 'mock-public-site-2',
  siteName: 'mary-shane',
  title: 'Mary & Shane',
  passwordProtected: true,
}

const MOCK_UNPUBLISHED_SLUG = 'draft-wedding'

function parsePublicSiteError(error: unknown): PublicCustomSiteError {
  if (error instanceof PublicCustomSiteError) {
    return error
  }

  const err = error as {
    status?: number
    statusCode?: number
    data?: PublicCustomSiteUnavailableResponse & { message?: string }
  }
  const status = err.status ?? err.statusCode ?? 500
  const data = err.data

  if (status === 403 && data?.availability === 'UNPUBLISHED') {
    return new PublicCustomSiteError(
      data.message || 'This Site Has not yet been published or taken down temporarily',
      403,
      'UNPUBLISHED'
    )
  }

  if (status === 404) {
    return new PublicCustomSiteError(data?.message || 'Site not found.', 404)
  }

  return new PublicCustomSiteError(
    data?.message || 'Could not load site.',
    status
  )
}

function getMockMeta(siteName: string, accessToken?: string | null): PublicCustomSiteMeta {
  const slug = siteName.trim().toLowerCase()

  if (slug === MOCK_UNPUBLISHED_SLUG) {
    throw new PublicCustomSiteError(
      'This Site Has not yet been published or taken down temporarily',
      403,
      'UNPUBLISHED'
    )
  }

  if (slug === 'mary-shane') {
    if (!accessToken) {
      return {
        success: true,
        passwordProtected: true,
        siteName: 'mary-shane',
      }
    }
    return {
      success: true,
      passwordProtected: true,
      siteName: 'mary-shane',
      customSite: MOCK_PROTECTED,
    }
  }

  if (slug === 'jane-and-john') {
    return {
      success: true,
      passwordProtected: false,
      siteName: 'jane-and-john',
      customSite: MOCK_PUBLISHED,
    }
  }

  throw new PublicCustomSiteError('Site not found.', 404)
}

export function usePublicCustomSite() {
  const { apiRequest, isUiOnlyMode } = useApiMode()

  async function fetchPublicSiteMeta(
    siteName: string,
    accessToken?: string | null
  ): Promise<PublicCustomSiteMeta> {
    if (isUiOnlyMode.value) {
      return getMockMeta(siteName, accessToken)
    }

    try {
      const query = accessToken
        ? `?accessToken=${encodeURIComponent(accessToken)}`
        : ''
      return await apiRequest<PublicCustomSiteMeta>(
        `/guest/custom-site/site/${encodeURIComponent(siteName)}${query}`,
        { authenticated: false }
      )
    } catch (error) {
      throw parsePublicSiteError(error)
    }
  }

  async function unlockPublicSite(
    siteName: string,
    passcode: string
  ): Promise<UnlockCustomSiteResponse> {
    if (isUiOnlyMode.value) {
      const slug = siteName.trim().toLowerCase()
      if (slug === 'mary-shane' && passcode.trim() === '1234') {
        return {
          success: true,
          status: 200,
          message: 'Access granted.',
          accessToken: 'mock-access-token-mary-shane',
        }
      }
      throw new PublicCustomSiteError('Incorrect passcode.', 401)
    }

    try {
      return await apiRequest<UnlockCustomSiteResponse>(
        `/guest/custom-site/site/${encodeURIComponent(siteName)}/unlock`,
        {
          method: 'POST',
          body: { passcode },
          authenticated: false,
        }
      )
    } catch (error) {
      throw parsePublicSiteError(error)
    }
  }

  return {
    fetchPublicSiteMeta,
    unlockPublicSite,
  }
}
