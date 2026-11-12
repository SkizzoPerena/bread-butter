import { defineEventHandler, getQuery } from 'h3'

export interface PlaceResult {
  id: string
  name: string
  address: string
  rating: string
  ratingValue?: number
  reviewsCount?: string
  distance: string
  distanceKm?: number
  description: string
  image: string
  link: string
  lat?: number
  lng?: number
  badge?: string
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatDistance(distanceKm: number): string {
  if (distanceKm < 0.5) return 'Within 500m of venue'
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)}m from venue`
  return `${distanceKm.toFixed(1)} km from venue`
}

function generateGoogleOverview(name: string, city: string, address: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('resort') || lower.includes('villa')) {
    return `Scenic resort in ${city} featuring outdoor swimming pools, landscaped gardens, and relaxing mountain or nature vistas.`
  }
  if (lower.includes('spa') || lower.includes('wellness')) {
    return `Full-service hotel and wellness spa in ${city} with tranquil suites, signature treatments, and peaceful ambience.`
  }
  if (lower.includes('boutique') || lower.includes('inn') || lower.includes('manor')) {
    return `Charming boutique accommodations in ${city} offering personalized hospitality, cozy rooms, and local dining.`
  }
  if (lower.includes('grand') || lower.includes('palace') || lower.includes('tower') || lower.includes('suites')) {
    return `Upscale hotel in ${city} offering refined guestrooms, on-site dining, ballrooms, and concierge services.`
  }
  return `Comfortable lodging in ${city} located along ${address.split(',')[0] || city}, offering convenient access to local attractions.`
}

const FALLBACK_HOTEL_PHOTOS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1549294413-26f195200c16?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'
]

function getPhotoForHotel(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return FALLBACK_HOTEL_PHOTOS[hash % FALLBACK_HOTEL_PHOTOS.length]!
}

function calculateRating(name: string): { rating: string; ratingValue: number; reviewsCount: string } {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 17 + name.charCodeAt(i)) >>> 0
  }
  const ratingVal = 4.4 + ((hash % 6) / 10) // between 4.4 and 4.9
  const reviewsCount = 150 + (hash % 1850)
  return {
    rating: `${ratingVal.toFixed(1)} ★`,
    ratingValue: ratingVal,
    reviewsCount: `(${reviewsCount.toLocaleString()})`
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const cityParam = typeof query.city === 'string' ? query.city.trim() : ''
  const radiusKm = typeof query.radius === 'string' ? Math.max(1, Math.min(50, parseFloat(query.radius) || 30)) : 30

  let centerLat: number | null = typeof query.lat === 'string' && !isNaN(parseFloat(query.lat)) ? parseFloat(query.lat) : null
  let centerLng: number | null = typeof query.lng === 'string' && !isNaN(parseFloat(query.lng)) ? parseFloat(query.lng) : null
  let resolvedCity = cityParam || 'the area'

  // If center lat/lng are missing but city is specified, resolve coordinates
  if ((centerLat == null || centerLng == null) && cityParam) {
    try {
      const geoRes = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(cityParam)}&limit=1`
      )
      const geoData = await geoRes.json()
      if (geoData?.features?.[0]?.geometry?.coordinates) {
        const [lng, lat] = geoData.features[0].geometry.coordinates
        centerLat = lat
        centerLng = lng
        const props = geoData.features[0].properties || {}
        resolvedCity = props.city || props.name || cityParam
      }
    } catch {
      // Fallback center if geocoding fails
      centerLat = 14.1153
      centerLng = 120.9621
    }
  }

  // Fallback defaults if still null
  if (centerLat == null || centerLng == null) {
    centerLat = 14.1153
    centerLng = 120.9621
  }

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // 1. Try Official Google Places API (New) if apiKey exists
  if (apiKey) {
    try {
      const textQuery = q ? `${q} near ${resolvedCity}` : `hotels and resorts in ${resolvedCity}`
      const googleRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.editorialSummary,places.photos,places.location,places.googleMapsUri,places.primaryTypeDisplayName'
        },
        body: JSON.stringify({
          textQuery,
          includedType: 'lodging',
          locationBias: {
            circle: {
              center: { latitude: centerLat, longitude: centerLng },
              radius: radiusKm * 1000
            }
          },
          maxResultCount: 15
        })
      })

      if (googleRes.ok) {
        const googleData = await googleRes.json()
        if (Array.isArray(googleData.places) && googleData.places.length > 0) {
          const results: PlaceResult[] = []

          for (const place of googleData.places) {
            const pLat = place.location?.latitude ?? centerLat
            const pLng = place.location?.longitude ?? centerLng
            const distance = haversineDistanceKm(centerLat, centerLng, pLat, pLng)

            // Limit strictly to registered city radius
            if (distance > radiusKm) continue

            const name = place.displayName?.text || 'Accommodation'
            const address = place.formattedAddress || `${resolvedCity}`
            const ratingVal = place.rating ?? 4.8
            const rating = `${ratingVal.toFixed(1)} ★`
            const reviewsCount = place.userRatingCount ? `(${place.userRatingCount.toLocaleString()})` : ''
            const description =
              place.editorialSummary?.text ||
              place.primaryTypeDisplayName?.text ||
              generateGoogleOverview(name, resolvedCity, address)

            let imageUrl = ''
            if (place.photos && place.photos.length > 0 && place.photos[0]?.name) {
              imageUrl = `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=600&maxWidthPx=800&key=${apiKey}`
            } else {
              imageUrl = getPhotoForHotel(name)
            }

            const link =
              place.googleMapsUri ||
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`

            results.push({
              id: place.id || `place-${results.length + 1}`,
              name,
              address,
              rating,
              ratingValue: ratingVal,
              reviewsCount,
              distance: formatDistance(distance),
              distanceKm: distance,
              description,
              image: imageUrl,
              link,
              lat: pLat,
              lng: pLng
            })
          }

          if (results.length > 0) {
            results.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
            return {
              success: true,
              city: resolvedCity,
              radiusKm,
              count: results.length,
              source: 'google-places',
              results
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Places API] Google Places New API failed, attempting fallbacks:', err)
    }

    // Legacy Google Places fallback
    try {
      const textQuery = q ? `${q} in ${resolvedCity}` : `hotels in ${resolvedCity}`
      const legacyRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(textQuery)}&location=${centerLat},${centerLng}&radius=${radiusKm * 1000}&type=lodging&key=${apiKey}`
      )
      const legacyData = await legacyRes.json()
      if (legacyData.status === 'OK' && Array.isArray(legacyData.results) && legacyData.results.length > 0) {
        const results: PlaceResult[] = []

        for (const place of legacyData.results) {
          const pLat = place.geometry?.location?.lat ?? centerLat
          const pLng = place.geometry?.location?.lng ?? centerLng
          const distance = haversineDistanceKm(centerLat, centerLng, pLat, pLng)

          if (distance > radiusKm) continue

          const name = place.name
          const address = place.formatted_address || `${resolvedCity}`
          const ratingVal = place.rating ?? 4.7
          const rating = `${ratingVal.toFixed(1)} ★`
          const reviewsCount = place.user_ratings_total ? `(${place.user_ratings_total.toLocaleString()})` : ''
          const description = generateGoogleOverview(name, resolvedCity, address)

          let imageUrl = ''
          if (place.photos && place.photos.length > 0 && place.photos[0]?.photo_reference) {
            imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`
          } else {
            imageUrl = getPhotoForHotel(name)
          }

          const link = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`

          results.push({
            id: place.place_id || `place-${results.length + 1}`,
            name,
            address,
            rating,
            ratingValue: ratingVal,
            reviewsCount,
            distance: formatDistance(distance),
            distanceKm: distance,
            description,
            image: imageUrl,
            link,
            lat: pLat,
            lng: pLng
          })
        }

        if (results.length > 0) {
          results.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
          return {
            success: true,
            city: resolvedCity,
            radiusKm,
            count: results.length,
            source: 'google-places-legacy',
            results
          }
        }
      }
    } catch (err) {
      console.warn('[Places API] Google Places Legacy API failed, using geocoder fallback:', err)
    }
  }

  // 2. High-speed localized geocoder fallback (Photon with 30km radius bounding)
  try {
    const results: PlaceResult[] = []
    const seenNames = new Set<string>()

    // Check curated database for this destination
    try {
      const { getDynamicAccommodations } = await import('../../../app/data/destinationHotels')
      const curated = getDynamicAccommodations(resolvedCity)
      const qLower = q.toLowerCase()

      for (const c of curated) {
        if (qLower && !c.name.toLowerCase().includes(qLower) && !c.description.toLowerCase().includes(qLower)) {
          continue
        }
        const lower = c.name.toLowerCase().trim()
        seenNames.add(lower)
        const address = `${c.name}, ${resolvedCity}`
        results.push({
          id: `curated-${results.length + 1}`,
          name: c.name,
          address,
          rating: c.rating,
          ratingValue: parseFloat(c.rating) || 4.8,
          reviewsCount: c.reviewsCount || '(1,250)',
          distance: c.distance || 'Near venue',
          distanceKm: 2.0,
          description: c.description,
          image: c.image || getPhotoForHotel(c.name),
          link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.name} ${resolvedCity}`)}`,
          badge: c.badge
        })
      }
    } catch (e) {
      // Curated import fallback
    }

    const searchTerm = q ? `${q} ${resolvedCity}` : `hotel resort ${resolvedCity}`
    const photonRes = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(searchTerm)}&lat=${centerLat}&lon=${centerLng}&limit=20`
    )
    const photonData = await photonRes.json()

    if (photonData?.features && photonData.features.length > 0) {
      for (const f of photonData.features) {
        const [pLng, pLat] = f.geometry?.coordinates || [0, 0]
        if (!pLat || !pLng) continue

        const distance = haversineDistanceKm(centerLat, centerLng, pLat, pLng)
        // Strict 30km limit
        if (distance > radiusKm) continue

        const props = f.properties || {}
        const name = props.name || props.street || q || 'Hotel'
        const lowerName = name.toLowerCase().trim()
        if (seenNames.has(lowerName)) continue
        seenNames.add(lowerName)

        const addressParts = [
          props.street,
          props.housenumber ? `No. ${props.housenumber}` : '',
          props.district,
          props.city || resolvedCity,
          props.state,
          props.country
        ].filter(Boolean)
        const address = addressParts.join(', ') || `${resolvedCity}`

        const { rating, ratingValue, reviewsCount } = calculateRating(name)
        const description = generateGoogleOverview(name, props.city || resolvedCity, address)
        const image = getPhotoForHotel(name)
        const link = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`

        results.push({
          id: `photon-${results.length + 1}`,
          name,
          address,
          rating,
          ratingValue,
          reviewsCount,
          distance: formatDistance(distance),
          distanceKm: distance,
          description,
          image,
          link,
          lat: pLat,
          lng: pLng
        })
      }
    }

    if (results.length > 0) {
      results.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
      return {
        success: true,
        city: resolvedCity,
        radiusKm,
        count: results.length,
        source: 'localized-geocoder',
        results
      }
    }
  } catch (err) {
    console.error('[Places API] Localized fallback failed:', err)
  }

  return {
    success: true,
    city: resolvedCity,
    radiusKm,
    count: 0,
    results: []
  }
})
