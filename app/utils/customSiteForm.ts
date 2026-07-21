import type { CustomSiteRecord } from '~/types/customSite'

export interface WebsiteEditorWebsiteData {
  format: string
  siteTitle: string
  siteDescription: string
  domainName: string
  contactEmail: string
  motif: string
  colorPalette: string
  typography: string
  headerImage: string
  endingTitle: string
  endingMessage: string
  isPasswordProtected: boolean
  sitePassword: string
  whereToStayLocation: string
}

export interface WebsiteEditorSection {
  id: number
  type: 'heading' | 'paragraph'
  content: string
}

export interface WebsiteEditorTidbit {
  id: number
  heading: string
  paragraph: string
}

export interface WebsiteEditorScheduleItem {
  id: number
  title: string
  description: string
  location: string
}

export interface WebsiteEditorDiyComponent {
  id: string
  name: string
  header: string
  description: string
}

export interface ColorPaletteColors {
  primary: string
  secondary: string
  text_color: string
  secondary_text_color: string
}

export interface TypographySetInput {
  name: string
  headerFont: string
  subheaderFont: string
  bodyFont: string
}

export interface BuildCustomSiteFormInput {
  eventId: string
  websiteData: WebsiteEditorWebsiteData
  sections: WebsiteEditorSection[]
  tidbits: WebsiteEditorTidbit[]
  scheduleItems: WebsiteEditorScheduleItem[]
  selectedComponents: string[]
  selectedPalette: ColorPaletteColors
  selectedTypography: TypographySetInput
  selectedHeaderFile?: File
  diyComponents: WebsiteEditorDiyComponent[]
}

export interface WebsiteEditorContext {
  websiteData: WebsiteEditorWebsiteData
  sections: { value: WebsiteEditorSection[] }
  tidbits: { value: WebsiteEditorTidbit[] }
  scheduleItems: { value: WebsiteEditorScheduleItem[] }
  selectedComponents: { value: string[] }
  diyComponents: { value: WebsiteEditorDiyComponent[] }
  isLive: { value: boolean }
}

function slugifySiteName(title: string, domain: string): string {
  const fromDomain = domain.trim()
  if (fromDomain) {
    return fromDomain.slice(0, 50)
  }
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'my-wedding-site'
}

function isRemoteHeaderUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim())
}

export function buildCustomSiteFormData(input: BuildCustomSiteFormInput): FormData {
  const {
    eventId,
    websiteData,
    sections,
    tidbits,
    scheduleItems,
    selectedComponents,
    selectedPalette,
    selectedTypography,
    selectedHeaderFile,
    diyComponents,
  } = input

  const formData = new FormData()
  formData.append('event', eventId)
  formData.append('templateType', websiteData.format)
  formData.append('siteName', slugifySiteName(websiteData.siteTitle, websiteData.domainName))
  formData.append('title', websiteData.siteTitle.trim())
  formData.append('subtitle', websiteData.siteDescription.trim())
  formData.append('passwordProtected', String(websiteData.isPasswordProtected))
  formData.append('passcode', websiteData.sitePassword.trim())
  formData.append('colorPalette', JSON.stringify(selectedPalette))
  formData.append('colorPaletteName', websiteData.colorPalette)
  formData.append(
    'typography',
    JSON.stringify({
      name: selectedTypography.name,
      headerFont: selectedTypography.headerFont,
      subheaderFont: selectedTypography.subheaderFont,
      bodyFont: selectedTypography.bodyFont,
    })
  )
  formData.append('fontFamily', selectedTypography.name)
  formData.append('motif', websiteData.motif)
  formData.append('contactEmail', websiteData.contactEmail)
  formData.append(
    'tidbits',
    JSON.stringify(
      tidbits.map((t) => ({
        title: t.heading.trim(),
        content: t.paragraph.trim(),
      }))
    )
  )
  formData.append(
    'contentSections',
    JSON.stringify(
      sections.map((s) => ({
        type: s.type,
        content: s.content.trim(),
      }))
    )
  )
  formData.append(
    'schedule',
    JSON.stringify(
      scheduleItems.map((item) => ({
        title: item.title.trim(),
        description: item.description.trim(),
        location: item.location.trim(),
      }))
    )
  )
  formData.append('enabledComponents', JSON.stringify(selectedComponents))
  formData.append(
    'whereToStay',
    JSON.stringify({ location: websiteData.whereToStayLocation.trim() })
  )
  formData.append(
    'closing',
    JSON.stringify({
      title: websiteData.endingTitle.trim(),
      message: websiteData.endingMessage.trim(),
    })
  )
  formData.append(
    'diyComponents',
    JSON.stringify(
      diyComponents.map(c => ({
        id: c.id,
        name: c.name.trim(),
        header: c.header.trim(),
        content: c.description.trim(),
      }))
    )
  )

  if (selectedHeaderFile) {
    formData.append('headerImage', selectedHeaderFile)
  } else if (isRemoteHeaderUrl(websiteData.headerImage)) {
    formData.append('headerImageURL', websiteData.headerImage.trim())
  }

  return formData
}

export function applyCustomSiteToEditor(
  site: CustomSiteRecord,
  ctx: WebsiteEditorContext
): void {
  const { websiteData, sections, tidbits, scheduleItems, selectedComponents, diyComponents, isLive } = ctx

  websiteData.format = site.templateType || 'format1'
  websiteData.siteTitle = site.title ?? ''
  websiteData.siteDescription = site.subtitle ?? ''
  websiteData.domainName = site.siteName ?? ''
  websiteData.contactEmail = site.contactEmail ?? ''
  websiteData.motif = site.motif ?? websiteData.motif
  websiteData.colorPalette = site.colorPaletteName || websiteData.colorPalette
  websiteData.typography = site.typography?.name || site.fontFamily || websiteData.typography
  websiteData.headerImage = site.headerImageURL ?? ''
  websiteData.endingTitle = site.closing?.title ?? ''
  websiteData.endingMessage = site.closing?.message ?? ''
  websiteData.isPasswordProtected = Boolean(site.passwordProtected)
  websiteData.sitePassword = site.passwordProtected ? site.passcode ?? '' : ''
  websiteData.whereToStayLocation = site.whereToStay?.location ?? ''

  sections.value = (site.contentSections ?? []).map((s, i) => ({
    id: Date.now() + i,
    type: s.type,
    content: s.content,
  }))
  if (sections.value.length === 0) {
    sections.value = [
      { id: Date.now(), type: 'heading', content: '' },
      { id: Date.now() + 1, type: 'paragraph', content: '' },
    ]
  }

  tidbits.value = (site.tidbits ?? []).map((t, i) => ({
    id: Date.now() + i,
    heading: t.title,
    paragraph: t.content,
  }))

  scheduleItems.value = (site.schedule ?? []).map((item, i) => ({
    id: Date.now() + i,
    title: item.title,
    description: item.description,
    location: item.location ?? '',
  }))

  diyComponents.value = ((site as any).diyComponents ?? []).map((c: { id: string, name: string, header: string, content: string }, i: number) => ({
    id: c.id || `diy-${Date.now() + i}`,
    name: c.name,
    header: c.header,
    description: c.content,
  }))

  selectedComponents.value = [...(site.enabledComponents ?? [])]
  isLive.value = Boolean(site.isPublished)
}

export function validateWebsiteEditorForSave(
  websiteData: WebsiteEditorWebsiteData,
  selectedHeaderFile?: File
): string | null {
  if (!websiteData.siteTitle.trim()) {
    return 'Site title is required.'
  }
  if (!websiteData.siteDescription.trim()) {
    return 'Site description is required.'
  }
  const siteName = slugifySiteName(websiteData.siteTitle, websiteData.domainName)
  if (!siteName) {
    return 'Domain name is required.'
  }
  const pass = websiteData.sitePassword.trim()
  if (pass.length >= 4) {
    if (!/^[a-zA-Z0-9]+$/.test(pass)) {
      return 'Password must contain only letters and numbers.'
    }
  }
  const hasHeader =
    Boolean(selectedHeaderFile) || isRemoteHeaderUrl(websiteData.headerImage)
  if (!hasHeader) {
    return 'Please upload a header image before saving.'
  }
  return null
}
