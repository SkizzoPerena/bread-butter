import type { PublicCustomSiteRecord } from '~/types/customSite'
import aisleImage from '~/assets/bpb-images/login-aisle.jpg'
import {
  resolvePaletteFromRecord,
  resolveTypography,
  type ColorPalette,
  type TypographySet,
} from '~/utils/websiteTheme'

export interface CustomSiteViewModel {
  format: string
  siteTitle: string
  siteDescription: string
  headerImage: string
  endingTitle: string
  endingMessage: string
  whereToStayLocation: string
  rsvpDeadlineDate: string
  palette: ColorPalette
  typography: TypographySet
  headingContent: string
  paragraphContent: string
  tidbits: { heading: string; paragraph: string }[]
  scheduleItems: { title: string; description: string; location: string }[]
  selectedComponents: string[]
}

function paletteRecordFromSite(
  site: PublicCustomSiteRecord
): Record<string, string> | null {
  const palette = site.colorPalette
  if (!palette || typeof palette !== 'object') {
    return null
  }
  return palette as Record<string, string>
}

export function customSiteToViewModel(site: PublicCustomSiteRecord): CustomSiteViewModel {
  const heading = site.contentSections?.find((section) => section.type === 'heading')
  const paragraph = site.contentSections?.find((section) => section.type === 'paragraph')
  const typographyName = site.typography?.name || site.fontFamily

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
    rsvpDeadlineDate: '',
    palette: resolvePaletteFromRecord(site.colorPaletteName, paletteRecordFromSite(site)),
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
    })),
    selectedComponents: [...(site.enabledComponents ?? [])],
  }
}
