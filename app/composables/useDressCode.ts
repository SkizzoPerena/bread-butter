import { ref } from 'vue'
import type { DressCodeRecord, DressCodeResponse } from '~/types/dressCode'

export const defaultDressCodeData: Omit<DressCodeRecord, 'event'> = {
  mode: 'prompt',
  hasPreMadeColor: null,
  paletteType: 'editor',
  paletteImage: null,
  presetPaletteName: 'Gilded Flora',
  invertColors: false,
  colors: {
    primary: '#FDFBF7',
    secondary: '#D4AF37',
    accent: '#9CA986',
    neutral: '#3A4A29',
  },
  formality: 'Formal / Black Tie Optional',
  guestNotes: 'We request our honored guests dress in tones celebrating our color palette. Elegant suits, formal dresses, or modern Filipiniana / Barong are warmly encouraged.',
  menAttire: 'Dark suit, tuxedo, or Barong Tagalog with formal dress trousers and leather dress shoes.',
  womenAttire: 'Floor-length evening gown, tea-length dress, or chic formal attire complementing the palette.',
  avoidColors: 'Kindly refrain from wearing solid white, ivory, or champagne tones reserved for the bride.',
  images: [],
}

function getStorageKey(eventId: string): string {
  return `bb_dress_code_${eventId || 'mock'}`
}

export function getLocalDressCode(eventId: string): DressCodeRecord {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(getStorageKey(eventId))
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          ...defaultDressCodeData,
          ...parsed,
          event: eventId,
        }
      }
    } catch (err) {
      console.warn('[useDressCode] Failed to parse local dress code', err)
    }
  }
  return {
    ...defaultDressCodeData,
    event: eventId,
  }
}

export function setLocalDressCode(eventId: string, record: DressCodeRecord): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getStorageKey(eventId), JSON.stringify(record))
    } catch (err) {
      console.warn('[useDressCode] Failed to write local dress code', err)
    }
  }
}

function isNotFound(error: unknown): boolean {
  const err = error as { statusCode?: number; status?: number; response?: { status?: number } }
  const status = err?.statusCode ?? err?.status ?? err?.response?.status
  return status === 404
}

export function useDressCode() {
  const { apiRequest, isUiOnlyMode } = useApiMode()
  const isLoading = ref(false)
  const isSaving = ref(false)

  async function fetchDressCode(eventId: string): Promise<DressCodeRecord> {
    isLoading.value = true
    try {
      if (isUiOnlyMode.value) return getLocalDressCode(eventId)

      try {
        const result = await apiRequest<DressCodeResponse>(`/user/events/${eventId}/dress-code`)
        if (result?.dressCode) {
          setLocalDressCode(eventId, result.dressCode)
          return result.dressCode
        }
      } catch (error) {
        if (!isNotFound(error)) throw error
      }
      return getLocalDressCode(eventId)
    } finally {
      isLoading.value = false
    }
  }

  async function saveDressCode(eventId: string, payload: Partial<DressCodeRecord>): Promise<DressCodeRecord> {
    isSaving.value = true
    try {
      const current = getLocalDressCode(eventId)
      const merged: DressCodeRecord = {
        ...current,
        ...payload,
        event: eventId,
        updatedAt: new Date().toISOString(),
      }

      if (isUiOnlyMode.value) {
        setLocalDressCode(eventId, merged)
        return merged
      }

      const response = await apiRequest<DressCodeResponse>(`/user/events/${eventId}/dress-code`, {
        method: 'PUT',
        body: merged,
      })
      const saved: DressCodeRecord = response.dressCode
        ? { ...merged, ...response.dressCode, event: eventId }
        : merged
      setLocalDressCode(eventId, saved)
      return saved
    } finally {
      isSaving.value = false
    }
  }

  function resetDressCode(eventId: string): DressCodeRecord {
    const blank: DressCodeRecord = {
      ...defaultDressCodeData,
      event: eventId,
      mode: 'prompt',
      hasPreMadeColor: null,
      images: [],
    }
    setLocalDressCode(eventId, blank)
    return blank
  }

  return {
    isLoading,
    isSaving,
    fetchDressCode,
    saveDressCode,
    resetDressCode,
    getLocalDressCode,
    setLocalDressCode,
  }
}
