export interface ColorPalette {
  name: string
  colors: {
    background: string
    surface: string
    primary: string
    text: string
    heading: string
  }
}

export interface TypographySet {
  name: string
  headerFont: string
  subheaderFont: string
  bodyFont: string
  description?: string
}

export const colorPalettes: ColorPalette[] = [
  { name: 'Classic Ivory & Gold', colors: { background: '#F8F7F2', surface: '#F2E8D5', primary: '#D4AF37', heading: '#B8977B', text: '#8E8A83' } },
  { name: 'Sage Green Romance', colors: { background: '#EEF2EC', surface: '#C7D9C1', primary: '#8EAF92', heading: '#5E7F64', text: '#3E5B49' } },
  { name: 'Blush & Mauve', colors: { background: '#FBE7EA', surface: '#F4C7D4', primary: '#D48BA0', heading: '#A46A7A', text: '#6E5160' } },
  { name: 'Navy & Champagne', colors: { background: '#F6F3EE', surface: '#E7D7B5', primary: '#C8A972', heading: '#1E2A44', text: '#0D1B2A' } },
  { name: 'Modern Black Tie', colors: { background: '#FFFFFF', surface: '#EDEDED', primary: '#BFA076', heading: '#333333', text: '#0A0A0A' } },
  { name: 'Dusty Blue Serenity', colors: { background: '#E6EEF6', surface: '#BFD1E1', primary: '#8FA7BF', heading: '#617D9B', text: '#3F5B70' } },
  { name: 'Terracotta & Olive', colors: { background: '#F6F1E9', surface: '#A3A078', primary: '#E07A5F', heading: '#C85C3D', text: '#6E7A5E' } },
  { name: 'Lavender & Silver', colors: { background: '#EDECEF', surface: '#E7E1F5', primary: '#C8BCE8', heading: '#A89FD1', text: '#8F8AA8' } },
  { name: 'Emerald & Gold', colors: { background: '#F7F5F0', surface: '#EBDCC0', primary: '#D4AF37', heading: '#0F7A5A', text: '#064E3B' } },
  { name: 'Rustic Burnt Orange', colors: { background: '#F5EFE6', surface: '#DCC8B0', primary: '#E09A5A', heading: '#B5522D', text: '#7D7050' } },
  { name: 'Teal & Cream', colors: { background: '#FAF7F2', surface: '#F6E9D6', primary: '#BEE3DB', heading: '#41B3A3', text: '#0D9488' } },
  { name: 'Plum & Blush', colors: { background: '#FAF4F6', surface: '#F2D9DC', primary: '#C38CA8', heading: '#7D4A7D', text: '#4B2E4D' } },
  { name: 'Sand & Mocha', colors: { background: '#F5EFE6', surface: '#E1D2BE', primary: '#B18E6B', heading: '#7A5B45', text: '#4B3B31' } },
  { name: 'Coral & Peach', colors: { background: '#F6F7F2', surface: '#FFDCC8', primary: '#FFB6A1', heading: '#A8C5A1', text: '#FF7F6A' } },
  { name: 'Sky Blue & Stone', colors: { background: '#F3F2EF', surface: '#D7E7F2', primary: '#A8C5D8', heading: '#A4AAAA', text: '#7EA1B7' } },
  { name: 'Forest Green & Blush', colors: { background: '#FAF8F5', surface: '#EEE3D7', primary: '#D8B4BB', heading: '#47664B', text: '#1F3D2E' } },
  { name: 'Mustard & Navy', colors: { background: '#F7F6F2', surface: '#F2C94C', primary: '#DAA520', heading: '#7D8B9D', text: '#1E2A44' } },
  { name: 'Burgundy & Gold', colors: { background: '#FBF9F6', surface: '#F1E4C3', primary: '#D4AF37', heading: '#9E1B32', text: '#6D0F1A' } },
  { name: 'Charcoal & Sage', colors: { background: '#F5F4F1', surface: '#D9DCCB', primary: '#A3B18A', heading: '#6B7170', text: '#2F3437' } },
  { name: 'Peacock Blue & Copper', colors: { background: '#F9F6F2', surface: '#F6D5B8', primary: '#B87333', heading: '#0A9396', text: '#005F73' } },
]

export const typographySets: TypographySet[] = [
  { name: 'Romantic Script', headerFont: 'Parisienne', subheaderFont: 'Gambetta', bodyFont: 'Satoshi' },
  { name: 'Casual Script', headerFont: 'Engagement', subheaderFont: 'Sentient', bodyFont: 'Switzer' },
  { name: 'Whimsical Script', headerFont: 'Great Vibes', subheaderFont: 'Quicksand', bodyFont: 'Outfit' },
  { name: 'Elegant Serif', headerFont: 'Boska', subheaderFont: 'Rowan', bodyFont: 'General Sans' },
  { name: 'Bold & Expressive', headerFont: 'Melodrama', subheaderFont: 'Satoshi', bodyFont: 'Amulya' },
  { name: 'Modern Sans', headerFont: 'Clash Display', subheaderFont: 'Bespoke Sans', bodyFont: 'Switzer' },
]

export function resolvePalette(paletteName?: string | null): ColorPalette {
  return colorPalettes.find((palette) => palette.name === paletteName) || colorPalettes[0]!
}

export function resolveTypography(typographyName?: string | null): TypographySet {
  return typographySets.find((set) => set.name === typographyName) || typographySets[0]!
}

export function resolvePaletteFromRecord(
  paletteName?: string | null,
  stored?: Record<string, string> | null
): ColorPalette {
  if (stored && stored.background && stored.text && stored.heading) {
    return {
      name: paletteName || 'Custom',
      colors: {
        background: stored.background,
        surface: stored.surface || stored.background,
        primary: stored.primary || stored.heading,
        text: stored.text,
        heading: stored.heading,
      },
    }
  }
  return resolvePalette(paletteName)
}

export function getDynamicStyle(
  index: number,
  colors: ColorPalette['colors']
): { bg: string; heading: string; text: string } {
  const cycle = ((index % 3) + 3) % 3
  if (cycle === 0) {
    return { bg: colors.surface, heading: colors.heading, text: colors.text }
  }
  if (cycle === 1) {
    return { bg: colors.text, heading: colors.background, text: colors.background }
  }
  return { bg: 'transparent', heading: colors.heading, text: colors.text }
}

export function formatDateWithWeekday(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString.replace(/-/g, '/'))
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function getGoogleMapsUrl(location: string): string {
  if (!location) return ''
  return `https://maps.google.com/maps?q=hotels+near+${encodeURIComponent(location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`
}
