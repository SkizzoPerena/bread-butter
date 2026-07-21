export interface ColorPalette {
  name: string
  colors: {
    primary: string
    secondary: string
    text_color: string
    secondary_text_color: string
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
  { name: 'Gilded Flora', colors: { primary: '#FDFBF7', secondary: '#D4AF37', text_color: '#9CA986', secondary_text_color: '#3A4A29' } },
  { name: 'Sirocco', colors: { primary: '#FBF6EB', secondary: '#F4C7AB', text_color: '#C25934', secondary_text_color: '#5C2816' } },
  { name: 'Maritime', colors: { primary: '#BDDDFC', secondary: '#88BDF2', text_color: '#112236', secondary_text_color: '#2A3A4A' } },
  { name: 'Aura', colors: { primary: '#F2E3D5', secondary: '#F2D0D9', text_color: '#B76E79', secondary_text_color: '#4A232D' } },
  { name: 'Deco', colors: { primary: '#FFFFFF', secondary: '#1A1A1A', text_color: '#1C543A', secondary_text_color: '#F0F5F1' } },
  { name: 'Nocturne', colors: { primary: '#BFA2B8', secondary: '#D4AF37', text_color: '#5A3143', secondary_text_color: '#2C1621' } },
  { name: 'Cabernet', colors: { primary: '#F2D0D9', secondary: '#D4AF37', text_color: '#641E24', secondary_text_color: '#3B1015' } },
  { name: 'Retrograde', colors: { primary: '#DDA74F', secondary: '#A84724', text_color: '#112236', secondary_text_color: '#F4E1C1' } },
  { name: 'Zest', colors: { primary: '#FFFFFF', secondary: '#F9F1C7', text_color: '#B5C135', secondary_text_color: '#2B330C' } },
  { name: 'Monolith', colors: { primary: '#FFFFFF', secondary: '#E6DFD3', text_color: '#1A1A1A', secondary_text_color: '#3B3631' } },
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
  if (stored && stored.primary && stored.secondary && stored.text_color && stored.secondary_text_color) {
    return {
      name: paletteName || 'Custom',
      colors: {
        primary: stored.primary,
        secondary: stored.secondary,
        text_color: stored.text_color,
        secondary_text_color: stored.secondary_text_color,
      },
    }
  }
  return resolvePalette(paletteName)
}

export function getDynamicStyle(
  index: number,
  colors: ColorPalette['colors'],
  invert: boolean = false,
  simplified: boolean = false
): { bg: string; heading: string; text: string } {
  let { primary, secondary, text_color, secondary_text_color } = colors;

  if (invert) {
    [primary, text_color] = [text_color, primary];
    [secondary, secondary_text_color] = [secondary_text_color, secondary];
  }

  if (simplified) {
    const cycle = index % 2;
    if (cycle === 1) {
      return { bg: primary, heading: text_color, text: text_color };
    }
    return { bg: primary, heading: text_color, text: text_color };
  }

  const cycle = index % 2 // Cycle between 0 and 1 for primary/secondary backgrounds
  if (cycle === 1) {
    return { bg: primary, heading: text_color, text: text_color };
  }
  return { bg: secondary, heading: secondary_text_color, text: secondary_text_color };
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
