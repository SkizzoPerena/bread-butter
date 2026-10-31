export type DressCodeMode = 'prompt' | 'upload' | 'palette'

export type AttireFormality =
  | 'Black Tie'
  | 'Black Tie Optional'
  | 'Formal / Black Tie Optional'
  | 'Cocktail Attire'
  | 'Semi-Formal / Garden Formal'
  | 'Beach Formal'
  | 'Philippine Formal (Barong & Filipiniana)'
  | 'Casual / Smart Casual'
  | 'Custom'

export interface UploadedDressCodeImage {
  id: string
  name: string
  size: number
  dataUrl: string
  tag: 'Moodboard' | 'Color Swatches' | 'Bride & Groom' | 'Entourage' | 'Guests' | 'Inspiration'
  uploadedAt: string
}

export interface DressCodePaletteColors {
  primary: string
  secondary: string
  accent: string
  neutral: string
}

export type PaletteDisplayType = 'image' | 'editor' | 'both'

export interface DressCodeRecord {
  _id?: string
  event: string
  mode: DressCodeMode
  hasPreMadeColor: boolean | null
  paletteType?: PaletteDisplayType
  paletteImage?: string | null
  presetPaletteName: string
  invertColors: boolean
  colors: DressCodePaletteColors
  formality: AttireFormality
  guestNotes: string
  menAttire: string
  womenAttire: string
  avoidColors: string
  images: UploadedDressCodeImage[]
  isPublished?: boolean
  updatedAt?: string
}

export interface DressCodeResponse {
  success: boolean
  status: number
  message?: string
  dressCode: DressCodeRecord
}
