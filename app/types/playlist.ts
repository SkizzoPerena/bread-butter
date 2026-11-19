export interface PlaylistRecord {
  _id: string
  event: string
  label: string
  spotifyURL: string
  description?: string
  displayInWebsite?: boolean
}

export interface CreatePlaylistPayload {
  label: string
  spotifyURL: string
  description?: string
  displayInWebsite?: boolean
}

export interface UpdatePlaylistPayload {
  label: string
  spotifyURL: string
  description?: string
  displayInWebsite?: boolean
}

export interface PlaylistsByEventResponse {
  success: boolean
  status: number
  playlists: PlaylistRecord[]
}

export interface PlaylistResponse {
  success: boolean
  status: number
  message: string
  playlist: PlaylistRecord
}

export interface DeletePlaylistResponse {
  success: boolean
  status: number
  message: string
}
