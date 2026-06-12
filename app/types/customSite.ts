export interface CustomSiteTidbit {
  _id?: string
  title: string
  content: string
}

export interface CustomSiteContentSection {
  _id?: string
  type: 'heading' | 'paragraph'
  content: string
}

export interface CustomSiteScheduleItem {
  _id?: string
  title: string
  description: string
  location?: string
}

export interface CustomSiteClosing {
  title?: string
  message?: string
}

export interface CustomSiteWhereToStay {
  location?: string
}

export interface CustomSiteTypography {
  name?: string
  headerFont?: string
  subheaderFont?: string
  bodyFont?: string
}

export interface CustomSiteColorPalette {
  background?: string
  surface?: string
  primary?: string
  text?: string
  heading?: string
}

export interface CustomSiteRecord {
  _id: string
  event: string
  passwordProtected?: boolean
  passcode?: string
  templateType: string
  siteName: string
  title: string
  subtitle: string
  headerImageURL: string
  colorPalette?: CustomSiteColorPalette | Record<string, string>
  colorPaletteName?: string
  typography?: CustomSiteTypography | null
  fontFamily?: string | null
  motif?: string
  contactEmail?: string
  tidbits?: CustomSiteTidbit[]
  contentSections?: CustomSiteContentSection[]
  schedule?: CustomSiteScheduleItem[]
  closing?: CustomSiteClosing
  whereToStay?: CustomSiteWhereToStay
  enabledComponents?: string[]
  isPublished?: boolean
  gallery?: { imageURL: string; caption?: string }[]
}

export interface CustomSitesListResponse {
  success: boolean
  status: number
  customSites: CustomSiteRecord[]
}

export interface CustomSiteResponse {
  success: boolean
  customSite: CustomSiteRecord
}

export interface CustomSiteMutationResponse {
  success: boolean
  status: number
  message: string
  customSite?: CustomSiteRecord
}

export type PublicCustomSiteAvailability = 'UNPUBLISHED'

export interface PublicCustomSiteMeta {
  success: boolean
  passwordProtected: boolean
  siteName: string
  customSite?: PublicCustomSiteRecord
}

export type PublicCustomSiteRecord = Omit<CustomSiteRecord, 'passcode'>

export interface PublicCustomSiteUnavailableResponse {
  success: false
  status: number
  availability: PublicCustomSiteAvailability
  message: string
}

export interface UnlockCustomSiteResponse {
  success: boolean
  status: number
  message: string
  accessToken?: string
}

export class PublicCustomSiteError extends Error {
  status: number
  availability?: PublicCustomSiteAvailability

  constructor(message: string, status: number, availability?: PublicCustomSiteAvailability) {
    super(message)
    this.name = 'PublicCustomSiteError'
    this.status = status
    this.availability = availability
  }
}
