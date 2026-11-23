import type { LocationQuery } from 'vue-router'

const ACTIVE_RSVP_STORAGE_KEY = 'bpb_active_guest_rsvp_id'
const ACTIVE_RSVP_SITE_STORAGE_KEY = 'bpb_active_guest_rsvp_site'

function normalizeSiteName(siteName: string | null | undefined): string {
  return typeof siteName === 'string' ? siteName.trim().toLowerCase() : ''
}

function readSession(key: string): string | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null
  try {
    const saved = window.sessionStorage.getItem(key)
    return saved && saved.trim() ? saved.trim() : null
  } catch {
    return null
  }
}

function writeSession(key: string, value: string | null) {
  if (typeof window === 'undefined' || !window.sessionStorage) return
  try {
    if (value) {
      window.sessionStorage.setItem(key, value)
    } else {
      window.sessionStorage.removeItem(key)
    }
  } catch (err) {
    console.warn('Failed to persist RSVP ID to sessionStorage:', err)
  }
}

/**
 * The RSVP a guest arrived with, kept for the tab so the site's RSVP button can skip the email
 * lookup. It belongs to one site: an id picked up on one event's site is never used on another.
 */
export function useGuestRsvpSession() {
  const activeRsvpId = useState<string | null>('active_guest_rsvp_id', () => readSession(ACTIVE_RSVP_STORAGE_KEY))
  const activeRsvpSite = useState<string | null>('active_guest_rsvp_site', () => readSession(ACTIVE_RSVP_SITE_STORAGE_KEY))

  function setRsvpId(id: string | null, siteName?: string | null) {
    const clean = typeof id === 'string' && id.trim() ? id.trim() : null
    const site = clean ? normalizeSiteName(siteName) || null : null
    activeRsvpId.value = clean
    activeRsvpSite.value = site
    writeSession(ACTIVE_RSVP_STORAGE_KEY, clean)
    writeSession(ACTIVE_RSVP_SITE_STORAGE_KEY, site)
  }

  function getRsvpId(siteName?: string | null): string | null {
    if (!activeRsvpId.value) {
      activeRsvpId.value = readSession(ACTIVE_RSVP_STORAGE_KEY)
      activeRsvpSite.value = readSession(ACTIVE_RSVP_SITE_STORAGE_KEY)
    }
    if (!activeRsvpId.value) return null
    const site = normalizeSiteName(siteName)
    return site && site === activeRsvpSite.value ? activeRsvpId.value : null
  }

  function clearRsvpId() {
    setRsvpId(null)
  }

  function initFromRouteQuery(query: LocationQuery, siteName?: string | null): string | null {
    const raw = query.rsvpId ?? query.rsvp_id ?? query.id
    const candidate = Array.isArray(raw) ? raw[0] : raw
    if (typeof candidate === 'string' && candidate.trim()) {
      const clean = candidate.trim()
      setRsvpId(clean, siteName)
      return clean
    }
    return getRsvpId(siteName)
  }

  return {
    activeRsvpId,
    setRsvpId,
    getRsvpId,
    clearRsvpId,
    initFromRouteQuery,
  }
}
