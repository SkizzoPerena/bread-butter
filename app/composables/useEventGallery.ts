import type { GalleryLayoutSuggestion, GalleryPhoto, GalleryRecord } from '~/types/gallery'

export const defaultGallerySuggestions: GalleryLayoutSuggestion[] = [
  {
    id: 'grid',
    name: 'Modern Grid',
    tagline: 'Clean & Balanced',
    icon: 'i-lucide-grid-2x2',
    description: 'Crisp uniform cards with elegant hover zoom and overlay captions.',
    previewCols: 3,
  },
  {
    id: 'masonry',
    name: 'Editorial Masonry',
    tagline: 'Dynamic & Organic',
    icon: 'i-lucide-layout-grid',
    description: 'Staggered natural heights creating a high-fashion magazine layout.',
    previewCols: 3,
  },
  {
    id: 'collage',
    name: 'Hero Spotlight',
    tagline: 'Featured Focal Point',
    icon: 'i-lucide-panel-left',
    description: 'One prominent hero photograph complemented by adjacent candid moments.',
    previewCols: 3,
  },
  {
    id: 'filmstrip',
    name: 'Filmstrip Carousel',
    tagline: 'Smooth Horizontal Flow',
    icon: 'i-lucide-film',
    description: 'Horizontal scroll cards with snap physics and caption badges.',
    previewCols: 4,
  },
  {
    id: 'polaroid',
    name: 'Polaroid Keepsakes',
    tagline: 'Nostalgic & Playful',
    icon: 'i-lucide-image',
    description: 'Tilted white border cards with handwritten notes and subtle shadows.',
    previewCols: 3,
  },
]

export const sampleGalleryPhotos: GalleryPhoto[] = [
  {
    id: 'sample-1',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    caption: 'Golden hour walk by the olive groves',
    alt: 'Couple holding hands during golden hour',
    name: 'Sunset Walk',
    aspectRatio: 'landscape',
  },
  {
    id: 'sample-2',
    url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80',
    caption: 'Our private vows under the canopy',
    alt: 'Bride and groom whispering vows',
    name: 'Private Vows',
    aspectRatio: 'portrait',
  },
  {
    id: 'sample-3',
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=80',
    caption: 'First dance to our favorite melody',
    alt: 'Couple first dance under fairy lights',
    name: 'First Dance',
    aspectRatio: 'square',
  },
  {
    id: 'sample-4',
    url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=800&q=80',
    caption: 'Laughing through the floral confetti',
    alt: 'Confetti toss joy',
    name: 'Confetti Moments',
    aspectRatio: 'portrait',
  },
  {
    id: 'sample-5',
    url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80',
    caption: 'Quiet breakfast the morning after the proposal',
    alt: 'Cozy morning coffee together',
    name: 'Proposal Morning',
    aspectRatio: 'landscape',
  },
  {
    id: 'sample-6',
    url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=800&q=80',
    caption: 'To love, laughter, and happily ever after',
    alt: 'Rings and champagne toast',
    name: 'Champagne Toast',
    aspectRatio: 'portrait',
  },
]

export const defaultGalleryRecord: GalleryRecord = {
  title: 'Captured Moments',
  subtitle: 'A glimpse into our favorite memories and love story.',
  layout: 'grid',
  columns: 3,
  photos: [...sampleGalleryPhotos],
  enableLightbox: true,
}

const STORAGE_PREFIX = 'bread_gallery_'

interface GalleryResponse {
  success?: boolean
  gallery?: GalleryRecord | null
}

export function useEventGallery() {
  const { apiRequest, isUiOnlyMode } = useApiMode()

  function getLocalGallery(eventId: string): GalleryRecord | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${eventId}`)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          return {
            title: parsed.title || defaultGalleryRecord.title,
            subtitle: parsed.subtitle !== undefined ? parsed.subtitle : defaultGalleryRecord.subtitle,
            layout: parsed.layout || defaultGalleryRecord.layout,
            columns: parsed.columns || defaultGalleryRecord.columns,
            photos: Array.isArray(parsed.photos) && parsed.photos.length > 0 ? parsed.photos : [...defaultGalleryRecord.photos],
            enableLightbox: parsed.enableLightbox !== false,
          }
        }
      }
    } catch {
      // ignore
    }
    return null
  }

  function setLocalGallery(eventId: string, data: GalleryRecord): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${eventId}`, JSON.stringify(data))
    } catch {
      // ignore
    }
  }

  function normalizeGallery(gallery: GalleryRecord): GalleryRecord {
    return {
      title: gallery.title || defaultGalleryRecord.title,
      subtitle: gallery.subtitle !== undefined ? gallery.subtitle : defaultGalleryRecord.subtitle,
      layout: gallery.layout || defaultGalleryRecord.layout,
      columns: gallery.columns || defaultGalleryRecord.columns,
      photos: Array.isArray(gallery.photos) ? gallery.photos : [],
      enableLightbox: gallery.enableLightbox !== false,
    }
  }

  async function fetchGallery(eventId: string): Promise<GalleryRecord> {
    if (isUiOnlyMode.value || !eventId || eventId === 'mock-event-id') {
      return getLocalGallery(eventId) || { ...defaultGalleryRecord, photos: [...sampleGalleryPhotos] }
    }

    const response = await apiRequest<GalleryResponse>(`/user/events/${eventId}/gallery`)
    if (response?.gallery) {
      const gallery = normalizeGallery(response.gallery)
      setLocalGallery(eventId, gallery)
      return gallery
    }

    return { ...defaultGalleryRecord, photos: [...sampleGalleryPhotos] }
  }

  async function saveGallery(eventId: string, data: GalleryRecord): Promise<boolean> {
    const gallery = normalizeGallery(data)
    if (isUiOnlyMode.value || !eventId || eventId === 'mock-event-id') {
      setLocalGallery(eventId, gallery)
      return true
    }

    const response = await apiRequest<GalleryResponse>(`/user/events/${eventId}/gallery`, {
      method: 'PUT',
      body: gallery,
    })
    if (!response?.gallery) {
      throw new Error('Could not save gallery.')
    }
    setLocalGallery(eventId, normalizeGallery(response.gallery))
    return true
  }

  function swapPhotos(photos: GalleryPhoto[], fromIndex: number, toIndex: number): GalleryPhoto[] {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= photos.length || toIndex >= photos.length) {
      return photos
    }
    const updated = [...photos]
    const dragged = updated.splice(fromIndex, 1)[0]
    if (!dragged) return photos
    updated.splice(toIndex, 0, dragged)
    return updated
  }

  return {
    defaultGalleryRecord,
    defaultGallerySuggestions,
    sampleGalleryPhotos,
    fetchGallery,
    saveGallery,
    getLocalGallery,
    setLocalGallery,
    swapPhotos,
  }
}
