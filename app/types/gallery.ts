export type GalleryLayout = 'grid' | 'masonry' | 'collage' | 'filmstrip' | 'polaroid'

export interface GalleryPhoto {
  id: string
  url: string
  caption?: string
  alt?: string
  name?: string
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'wide'
}

export interface GalleryRecord {
  title: string
  subtitle?: string
  layout: GalleryLayout
  columns: 2 | 3 | 4
  photos: GalleryPhoto[]
  enableLightbox?: boolean
}

export interface GalleryLayoutSuggestion {
  id: GalleryLayout
  name: string
  tagline: string
  icon: string
  description: string
  previewCols: number
}
