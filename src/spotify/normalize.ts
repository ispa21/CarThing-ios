// Maps raw Spotify responses to the small, stable shapes the UI renders.
// Nothing outside src/spotify should need to know Spotify's JSON.

import type { RawDevice, RawImage, RawItem, RawPlayback, RawPlaylist, RawQueue, RawSearch } from './types'

export interface PlaybackState {
  trackId: string | null
  title: string | null
  artist: string | null
  album: string | null
  albumArt: string | null
  durationMs: number
  progressMs: number
  isPlaying: boolean
  deviceId: string | null
  deviceName: string | null
  /** spotify: URI — used to match queue/lyrics and for playback commands. */
  uri: string | null
  /** https://open.spotify.com/… link-back (required by Spotify's attribution rules). */
  url: string | null
  kind: 'track' | 'episode' | null
  /** Actions Spotify says it will reject right now — buttons are disabled, not faked. */
  disallows: { pausing: boolean; resuming: boolean; seeking: boolean; skippingNext: boolean; skippingPrev: boolean }
}

export const EMPTY_PLAYBACK: PlaybackState = {
  trackId: null,
  title: null,
  artist: null,
  album: null,
  albumArt: null,
  durationMs: 0,
  progressMs: 0,
  isPlaying: false,
  deviceId: null,
  deviceName: null,
  uri: null,
  url: null,
  kind: null,
  disallows: { pausing: false, resuming: false, seeking: false, skippingNext: false, skippingPrev: false },
}

export type MediaKind = 'track' | 'episode' | 'album' | 'artist' | 'playlist'

export interface MediaItem {
  id: string
  uri: string
  kind: MediaKind
  title: string
  subtitle: string
  art: string | null
  url: string | null
  durationMs?: number
}

export interface Device {
  id: string | null
  name: string
  type: string
  isActive: boolean
  isRestricted: boolean
}

/** Only render links that really point at Spotify over https. */
export function safeSpotifyUrl(url: string | undefined | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && (u.hostname === 'spotify.com' || u.hostname.endsWith('.spotify.com'))
      ? u.toString()
      : null
  } catch {
    return null
  }
}

/** Only render images served over https. */
function safeImageUrl(url: string | undefined): string | null {
  return url && url.startsWith('https://') ? url : null
}

/**
 * Smallest image at least `minWidth` wide, else the largest.
 * Spotify sometimes omits widths (e.g. playlist mosaics) — then take the first.
 */
export function pickImage(images: RawImage[] | null | undefined, minWidth = 300): string | null {
  if (!images?.length) return null
  if (images.some((i) => !i.width)) return safeImageUrl(images[0]?.url)
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0))
  return safeImageUrl((sorted.find((i) => (i.width ?? 0) >= minWidth) ?? sorted[sorted.length - 1]).url)
}

const joinArtists = (artists: { name: string }[] | undefined) =>
  (artists ?? []).map((a) => a.name).filter(Boolean).join(', ')

export function normalizePlayback(raw: RawPlayback | null, artWidth = 600): PlaybackState {
  if (!raw) return EMPTY_PLAYBACK
  const item = raw.item
  const d = raw.actions?.disallows ?? {}
  const base: PlaybackState = {
    ...EMPTY_PLAYBACK,
    isPlaying: Boolean(raw.is_playing && item),
    progressMs: Math.max(0, raw.progress_ms ?? 0),
    deviceId: raw.device?.id ?? null,
    deviceName: raw.device?.name ?? null,
    disallows: {
      pausing: Boolean(d.pausing),
      resuming: Boolean(d.resuming),
      seeking: Boolean(d.seeking),
      skippingNext: Boolean(d.skipping_next),
      skippingPrev: Boolean(d.skipping_prev),
    },
  }
  if (!item) return base
  const shared = {
    trackId: item.id ?? item.uri,
    title: item.name,
    durationMs: item.duration_ms,
    uri: item.uri,
    url: safeSpotifyUrl(item.external_urls?.spotify),
    kind: item.type,
  } as const
  if (item.type === 'episode') {
    return {
      ...base,
      ...shared,
      artist: item.show?.name ?? null,
      album: null,
      albumArt: pickImage(item.images?.length ? item.images : item.show?.images, artWidth),
    }
  }
  return {
    ...base,
    ...shared,
    artist: joinArtists(item.artists) || null,
    album: item.album?.name ?? null,
    albumArt: pickImage(item.album?.images, artWidth),
  }
}

export function normalizeItem(item: RawItem, artWidth = 64): MediaItem {
  if (item.type === 'episode') {
    return {
      id: item.id,
      uri: item.uri,
      kind: 'episode',
      title: item.name,
      subtitle: item.show?.name ?? 'Podcast',
      art: pickImage(item.images?.length ? item.images : item.show?.images, artWidth),
      url: safeSpotifyUrl(item.external_urls?.spotify),
      durationMs: item.duration_ms,
    }
  }
  return {
    id: item.id ?? item.uri,
    uri: item.uri,
    kind: 'track',
    title: item.name,
    subtitle: joinArtists(item.artists),
    art: pickImage(item.album?.images, artWidth),
    url: safeSpotifyUrl(item.external_urls?.spotify),
    durationMs: item.duration_ms,
  }
}

export interface QueueView {
  current: MediaItem | null
  upNext: MediaItem[]
}

/** GET /me/player/queue → what the Queue screen shows. Null entries are dropped. */
export function normalizeQueue(raw: RawQueue | null): QueueView {
  if (!raw) return { current: null, upNext: [] }
  return {
    current: raw.currently_playing ? normalizeItem(raw.currently_playing) : null,
    upNext: raw.queue.filter((i): i is RawItem => Boolean(i?.uri)).map((i) => normalizeItem(i)),
  }
}

export function normalizePlaylist(p: RawPlaylist, artWidth = 300): MediaItem {
  const total = p.items?.total ?? p.tracks?.total
  const owner = p.owner?.display_name
  return {
    id: p.id,
    uri: p.uri,
    kind: 'playlist',
    title: p.name,
    subtitle: [owner ? `By ${owner}` : null, total != null ? `${total} ${total === 1 ? 'song' : 'songs'}` : null]
      .filter(Boolean)
      .join(', '),
    art: pickImage(p.images, artWidth),
    url: safeSpotifyUrl(p.external_urls?.spotify),
  }
}

export interface SearchView {
  tracks: MediaItem[]
  artists: MediaItem[]
  albums: MediaItem[]
  playlists: MediaItem[]
}

export function normalizeSearch(raw: RawSearch | null): SearchView {
  const present = <T>(items: Array<T | null> | undefined): T[] => (items ?? []).filter((i): i is T => i != null)
  return {
    tracks: present(raw?.tracks?.items).map((t) => normalizeItem(t)),
    artists: present(raw?.artists?.items).map((a) => ({
      id: a.id,
      uri: a.uri,
      kind: 'artist' as const,
      title: a.name,
      subtitle: 'Artist',
      art: pickImage(a.images, 64),
      url: safeSpotifyUrl(a.external_urls?.spotify),
    })),
    albums: present(raw?.albums?.items).map((a) => ({
      id: a.id,
      uri: a.uri,
      kind: 'album' as const,
      title: a.name,
      subtitle: joinArtists(a.artists),
      art: pickImage(a.images, 64),
      url: safeSpotifyUrl(a.external_urls?.spotify),
    })),
    playlists: present(raw?.playlists?.items).map((p) => normalizePlaylist(p, 64)),
  }
}

export const isSearchEmpty = (s: SearchView) =>
  !s.tracks.length && !s.artists.length && !s.albums.length && !s.playlists.length

export function normalizeDevice(d: RawDevice): Device {
  return { id: d.id, name: d.name, type: d.type, isActive: d.is_active, isRestricted: d.is_restricted }
}
