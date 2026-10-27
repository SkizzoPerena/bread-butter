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

export function useDressCode() {
  const { apiRequest, executeAction } = useApiMode()
  const isLoading = ref(false)
  const isSaving = ref(false)

  async function fetchDressCode(eventId: string): Promise<DressCodeRecord> {
    isLoading.value = true
    try {
      const result = await executeAction<{ success: boolean; status: number; dressCode?: DressCodeRecord }>({
        api: async () => {
          try {
            return await apiRequest<DressCodeResponse>(`/user/events/${eventId}/dress-code`)
          } catch {
            return {
              success: true,
              status: 200,
              dressCode: getLocalDressCode(eventId),
            }
          }
        },
        uiOnly: () => ({
          success: true,
          status: 200,
          dressCode: getLocalDressCode(eventId),
        }),
      })

      if (result?.dressCode) {
        setLocalDressCode(eventId, result.dressCode)
        return result.dressCode
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

      await executeAction({
        api: async () => {
          try {
            await apiRequest<DressCodeResponse>(`/user/events/${eventId}/dress-code`, {
              method: 'PUT',
              body: merged,
            })
          } catch (err) {
            console.warn('[useDressCode] Backend endpoint not available, falling back to local persistence', err)
          }
          return { success: true, status: 200, dressCode: merged }
        },
        uiOnly: () => ({
          success: true,
          status: 200,
          dressCode: merged,
        }),
      })

      setLocalDressCode(eventId, merged)
      return merged
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
