// The subset of Spotify Web API response shapes PartyDeck reads.
// Cross-checked against the official OpenAPI schema
// (https://developer.spotify.com/reference/web-api/open-api-schema.yaml), incl. Feb 2026 changes.

export interface RawImage {
  url: string
  width?: number | null
  height?: number | null
}

export interface RawExternalUrls {
  spotify?: string
}

export interface RawArtist {
  id: string
  name: string
  uri: string
  images?: RawImage[]
  external_urls?: RawExternalUrls
}

export interface RawAlbum {
  id: string
  name: string
  uri: string
  images: RawImage[]
  artists: RawArtist[]
  external_urls?: RawExternalUrls
}

export interface RawTrack {
  type: 'track'
  id: string | null
  name: string
  uri: string
  duration_ms: number
  artists: RawArtist[]
  album: RawAlbum
  is_playable?: boolean
  is_local?: boolean
  external_urls?: RawExternalUrls
}

export interface RawEpisode {
  type: 'episode'
  id: string
  name: string
  uri: string
  duration_ms: number
  images: RawImage[]
  show?: { name: string; images?: RawImage[] }
  external_urls?: RawExternalUrls
}

export type RawItem = RawTrack | RawEpisode

export interface RawDevice {
  id: string | null
  name: string
  type: string
  is_active: boolean
  is_restricted: boolean
  is_private_session?: boolean
  volume_percent: number | null
  supports_volume?: boolean
}

/** DisallowsObject — true means Spotify will reject that action right now. */
export interface RawDisallows {
  interrupting_playback?: boolean
  pausing?: boolean
  resuming?: boolean
  seeking?: boolean
  skipping_next?: boolean
  skipping_prev?: boolean
  toggling_shuffle?: boolean
  toggling_repeat_context?: boolean
  toggling_repeat_track?: boolean
}

/** CurrentlyPlayingContextObject (GET /me/player). */
export interface RawPlayback {
  device: RawDevice | null
  progress_ms: number | null
  is_playing: boolean
  item: RawItem | null
  currently_playing_type?: string
  actions?: { disallows?: RawDisallows }
  shuffle_state?: boolean
  /** "off" | "context" | "track" */
  repeat_state?: string
  context?: { uri: string; type: string } | null
  timestamp?: number
}

/** QueueObject (GET /me/player/queue). */
export interface RawQueue {
  currently_playing: RawItem | null
  queue: Array<RawItem | null>
}

export interface RawPlaylist {
  id: string
  name: string
  uri: string
  images: RawImage[] | null
  owner?: { display_name?: string | null }
  /** Feb 2026 rename of `tracks`; we read either. */
  items?: { total: number }
  tracks?: { total: number }
  external_urls?: RawExternalUrls
}

export interface RawPaging<T> {
  items: T[]
  total: number
  next: string | null
}

export interface RawSearch {
  tracks?: RawPaging<RawTrack | null>
  artists?: RawPaging<RawArtist | null>
  albums?: RawPaging<RawAlbum | null>
  playlists?: RawPaging<RawPlaylist | null>
}

export interface RawUser {
  id: string
  display_name: string | null
  images?: RawImage[]
}
