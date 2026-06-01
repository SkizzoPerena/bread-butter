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
