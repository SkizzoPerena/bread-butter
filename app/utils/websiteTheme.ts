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
  { name: 'Cabernet', colors: { primary: '#F2D0D9', secondary: '#D4AF37', text_color: '#641E24', secondary_text_color: '#3B1015' } },
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

export function isDarkColor(hex?: string | null): boolean {
  if (!hex || typeof hex !== 'string') return false
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  }
  if (clean.length !== 6) return false
  const r = parseInt(clean.substring(0, 2), 16) / 255
  const g = parseInt(clean.substring(2, 4), 16) / 255
  const b = parseInt(clean.substring(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  return l < 0.55
}

export function formatHex(color?: string | null): string {
  if (!color || typeof color !== 'string') return ''
  let clean = color.trim()
  if (!clean.startsWith('#')) clean = `#${clean}`
  if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
    clean = `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`
  }
  return clean.toUpperCase()
}

export function extractCustomColors(
  stored?: unknown
): ColorPalette['colors'] | null {
  if (!stored) return null
  let obj: any = stored
  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj)
    } catch {
      return null
    }
  }
  if (!obj || typeof obj !== 'object') return null

  // Unwrap nested .colors or .customColors if present
  if (obj.colors && typeof obj.colors === 'object') {
    obj = { ...obj, ...obj.colors }
  }
  if (obj.customColors && typeof obj.customColors === 'object') {
    obj = { ...obj, ...obj.customColors }
  }

  const primaryRaw = (obj.primary || obj.background) as string | undefined
  const secondaryRaw = (obj.secondary || obj.surface) as string | undefined
  const textColorRaw = (obj.text_color || obj.textColor || obj.text || obj.heading) as string | undefined
  const secondaryTextColorRaw = (obj.secondary_text_color || obj.secondaryTextColor || obj.secondary_text) as string | undefined

  if (primaryRaw && secondaryRaw) {
    const primary = formatHex(primaryRaw)
    const secondary = formatHex(secondaryRaw)
    const text_color = formatHex(textColorRaw) || (isDarkColor(primary) ? '#FDFBF7' : '#1A1A1A')
    const secondary_text_color =
      formatHex(secondaryTextColorRaw) || (isDarkColor(secondary) ? '#FDFBF7' : '#1A1A1A')

    return {
      primary,
      secondary,
      text_color,
      secondary_text_color,
    }
  }

  return null
}

export function resolvePaletteFromRecord(
  paletteName?: string | null,
  stored?: unknown
): ColorPalette {
  const custom = extractCustomColors(stored)
  if (custom) {
    return {
      name: paletteName || 'Custom',
      colors: custom,
    }
  }

  if (paletteName && paletteName !== 'Custom') {
    const preset = colorPalettes.find((palette) => palette.name === paletteName)
    if (preset) return preset
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


export function getGoogleMapsUrl(
  location: string,
  coordinates?: { lat?: number | null; lng?: number | null } | null
): string {
  if (
    coordinates &&
    typeof coordinates.lat === 'number' &&
    typeof coordinates.lng === 'number' &&
    !isNaN(coordinates.lat) &&
    !isNaN(coordinates.lng)
  ) {
    return `https://maps.google.com/maps?q=${coordinates.lat},${coordinates.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`
  }
  if (!location) return ''
  return `https://maps.google.com/maps?q=hotels+near+${encodeURIComponent(location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`
}
