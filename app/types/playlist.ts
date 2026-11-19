export interface PlaylistRecord {
  _id: string
  event: string
  label: string
  spotifyURL: string
  description?: string
  displayInWebsite?: boolean
}

/** A playlist as the public event website receives it: only the ones the host shows. */
export type PublicPlaylistRecord = Pick<PlaylistRecord, '_id' | 'label' | 'spotifyURL' | 'description'>

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
