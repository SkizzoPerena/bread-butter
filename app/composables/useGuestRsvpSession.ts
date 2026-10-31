import type { LocationQuery } from 'vue-router'

const ACTIVE_RSVP_STORAGE_KEY = 'bpb_active_guest_rsvp_id'

export function useGuestRsvpSession() {
  const activeRsvpId = useState<string | null>('active_guest_rsvp_id', () => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        return window.sessionStorage.getItem(ACTIVE_RSVP_STORAGE_KEY)
      } catch {
        return null
      }
    }
    return null
  })

  function setRsvpId(id: string | null) {
    const clean = typeof id === 'string' && id.trim() ? id.trim() : null
    activeRsvpId.value = clean
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        if (clean) {
          window.sessionStorage.setItem(ACTIVE_RSVP_STORAGE_KEY, clean)
        } else {
          window.sessionStorage.removeItem(ACTIVE_RSVP_STORAGE_KEY)
        }
      } catch (err) {
        console.warn('Failed to persist RSVP ID to sessionStorage:', err)
      }
    }
  }

  function getRsvpId(): string | null {
    if (activeRsvpId.value) {
      return activeRsvpId.value
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const saved = window.sessionStorage.getItem(ACTIVE_RSVP_STORAGE_KEY)
        if (saved && saved.trim()) {
          activeRsvpId.value = saved.trim()
          return activeRsvpId.value
        }
      } catch {
        return null
      }
    }
    return null
  }

  function clearRsvpId() {
    setRsvpId(null)
  }

  function initFromRouteQuery(query: LocationQuery): string | null {
    const raw = query.rsvpId ?? query.rsvp_id ?? query.id
    const candidate = Array.isArray(raw) ? raw[0] : raw
    if (typeof candidate === 'string' && candidate.trim()) {
      const clean = candidate.trim()
      setRsvpId(clean)
      return clean
    }
    return getRsvpId()
  }

  return {
    activeRsvpId,
    setRsvpId,
    getRsvpId,
    clearRsvpId,
    initFromRouteQuery,
  }
}
