// Your library, as PartyDeck understands it: every track in your liked songs and your
// playlists, with where it lives. Scanned on request (spotify/playbackService.scanLibrary)
// and kept on this device.

import type { TrackRef } from './types'

export interface LibraryTrack extends TrackRef {
  /** When it was first added anywhere (epoch ms), if Spotify said. */
  addedAt: number | null
  liked: boolean
  /** Ids of the playlists it's in. */
  playlists: string[]
}

export interface LibraryPlaylist {
  id: string
  name: string
  count: number
  /** Spotify's snapshot when it was last read: unchanged snapshot, no need to read again. */
  snapshot?: string
  /** False when Spotify won't open it for this app (someone else's playlist). */
  readable?: boolean
  checkedAt?: number
}

export type TopRangeName = 'short' | 'medium' | 'long'
export type TopLists = Record<TopRangeName, { tracks: TrackRef[]; artists: string[] }> & { fetchedAt: number }

export interface LibraryIndex {
  tracks: LibraryTrack[]
  playlists: LibraryPlaylist[]
  /** Names of artists you follow, when the session can read them. */
  followed?: string[]
  /** Spotify's own view of your past: top tracks and artists per time range, best first. */
  top?: TopLists
  scannedAt: number
}

/** Merge a track seen in one more place into the index being built. */
export function addToIndex(map: Map<string, LibraryTrack>, t: TrackRef, from: { liked?: boolean; playlist?: string; addedAt?: number | null }) {
  const had = map.get(t.uri)
  if (!had) {
    map.set(t.uri, { ...t, addedAt: from.addedAt ?? null, liked: Boolean(from.liked), playlists: from.playlist ? [from.playlist] : [] })
    return
  }
  if (from.liked) had.liked = true
  if (from.playlist && !had.playlists.includes(from.playlist)) had.playlists.push(from.playlist)
  if (from.addedAt && (!had.addedAt || from.addedAt < had.addedAt)) had.addedAt = from.addedAt
  if (!had.art && t.art) had.art = t.art
}
