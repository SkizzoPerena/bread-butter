import type {
  CreatePlaylistPayload,
  DeletePlaylistResponse,
  PlaylistRecord,
  PlaylistResponse,
  PlaylistsByEventResponse,
  UpdatePlaylistPayload,
} from '~/types/playlist'
import { actorRole, tracked } from '~/utils/analytics'

let mockPlaylists: PlaylistRecord[] = []
let mockEventId: string | null = null

function getStorageKey(eventId: string): string {
  return `bb_playlists_${eventId || 'mock'}`
}

export function getLocalPlaylists(eventId: string): PlaylistRecord[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(getStorageKey(eventId))
      if (stored) {
        return JSON.parse(stored) as PlaylistRecord[]
      }
    } catch (err) {
      console.warn('[useEventPlaylists] Failed to parse local playlists', err)
    }
  }
  return []
}

export function setLocalPlaylists(eventId: string, records: PlaylistRecord[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getStorageKey(eventId), JSON.stringify(records))
    } catch (err) {
      console.warn('[useEventPlaylists] Failed to write local playlists', err)
    }
  }
}

function ensureMockPlaylists(eventId: string): PlaylistRecord[] {
  if (mockEventId !== eventId) {
    mockEventId = eventId
    const local = getLocalPlaylists(eventId)
    mockPlaylists = local
  }
  return mockPlaylists
}

export function useEventPlaylists() {
  const { apiRequest, executeAction } = useApiMode()

  const isLoading = ref(false)
  const isSubmitting = ref(false)

  async function fetchPlaylists(eventId: string) {
    isLoading.value = true
    try {
      return await executeAction({
        api: async () => {
          const res = await apiRequest<PlaylistsByEventResponse>(`/user/playlists/${eventId}`)
          if (res?.playlists) {
            setLocalPlaylists(eventId, res.playlists)
          }
          return res
        },
        uiOnly: () => ({
          success: true,
          status: 200,
          playlists: ensureMockPlaylists(eventId),
        }),
      })
    } finally {
      isLoading.value = false
    }
  }

  async function createPlaylist(eventId: string, payload: CreatePlaylistPayload) {
    isSubmitting.value = true
    try {
      return await executeAction({
        api: () =>
          tracked(actorRole(), () => apiRequest<PlaylistResponse>('/user/playlists', {
            method: 'POST',
            body: { eventId, ...payload },
          }), { event: 'playlist_url_saved' }),
        uiOnly: () => {
          const playlist: PlaylistRecord = {
            _id: `mock-playlist-${Date.now()}`,
            event: eventId,
            label: payload.label.trim(),
            spotifyURL: payload.spotifyURL.trim(),
            description: payload.description?.trim() || undefined,
            displayInWebsite: payload.displayInWebsite ?? true,
          }
          mockPlaylists.push(playlist)
          setLocalPlaylists(eventId, mockPlaylists)
          return {
            success: true,
            status: 201,
            message: 'Playlist created successfully.',
            playlist,
          }
        },
      })
    } finally {
      isSubmitting.value = false
    }
  }

  async function updatePlaylist(playlistId: string, payload: UpdatePlaylistPayload) {
    isSubmitting.value = true
    try {
      return await executeAction({
        api: () =>
          tracked(actorRole(), () => apiRequest<PlaylistResponse>(`/user/playlists/${playlistId}`, {
            method: 'PATCH',
            body: payload,
          }), { event: 'playlist_url_saved' }),
        uiOnly: () => {
          const index = mockPlaylists.findIndex((item) => item._id === playlistId)
          if (index === -1) {
            throw new Error('Playlist not found.')
          }
          const current = mockPlaylists[index]!
          const updated: PlaylistRecord = {
            ...current,
            label: payload.label.trim(),
            spotifyURL: payload.spotifyURL.trim(),
            description: payload.description?.trim() || undefined,
            displayInWebsite: payload.displayInWebsite !== undefined ? payload.displayInWebsite : (current.displayInWebsite ?? true),
          }
          mockPlaylists[index] = updated
          if (mockEventId) {
            setLocalPlaylists(mockEventId, mockPlaylists)
          }
          return {
            success: true,
            status: 200,
            message: 'Playlist updated successfully.',
            playlist: updated,
          }
        },
      })
    } finally {
      isSubmitting.value = false
    }
  }

  async function deletePlaylist(playlistId: string) {
    isSubmitting.value = true
    try {
      return await executeAction({
        api: () =>
          apiRequest<DeletePlaylistResponse>(`/user/playlists/${playlistId}`, {
            method: 'DELETE',
          }),
        uiOnly: () => {
          mockPlaylists = mockPlaylists.filter((item) => item._id !== playlistId)
          if (mockEventId) {
            setLocalPlaylists(mockEventId, mockPlaylists)
          }
          return {
            success: true,
            status: 200,
            message: 'Playlist deleted successfully.',
          }
        },
      })
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    isLoading,
    isSubmitting,
    fetchPlaylists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    getLocalPlaylists,
    setLocalPlaylists,
  }
}
