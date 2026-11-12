/**
 * Hotel search and venue lookup for the Website Maker.
 * Both run on the backend, which holds the Google key and requires login.
 */

export interface PlaceSearchResult {
  id: string
  name: string
  address: string
  rating: string
  reviewsCount: string
  distance: string
  distanceKm: number
  description: string
  link: string
}

export interface HotelSearchResponse {
  success: boolean
  source: 'google-places' | 'openstreetmap' | null
  radiusKm: number
  count: number
  results: PlaceSearchResult[]
  message?: string
}

export interface GeocodeResult {
  name: string
  displayName: string
  lat: number
  lng: number
  address?: string
}

export interface HotelSearchParams {
  q?: string
  city?: string
  lat?: number | null
  lng?: number | null
}

export function usePlaces() {
  const { apiRequest, isUiOnlyMode } = useApiMode()

  async function searchHotels(params: HotelSearchParams): Promise<HotelSearchResponse> {
    if (isUiOnlyMode.value) {
      return { success: true, source: null, radiusKm: 30, count: 0, results: [] }
    }
    const query: Record<string, string | number> = {}
    if (params.q?.trim()) query.q = params.q.trim()
    if (params.city?.trim()) query.city = params.city.trim()
    if (params.lat != null && params.lng != null) {
      query.lat = params.lat
      query.lng = params.lng
    }
    return apiRequest<HotelSearchResponse>('/user/places/hotels', { query })
  }

  async function geocode(q: string): Promise<GeocodeResult[]> {
    if (isUiOnlyMode.value || !q.trim()) return []
    const response = await apiRequest<{ results?: GeocodeResult[] }>('/user/places/geocode', {
      query: { q: q.trim() },
    })
    return response?.results ?? []
  }

  return { searchHotels, geocode }
}
