import type { PublicCustomSiteRecord } from '~/types/customSite'
import aisleImage from '~/assets/bpb-images/login-aisle.webp'
import {
  extractCustomColors,
  resolvePaletteFromRecord,
  resolveTypography,
  type ColorPalette,
  type TypographySet,
} from '~/utils/websiteTheme'
import { parseMotifConfig } from '~/utils/customSiteForm'

export interface CustomSiteDiyComponent {
  id: string
  name: string
  header: string
  description: string
}

export interface CustomSiteViewModel {
  format: string
  siteTitle: string
  siteDescription: string
  headerImage: string
  endingTitle: string
  endingMessage: string
  whereToStayLocation: string
  whereToStayLatitude?: number | null
  whereToStayLongitude?: number | null
  rsvpDeadlineDate: string
  palette: ColorPalette
  typography: TypographySet
  headingContent: string
  paragraphContent: string
  tidbits: { heading: string; paragraph: string }[]
  scheduleItems: {
    title: string
    description: string
    location: string
    date?: string
    startTime?: string
    endTime?: string
    isAllDay?: boolean
  }[]
  selectedComponents: string[]
  diyComponents: CustomSiteDiyComponent[]
  invertColors: boolean
  simplifiedColors: boolean
  singlePageSite: boolean
  weddingPartyIntro?: string
  weddingPartyMembers?: { id: string; name: string; role: string; notes?: string }[]
  whereToStayAccommodations?: { id?: string; name: string; rating?: string; distance?: string; description?: string; link?: string; image?: string }[]
}

function parseJsonIfString(value: unknown): any {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return value
}

function paletteRecordFromSite(
  site: PublicCustomSiteRecord
): Record<string, unknown> | null {
  const palette = parseJsonIfString(site.colorPalette)
  if (!palette || typeof palette !== 'object') {
    return null
  }
  return palette as Record<string, unknown>
}

export function customSiteToViewModel(site: PublicCustomSiteRecord): CustomSiteViewModel {
  const heading = site.contentSections?.find((section) => section.type === 'heading')
  const paragraph = site.contentSections?.find((section) => section.type === 'paragraph')
  const typographyName = site.typography?.name || site.fontFamily
  const motifConfig = parseMotifConfig(site.motif)
  const parsedPalette = paletteRecordFromSite(site) || {}
  const rawInvert = site.invertColors ?? parsedPalette.invertColors ?? motifConfig?.invertColors
  const invertColors = Boolean(rawInvert)

  const rawSimplified = site.simplifiedColors ?? parsedPalette.simplifiedColors ?? motifConfig?.simplifiedColors
  const simplifiedColors = Boolean(rawSimplified)

  const rawSinglePage = site.singlePageSite ?? parsedPalette.singlePageSite ?? motifConfig?.singlePageSite
  const singlePageSite = rawSinglePage !== undefined ? Boolean(rawSinglePage) : true

  const rawDiy = (site.diyComponents && site.diyComponents.length > 0)
    ? site.diyComponents
    : (motifConfig?.diyComponents ?? [])

  const diyComponents: CustomSiteDiyComponent[] = rawDiy.map((c, i: number) => ({
    id: String(c.id || `diy-${i}`),
    name: String(c.name || 'Custom'),
    header: String(c.header || 'Custom Header'),
    description: String(c.content || c.description || ''),
  }))

  const colorSource =
    extractCustomColors(site.colorPalette) ||
    extractCustomColors(parsedPalette) ||
    extractCustomColors(motifConfig?.customColors) ||
    extractCustomColors(motifConfig) ||
    null

  const paletteName = motifConfig?.colorPaletteName || site.colorPaletteName

  return {
    format: site.templateType || 'format1',
    siteTitle: site.title,
    siteDescription: site.subtitle,
    headerImage: site.headerImageURL || aisleImage,
    endingTitle: site.closing?.title || 'Hope to see you there!',
    endingMessage:
      site.closing?.message ||
      'We cannot wait to celebrate this special day with all of our favorite people.',
    whereToStayLocation: site.whereToStay?.location || '',
    whereToStayLatitude: site.whereToStay?.latitude ?? motifConfig?.whereToStay?.latitude ?? null,
    whereToStayLongitude: site.whereToStay?.longitude ?? motifConfig?.whereToStay?.longitude ?? null,
    rsvpDeadlineDate: '',
    palette: colorSource
      ? {
          name: paletteName || 'Custom',
          colors: colorSource,
        }
      : resolvePaletteFromRecord(
          paletteName,
          parsedPalette || motifConfig?.customColors
        ),
    typography: site.typography?.headerFont
      ? {
          name: typographyName || 'Romantic Script',
          headerFont: site.typography.headerFont || 'Parisienne',
          subheaderFont: site.typography.subheaderFont || 'Gambetta',
          bodyFont: site.typography.bodyFont || 'Satoshi',
        }
      : resolveTypography(typographyName),
    headingContent: heading?.content || '',
    paragraphContent: paragraph?.content || '',
    tidbits: (site.tidbits ?? []).map((tidbit) => ({
      heading: tidbit.title,
      paragraph: tidbit.content,
    })),
    scheduleItems: (site.schedule ?? []).map((item) => ({
      title: item.title,
      description: item.description,
      location: item.location ?? '',
      date: item.date ?? '',
      startTime: item.startTime ?? '',
      endTime: item.endTime ?? '',
      isAllDay: Boolean(item.isAllDay),
    })),
    selectedComponents: [...(site.enabledComponents ?? [])],
    diyComponents,
    invertColors,
    simplifiedColors,
    singlePageSite,
    weddingPartyIntro: motifConfig?.weddingPartyIntro || '',
    weddingPartyMembers: (site.weddingParty && site.weddingParty.length > 0)
      ? site.weddingParty.map((m, i) => ({
          id: m.id || `wp-${i}`,
          name: m.name || '',
          role: m.role || 'Wedding Party',
          notes: m.notes || '',
        }))
      : (motifConfig?.weddingParty || []),
    whereToStayAccommodations: (site.whereToStay?.accommodations && site.whereToStay.accommodations.length > 0)
      ? site.whereToStay.accommodations.map((a, i) => ({
          id: a.id || `acc-${i}`,
          name: a.name || '',
          rating: a.rating || '',
          distance: a.distance || '',
          description: a.description || '',
          link: a.link || '',
          image: a.image || '',
        }))
      : (motifConfig?.whereToStay?.accommodations || []),
  }
}
