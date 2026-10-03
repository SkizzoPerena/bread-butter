import { defineEventHandler, getQuery } from 'h3'

export interface GeocodeResult {
  displayName: string
  name: string
  lat: number
  lng: number
  address?: string
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  if (!q) {
    return { results: [] }
  }

  // 1. Direct Coordinates pattern: "14.1153, 120.9621" or "14.1153 120.9621"
  const coordMatch = q.match(/^(-?\d{1,3}(\.\d+)?)\s*[, ]\s*(-?\d{1,3}(\.\d+)?)$/)
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]!)
    const lng = parseFloat(coordMatch[3]!)
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        results: [
          {
            name: `Coordinates (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
            displayName: `Latitude: ${lat.toFixed(6)}, Longitude: ${lng.toFixed(6)}`,
            lat,
            lng,
            address: `Exact Coordinates (${lat.toFixed(6)}, ${lng.toFixed(6)})`
          }
        ]
      }
    }
  }

  // 2. Google Maps URL patterns (e.g. maps.google.com/?q=lat,lng or @lat,lng)
  const gmapMatch = q.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || q.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (gmapMatch) {
    const lat = parseFloat(gmapMatch[1]!)
    const lng = parseFloat(gmapMatch[2]!)
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        results: [
          {
            name: 'Google Maps Pinned Location',
            displayName: `Pinned Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
            lat,
            lng,
            address: `Location from Google Maps URL`
          }
        ]
      }
    }
  }

  // 3. Official Google Maps Geocoding API if key is present
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (apiKey) {
    try {
      const gRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${apiKey}`
      )
      const gData = await gRes.json()
      if (gData.status === 'OK' && Array.isArray(gData.results) && gData.results.length > 0) {
        const results: GeocodeResult[] = gData.results.map((r: any) => ({
          name: r.address_components?.[0]?.long_name || r.formatted_address,
          displayName: r.formatted_address,
          lat: r.geometry.location.lat,
          lng: r.geometry.location.lng,
          address: r.formatted_address
        }))
        return { results }
      }
    } catch (e) {
      console.warn('[Geocode] Google Geocoding API failed, falling back:', e)
    }
  }

  // 4. Primary fast geocoding fallback (Photon)
  try {
    const photonRes = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`
    )
    const photonData = await photonRes.json()
    if (photonData.features && photonData.features.length > 0) {
      const results: GeocodeResult[] = photonData.features.map((f: any) => {
        const props = f.properties || {}
        const [lng, lat] = f.geometry?.coordinates || [0, 0]
        const name = props.name || props.street || q
        const parts = [
          props.street,
          props.district,
          props.city,
          props.state,
          props.country
        ].filter(Boolean)
        const displayName = [name, ...parts.filter((p: string) => p !== name)].join(', ')
        return {
          name,
          displayName,
          lat,
          lng,
          address: parts.join(', ')
        }
      })
      return { results }
    }
  } catch (e) {
    console.warn('[Geocode] Photon geocoder failed, trying Nominatim fallback:', e)
  }

  // 5. Secondary fallback (Nominatim)
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
      { headers: { 'User-Agent': 'BreadAndButter-WeddingPlatform/1.0' } }
    )
    const nomData = await nomRes.json()
    if (Array.isArray(nomData) && nomData.length > 0) {
      const results: GeocodeResult[] = nomData.map((item: any) => ({
        name: item.name || item.display_name?.split(',')[0] || q,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.display_name
      }))
      return { results }
    }
  } catch (e) {
    console.error('[Geocode] Nominatim geocoder failed:', e)
  }

  return { results: [] }
})
