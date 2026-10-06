// The library inside Spotify's "Account data" export: YourLibrary.json (liked songs, followed
// artists) and Playlist1…N.json (every playlist you made, each track with its Spotify link
// and the day you added it). Far more than the Web API will read for a development-mode
// app, and no rate limits. Only names, links and dates are read; everything else (emails,
// addresses, search history…) is never opened. Pure.

import { addToIndex, type LibraryIndex, type LibraryPlaylist, type LibraryTrack } from './library'

export interface LibraryAcc {
  map: Map<string, LibraryTrack>
  playlists: LibraryPlaylist[]
  followed: string[]
  liked: number
}

export const newAcc = (): LibraryAcc => ({ map: new Map(), playlists: [], followed: [], liked: 0 })

const TRACK = /^spotify:track:[A-Za-z0-9]{22}$/
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null)
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const day = (v: unknown) => {
  const t = Date.parse(str(v))
  return Number.isNaN(t) || t < Date.UTC(2006, 0) ? null : t
}
const slug = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40)

/** Ids of playlists that came from an export (as opposed to Spotify's API). */
export const isExportPlaylist = (id: string) => id.startsWith('x:')

/** Reads one parsed file. Returns what it was, or null if it isn't part of the library. */
export function readLibraryFile(json: unknown, acc: LibraryAcc): 'library' | 'playlists' | null {
  const o = obj(json)
  if (!o) return null

  if (Array.isArray(o.playlists) && o.playlists.every((p) => obj(p) && Array.isArray(obj(p)!.items))) {
    for (const raw of o.playlists) {
      const p = obj(raw)!
      const name = str(p.name) || 'untitled'
      const id = `x:${acc.playlists.length}:${slug(name)}`
      let count = 0
      for (const it of p.items as unknown[]) {
        const t = obj(obj(it)?.track)
        const uri = str(t?.trackUri)
        if (!t || !TRACK.test(uri)) continue // episodes, local files
        addToIndex(map(acc), { uri, title: str(t.trackName), artist: str(t.artistName), album: str(t.albumName) || null, art: null, durationMs: 0 }, { playlist: id, addedAt: day(obj(it)?.addedDate) })
        count++
      }
      acc.playlists.push({ id, name, count, readable: true, checkedAt: day(p.lastModifiedDate) ?? undefined })
    }
    return 'playlists'
  }

  if (Array.isArray(o.tracks) && o.tracks.every((t) => obj(t) && 'uri' in obj(t)!)) {
    for (const raw of o.tracks) {
      const t = obj(raw)!
      const uri = str(t.uri)
      if (!TRACK.test(uri)) continue
      addToIndex(map(acc), { uri, title: str(t.track), artist: str(t.artist), album: str(t.album) || null, art: null, durationMs: 0 }, { liked: true })
      acc.liked++
    }
    if (Array.isArray(o.artists)) for (const a of o.artists) if (str(obj(a)?.name)) acc.followed.push(str(obj(a)?.name))
    return 'library'
  }
  return null
}

const map = (acc: LibraryAcc) => acc.map

export const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(3, Math.round(Math.max(a, b) * 0.05))

/**
 * Folds an export's library into the one on the device. Playlists the API already read
 * (same name, about the same size) win — they carry cover art. A newer export replaces an
 * older one's playlists instead of doubling them. A library that came from an export alone has
 * scannedAt 0, so the next visit reads Spotify too (cover art, anything newer than the export).
 */
export function mergeExportLibrary(prev: LibraryIndex | null, acc: LibraryAcc): { index: LibraryIndex; covered: number } {
  const tracks = new Map<string, LibraryTrack>()
  for (const t of prev?.tracks ?? []) tracks.set(t.uri, { ...t, playlists: t.playlists.filter((p) => !isExportPlaylist(p)) })
  const apiLists = (prev?.playlists ?? []).filter((p) => !isExportPlaylist(p.id))
  const playlists = [...apiLists]
  const skip = new Set<string>()
  let covered = 0
  for (const p of acc.playlists) {
    if (apiLists.some((a) => a.readable !== false && a.name === p.name && near(a.count, p.count))) {
      skip.add(p.id)
      covered++
    } else playlists.push(p)
  }
  for (const t of acc.map.values()) {
    const mine = t.playlists.filter((p) => !skip.has(p))
    if (!mine.length && !t.liked) continue
    const had = tracks.get(t.uri)
    if (!had) tracks.set(t.uri, { ...t, playlists: mine })
    else {
      if (t.liked) had.liked = true
      for (const p of mine) if (!had.playlists.includes(p)) had.playlists.push(p)
      if (t.addedAt && (!had.addedAt || t.addedAt < had.addedAt)) had.addedAt = t.addedAt
    }
  }
  const followed = [...new Set([...(prev?.followed ?? []), ...acc.followed])]
  return { index: { tracks: [...tracks.values()], playlists, followed: followed.length ? followed : undefined, top: prev?.top, scannedAt: prev?.scannedAt ?? 0 }, covered }
}
