import type {
  CreatePlaylistPayload,
  DeletePlaylistResponse,
  PlaylistRecord,
  PlaylistResponse,
  PlaylistsByEventResponse,
  UpdatePlaylistPayload,
} from '~/types/playlist'

let mockPlaylists: PlaylistRecord[] = []
let mockEventId: string | null = null

function ensureMockPlaylists(eventId: string): PlaylistRecord[] {
  if (mockEventId !== eventId) {
    mockEventId = eventId
    mockPlaylists = []
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
        api: () =>
          apiRequest<PlaylistsByEventResponse>(`/user/playlists/${eventId}`),
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
          apiRequest<PlaylistResponse>('/user/playlists', {
            method: 'POST',
            body: { eventId, ...payload },
          }),
        uiOnly: () => {
          const playlist: PlaylistRecord = {
            _id: `mock-playlist-${Date.now()}`,
            event: eventId,
            label: payload.label.trim(),
            spotifyURL: payload.spotifyURL.trim(),
          }
          mockPlaylists.push(playlist)
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
          apiRequest<PlaylistResponse>(`/user/playlists/${playlistId}`, {
            method: 'PATCH',
            body: payload,
          }),
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
          }
          mockPlaylists[index] = updated
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
  }
}
