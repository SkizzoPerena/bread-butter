import type { CustomSiteRecord, CustomSiteAccommodation, CustomSiteWhereToStay } from '~/types/customSite'
import { extractCustomColors, resolveTypography } from '~/utils/websiteTheme'

export interface WebsiteEditorWebsiteData {
  format: string
  siteTitle: string
  siteDescription: string
  domainName: string
  contactEmail: string
  motif: string
  colorPalette: string
  typography: string
  headerFont?: string
  subheaderFont?: string
  bodyFont?: string
  headerImage: string
  endingTitle: string
  endingMessage: string
  isPasswordProtected: boolean
  sitePassword: string
  whereToStayLocation: string
  whereToStayLatitude?: number | null
  whereToStayLongitude?: number | null
  invertColors?: boolean
  simplifiedColors?: boolean
  singlePageSite?: boolean
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
  date?: string
  startTime?: string
  endTime?: string
  isAllDay?: boolean
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

export interface CustomSiteMotifConfig {
  invertColors?: boolean
  simplifiedColors?: boolean
  singlePageSite?: boolean
  diyComponents?: Array<{ id: string; name: string; header: string; content?: string; description?: string }>
  motif?: string
  customColors?: ColorPaletteColors
  colorPaletteName?: string
  weddingParty?: Array<{ id: string; name: string; role: string; notes?: string }>
  weddingPartyIntro?: string
  whereToStay?: CustomSiteWhereToStay
}

export function parseMotifConfig(motif?: string | null): CustomSiteMotifConfig | null {
  if (!motif || typeof motif !== 'string') return null
  const trimmed = motif.trim()
  if (!trimmed.startsWith('{')) return null
  try {
    const parsed = JSON.parse(trimmed)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as CustomSiteMotifConfig
    }
  } catch {
    // Ignore legacy motif string
  }
  return null
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
  weddingPartyMembers?: Array<{ id: string; name: string; role: string; notes?: string }>
  weddingPartyIntro?: string
  whereToStayAccommodations?: CustomSiteAccommodation[]
}

export interface WebsiteEditorContext {
  websiteData: WebsiteEditorWebsiteData
  sections: { value: WebsiteEditorSection[] }
  tidbits: { value: WebsiteEditorTidbit[] }
  scheduleItems: { value: WebsiteEditorScheduleItem[] }
  selectedComponents: { value: string[] }
  diyComponents: { value: WebsiteEditorDiyComponent[] }
  isLive: { value: boolean }
  customColors?: {
    primary: string
    secondary: string
    text_color: string
    secondary_text_color: string
  }
  customWeddingPartyMembers?: { value: Array<{ id: string; name: string; role: string; notes?: string }> }
  weddingPartyIntro?: { value: string }
  whereToStayAccommodations?: { value: CustomSiteAccommodation[] }
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

function toHex(color: string | undefined, fallback = '#FFFFFF'): string {
  if (!color || typeof color !== 'string') return fallback
  const trimmed = color.trim()
  if (/^#([A-Fa-f0-9]{6})$/.test(trimmed)) {
    return trimmed
  }
  if (/^#([A-Fa-f0-9]{3})$/.test(trimmed)) {
    const r = trimmed[1]
    const g = trimmed[2]
    const b = trimmed[3]
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return fallback
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
    weddingPartyMembers,
    weddingPartyIntro,
    whereToStayAccommodations,
  } = input

  const formData = new FormData()
  formData.append('event', eventId)
  formData.append('templateType', websiteData.format)
  formData.append('siteName', slugifySiteName(websiteData.siteTitle, websiteData.domainName))
  formData.append('title', websiteData.siteTitle.trim())
  formData.append('subtitle', websiteData.siteDescription.trim())
  formData.append('passwordProtected', String(websiteData.isPasswordProtected))
  formData.append('passcode', websiteData.sitePassword.trim())

  const palettePayload: Record<string, string> = {
    primary: toHex(selectedPalette.primary, '#FFFFFF'),
    secondary: toHex(selectedPalette.secondary, '#F2F2F2'),
    text_color: toHex(selectedPalette.text_color, '#000000'),
    secondary_text_color: toHex(selectedPalette.secondary_text_color, '#333333'),
    background: toHex(selectedPalette.primary, '#FFFFFF'),
    surface: toHex(selectedPalette.secondary, '#F2F2F2'),
    text: toHex(selectedPalette.text_color, '#000000'),
    heading: toHex(selectedPalette.text_color, '#000000'),
    textColor: toHex(selectedPalette.text_color, '#000000'),
    secondaryTextColor: toHex(selectedPalette.secondary_text_color, '#333333'),
  }
  formData.append('colorPalette', JSON.stringify(palettePayload))
  formData.append('invertColors', String(Boolean(websiteData.invertColors)))
  formData.append('simplifiedColors', String(Boolean(websiteData.simplifiedColors)))
  formData.append('singlePageSite', String(Boolean(websiteData.singlePageSite)))
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
  const motifPayload: CustomSiteMotifConfig = {
    invertColors: Boolean(websiteData.invertColors),
    simplifiedColors: Boolean(websiteData.simplifiedColors),
    singlePageSite: Boolean(websiteData.singlePageSite),
    diyComponents: diyComponents.map((c) => ({
      id: c.id,
      name: c.name.trim(),
      header: c.header.trim(),
      content: c.description.trim(),
    })),
    motif: websiteData.motif && !websiteData.motif.startsWith('{') ? websiteData.motif : '',
    customColors: websiteData.colorPalette === 'Custom' ? selectedPalette : undefined,
    colorPaletteName: websiteData.colorPalette,
    weddingParty: input.weddingPartyMembers,
    weddingPartyIntro: input.weddingPartyIntro?.trim(),
    whereToStay: {
      location: websiteData.whereToStayLocation.trim(),
      latitude: websiteData.whereToStayLatitude ?? null,
      longitude: websiteData.whereToStayLongitude ?? null,
      accommodations: (whereToStayAccommodations || []).slice(0, 4),
    },
  }
  formData.append('motif', JSON.stringify(motifPayload))
  formData.append('weddingParty', JSON.stringify(input.weddingPartyMembers ?? []))
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
        location: (item.location || '').trim(),
        date: item.date || '',
        startTime: item.startTime || '',
        endTime: item.endTime || '',
        isAllDay: Boolean(item.isAllDay),
      }))
    )
  )
  formData.append('enabledComponents', JSON.stringify(selectedComponents))
  const whereToStayPayload: CustomSiteWhereToStay = {
    location: websiteData.whereToStayLocation.trim(),
    latitude: websiteData.whereToStayLatitude ?? null,
    longitude: websiteData.whereToStayLongitude ?? null,
    accommodations: (whereToStayAccommodations || []).slice(0, 4),
  }
  formData.append(
    'whereToStay',
    JSON.stringify(whereToStayPayload)
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
  websiteData.typography = site.typography?.name || site.fontFamily || websiteData.typography
  const resolvedTypo = resolveTypography(websiteData.typography)
  websiteData.headerFont = site.typography?.headerFont || resolvedTypo.headerFont || 'Parisienne'
  websiteData.subheaderFont = site.typography?.subheaderFont || resolvedTypo.subheaderFont || 'Cormorant Garamond'
  websiteData.bodyFont = site.typography?.bodyFont || resolvedTypo.bodyFont || 'Montserrat'
  websiteData.headerImage = site.headerImageURL ?? ''
  websiteData.endingTitle = site.closing?.title ?? ''
  websiteData.endingMessage = site.closing?.message ?? ''
  websiteData.isPasswordProtected = Boolean(site.passwordProtected)
  websiteData.sitePassword = site.passwordProtected ? site.passcode ?? '' : ''
  const motifConfig = parseMotifConfig(site.motif)
  websiteData.whereToStayLocation = site.whereToStay?.location ?? motifConfig?.whereToStay?.location ?? ''
  websiteData.whereToStayLatitude = site.whereToStay?.latitude ?? motifConfig?.whereToStay?.latitude ?? null
  websiteData.whereToStayLongitude = site.whereToStay?.longitude ?? motifConfig?.whereToStay?.longitude ?? null
  const parsedColorPalette = (typeof site.colorPalette === 'string')
    ? (() => { try { return JSON.parse(site.colorPalette) } catch { return null } })()
    : site.colorPalette
  const paletteRecord = (typeof parsedColorPalette === 'object' && parsedColorPalette !== null)
    ? (parsedColorPalette as Record<string, unknown>)
    : {}
  websiteData.colorPalette = motifConfig?.colorPaletteName || site.colorPaletteName || websiteData.colorPalette
  if (ctx.customColors) {
    const extractedColors =
      extractCustomColors(parsedColorPalette) ||
      extractCustomColors(motifConfig?.customColors) ||
      extractCustomColors(motifConfig)

    if (extractedColors) {
      ctx.customColors.primary = extractedColors.primary
      ctx.customColors.secondary = extractedColors.secondary
      ctx.customColors.text_color = extractedColors.text_color
      ctx.customColors.secondary_text_color = extractedColors.secondary_text_color
    }
  }
  websiteData.motif = motifConfig?.motif ?? (site.motif && !site.motif.startsWith('{') ? site.motif : '')
  const rawInvert = site.invertColors ?? paletteRecord.invertColors ?? motifConfig?.invertColors
  websiteData.invertColors = Boolean(rawInvert)

  const rawSimplified = site.simplifiedColors ?? paletteRecord.simplifiedColors ?? motifConfig?.simplifiedColors
  websiteData.simplifiedColors = Boolean(rawSimplified)

  const rawSinglePage = site.singlePageSite ?? paletteRecord.singlePageSite ?? motifConfig?.singlePageSite
  if (rawSinglePage !== undefined) {
    websiteData.singlePageSite = Boolean(rawSinglePage)
  } else {
    websiteData.singlePageSite = true
  }

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
    date: item.date ?? '',
    startTime: item.startTime ?? '',
    endTime: item.endTime ?? '',
    isAllDay: Boolean(item.isAllDay),
  }))

  const rawDiy = (site.diyComponents && site.diyComponents.length > 0)
    ? site.diyComponents
    : (motifConfig?.diyComponents ?? [])

  diyComponents.value = rawDiy.map((c, i) => ({
    id: c.id || `diy-${Date.now() + i}`,
    name: c.name || 'Custom',
    header: c.header || 'Custom Header',
    description: c.content || c.description || '',
  }))

  selectedComponents.value = [...(site.enabledComponents ?? [])]
  isLive.value = Boolean(site.isPublished)

  if (ctx.customWeddingPartyMembers) {
    const rawParty = site.weddingParty || motifConfig?.weddingParty || []
    if (rawParty.length > 0) {
      ctx.customWeddingPartyMembers.value = rawParty.map((m, i) => ({
        id: m.id || `wp-${Date.now() + i}`,
        name: m.name || '',
        role: m.role || 'Wedding Party',
        notes: m.notes || '',
      }))
    }
  }
  if (ctx.weddingPartyIntro && motifConfig?.weddingPartyIntro) {
    ctx.weddingPartyIntro.value = motifConfig.weddingPartyIntro
  }
  if (ctx.whereToStayAccommodations) {
    const rawAccs = site.whereToStay?.accommodations || motifConfig?.whereToStay?.accommodations || []
    if (rawAccs.length > 0) {
      ctx.whereToStayAccommodations.value = rawAccs.slice(0, 4).map((a, i) => ({
        id: a.id || `acc-${Date.now() + i}`,
        name: a.name || '',
        rating: a.rating || '',
        distance: a.distance || '',
        description: a.description || '',
        link: a.link || '',
        image: a.image || '',
      }))
    }
  }
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
