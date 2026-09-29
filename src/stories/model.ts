// The taste model: what PartyDeck understands about a library. Pure; built once per visit.
//
// Spotify no longer gives new apps genres, audio features or recommendations, so every
// "sound" here is behavioural: artists that share your playlists and follow each other in
// your sessions form a ROOM. Time of day comes from when you actually play them. Every
// track then gets a RISK bucket — how likely you are to enjoy it — which is what lets a
// session be safe or deliberately uncertain.

import type { LibraryPlaylist, LibraryTrack, TopLists } from '../history/library'
import { sessionsFrom } from '../history/sessions'
import type { Play, Session, TrackRef } from '../history/types'
import { DAY, describe, trackStats, type TrackStats } from './stats'

export type Band = 'morning' | 'afternoon' | 'evening' | 'late night'
export const BANDS: Band[] = ['morning', 'afternoon', 'evening', 'late night']
export const bandOf = (hour: number): Band => (hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : hour >= 17 && hour < 22 ? 'evening' : 'late night')

/** Surest first. */
export type Bucket = 'core' | 'familiar' | 'rediscovery' | 'adjacent' | 'experiment' | 'wild'
export const BUCKETS: Bucket[] = ['core', 'familiar', 'rediscovery', 'adjacent', 'experiment', 'wild']

export interface Room {
  id: string
  name: string
  /** Most-played first. */
  artists: string[]
  uris: string[]
  listens: number
  /** When this room gets played, if it leans one way. */
  band: Band | null
  bandShare: number
  /** The playlist that is most of this room, if any. */
  playlist: string | null
}

export interface Model {
  now: number
  plays: Play[]
  stats: Map<string, TrackStats>
  lib: Map<string, LibraryTrack>
  library: LibraryTrack[]
  playlists: LibraryPlaylist[]
  sessions: Session[]
  rooms: Room[]
  roomOf: Map<string, string>
  graph: Map<string, Map<string, number>>
  core: Set<string>
  artistListens: Map<string, number>
  /** Spotify's ranking of your past, when read. */
  top: TopLists | null
  topArtists: Set<string>
  /** Indexes, so stories never rescan everything per artist or per track. */
  statsByArtist: Map<string, TrackStats[]>
  libByArtist: Map<string, LibraryTrack[]>
  /** Starts that ended inside the first 30 seconds, per track. */
  earlyExits: Map<string, number>
  primary: (uri: string) => string
  track: (uri: string) => TrackRef | null
  bucket: (uri: string) => Bucket
  /** Listens in the last `days` days. */
  recent: (s: TrackStats, days: number) => number
}

/** "A, B" → "A": the graph is between lead artists. */
export const lead = (artist: string) => artist.split(', ')[0] ?? artist

/** Playlists bigger than this are dumps: they say little about which artists belong together. */
const DUMP = 150

export function buildModel(input: { plays: Play[]; library: LibraryTrack[]; playlists?: LibraryPlaylist[]; top?: TopLists | null; now: number }): Model {
  const { now } = input
  const plays = [...input.plays].sort((a, b) => a.ts - b.ts)
  const playlists = input.playlists ?? []
  const stats = trackStats(plays)
  const lib = new Map(input.library.map((t) => [t.uri, t]))
  const sessions = sessionsFrom(plays)
  const recent = (s: TrackStats, days: number) => {
    let n = 0
    for (let i = s.times.length - 1; i >= 0 && s.times[i] >= now - days * DAY; i--) n++
    return n
  }

  const top = input.top ?? null
  const topTracks = new Map<string, TrackRef>()
  for (const r of ['long', 'medium', 'short'] as const) for (const t of top?.[r].tracks ?? []) topTracks.set(t.uri, t)
  const topArtists = new Set((['long', 'medium', 'short'] as const).flatMap((r) => (top?.[r].artists ?? []).map(lead)))
  const artistOf = new Map<string, string>()
  for (const t of topTracks.values()) artistOf.set(t.uri, lead(t.artist))
  for (const t of input.library) artistOf.set(t.uri, lead(t.artist))
  for (const s of stats.values()) if (!artistOf.has(s.track.uri)) artistOf.set(s.track.uri, lead(s.track.artist))
  const primary = (uri: string) => artistOf.get(uri) ?? ''

  const statsByArtist = new Map<string, TrackStats[]>()
  for (const st of stats.values()) {
    const a = primary(st.track.uri)
    const list = statsByArtist.get(a)
    if (list) list.push(st)
    else statsByArtist.set(a, [st])
  }
  const libByArtist = new Map<string, LibraryTrack[]>()
  for (const t of input.library) {
    const a = lead(t.artist)
    const list = libByArtist.get(a)
    if (list) list.push(t)
    else libByArtist.set(a, [t])
  }
  const earlyExits = new Map<string, number>()
  for (const p of plays) if (p.playedMs < 30_000) earlyExits.set(p.uri, (earlyExits.get(p.uri) ?? 0) + 1)

  const artistListens = new Map<string, number>()
  for (const s of stats.values()) if (s.listens) artistListens.set(primary(s.track.uri), (artistListens.get(primary(s.track.uri)) ?? 0) + s.listens)

  // ── The artist graph ──
  const graph = new Map<string, Map<string, number>>()
  const link = (a: string, b: string, w: number) => {
    if (!a || !b || a === b) return
    for (const [x, y] of [
      [a, b],
      [b, a],
    ]) {
      const m = graph.get(x) ?? new Map<string, number>()
      m.set(y, (m.get(y) ?? 0) + w)
      graph.set(x, m)
    }
  }
  const byPlaylist = new Map<string, Set<string>>()
  for (const t of input.library)
    for (const p of t.playlists) {
      const set = byPlaylist.get(p) ?? new Set<string>()
      set.add(lead(t.artist))
      byPlaylist.set(p, set)
    }
  for (const artists of byPlaylist.values()) {
    const list = [...artists]
    if (list.length < 2 || list.length > DUMP) continue
    const w = 1 / Math.sqrt(list.length) // a tight playlist says more than a big one
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) link(list[i], list[j], w)
  }
  // One artist following another once is noise; twice or more is a habit.
  const follows = new Map<string, number>()
  for (const s of sessions) {
    let prev = ''
    for (const p of s.plays) {
      if (p.playedMs < 30_000) continue
      const a = lead(p.artist)
      if (prev && a !== prev) {
        const k = prev < a ? `${prev}\u0000${a}` : `${a}\u0000${prev}`
        follows.set(k, (follows.get(k) ?? 0) + 1)
      }
      prev = a
    }
  }
  // …and only when it happens more than their popularity alone would predict (lift).
  const out = new Map<string, number>()
  let N = 0
  for (const [k, n] of follows) {
    const [a, b] = k.split('\u0000')
    out.set(a, (out.get(a) ?? 0) + n)
    out.set(b, (out.get(b) ?? 0) + n)
    N += n
  }
  for (const [k, n] of follows) {
    if (n < 2) continue
    const [a, b] = k.split('\u0000')
    const lift = (n * 2 * N) / ((out.get(a) ?? 1) * (out.get(b) ?? 1))
    if (lift >= 2) link(a, b, 0.4 * Math.log2(lift))
  }

  // ── Rooms: label propagation over the graph ──
  const degree = (a: string) => [...(graph.get(a)?.values() ?? [])].reduce((s, n) => s + n, 0)
  const nodes = [...graph.keys()].sort((a, b) => degree(b) - degree(a) || a.localeCompare(b))
  const label = new Map(nodes.map((n) => [n, n]))
  for (let iter = 0; iter < 20; iter++) {
    let changed = false
    for (const n of nodes) {
      const score = new Map<string, number>()
      for (const [m, w] of graph.get(n) ?? []) score.set(label.get(m)!, (score.get(label.get(m)!) ?? 0) + w)
      // The heaviest label among its neighbours; ties go to the alphabetically first, so it's stable.
      let best = label.get(n)!
      let top = -1
      for (const [l, w] of score)
        if (w > top + 1e-9 || (Math.abs(w - top) <= 1e-9 && l < best)) {
          best = l
          top = w
        }
      if (best !== label.get(n)) {
        label.set(n, best)
        changed = true
      }
    }
    if (!changed) break
  }
  const groups = new Map<string, string[]>()
  for (const [n, l] of label) {
    const g = groups.get(l)
    if (g) g.push(n)
    else groups.set(l, [n])
  }

  const urisBy = new Map<string, string[]>()
  for (const uri of new Set([...lib.keys(), ...[...stats.values()].filter((s) => s.listens).map((s) => s.track.uri)])) {
    const a = primary(uri)
    const list = urisBy.get(a)
    if (list) list.push(uri)
    else urisBy.set(a, [uri])
  }
  const bandCount = (uris: string[]) => {
    const c = new Map<Band, number>()
    for (const u of uris)
      for (const t of stats.get(u)?.times ?? []) {
        const b = bandOf(new Date(t).getHours())
        c.set(b, (c.get(b) ?? 0) + 1)
      }
    return c
  }

  const rooms: Room[] = []
  const roomOf = new Map<string, string>()
  const candidates = [...groups.values()]
    .map((artists) => {
      const sorted = [...artists].sort((a, b) => (artistListens.get(b) ?? 0) - (artistListens.get(a) ?? 0) || (urisBy.get(b)?.length ?? 0) - (urisBy.get(a)?.length ?? 0) || a.localeCompare(b))
      const uris = sorted.flatMap((a) => urisBy.get(a) ?? [])
      const listens = sorted.reduce((s, a) => s + (artistListens.get(a) ?? 0), 0)
      return { artists: sorted, uris, listens }
    })
    .filter((g) => g.artists.length >= 2 && g.uris.length >= 8)
    .sort((a, b) => b.listens - a.listens || b.uris.length - a.uris.length)
  for (const [i, g] of candidates.entries()) {
    const inRoom = new Set(g.uris)
    let playlist: LibraryPlaylist | null = null
    let overlap = 0
    for (const p of playlists) {
      if (p.count > 400) continue
      let n = 0
      for (const u of inRoom) if (lib.get(u)?.playlists.includes(p.id)) n++
      if (n > overlap) {
        overlap = n
        playlist = p
      }
    }
    const named = playlist && overlap >= g.uris.length * 0.35 ? playlist.name.toLowerCase() : `the ${g.artists[0]} sound`
    const bands = bandCount(g.uris)
    const total = [...bands.values()].reduce((s, n) => s + n, 0)
    const [band, n] = [...bands.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0]
    const room: Room = { id: `r${i}`, name: named, artists: g.artists, uris: g.uris, listens: g.listens, band: total >= 10 && n / total >= 0.4 ? band : null, bandShare: total ? n / total : 0, playlist: playlist && overlap >= g.uris.length * 0.35 ? playlist.id : null }
    rooms.push(room)
    for (const a of g.artists) roomOf.set(a, room.id)
  }

  // ── The core: the fewest tracks that make up 80% of the last year's listening ──
  const yearly = [...stats.values()].map((s) => [s.track.uri, recent(s, 365)] as const).filter(([, n]) => n > 0)
  const totalYear = yearly.reduce((s, [, n]) => s + n, 0)
  const core = new Set<string>()
  if (totalYear >= 30) {
    let acc = 0
    for (const [u, n] of yearly.sort((a, b) => b[1] - a[1])) {
      if (acc >= totalYear * 0.8 || n < 2) break
      core.add(u)
      acc += n
    }
  } else if (top) {
    // Little history yet: Spotify's own ranking of your last months and years stands in.
    for (const t of [...top.medium.tracks, ...top.long.tracks]) core.add(t.uri)
  }
  const coreArtists = new Set([...core].map(primary))
  const coreRooms = new Set([...coreArtists].map((a) => roomOf.get(a)).filter(Boolean))
  const nearCore = (a: string) => [...(graph.get(a)?.keys() ?? [])].some((n) => coreArtists.has(n) || coreRooms.has(roomOf.get(n)))

  const bucket = (uri: string): Bucket => {
    if (core.has(uri)) return 'core'
    const s = stats.get(uri)
    if ((s && s.listens >= 3 && now - s.last < 180 * DAY) || topTracks.has(uri)) return 'familiar'
    if (s && s.listens >= 1) return 'rediscovery'
    const a = primary(uri)
    if ((artistListens.get(a) ?? 0) >= 5 || topArtists.has(a) || coreRooms.has(roomOf.get(a))) return 'adjacent'
    if (nearCore(a) || (artistListens.get(a) ?? 0) > 0) return 'experiment'
    return 'wild'
  }

  return {
    now,
    plays,
    stats,
    lib,
    library: input.library,
    playlists,
    sessions,
    rooms,
    roomOf,
    graph,
    core,
    artistListens,
    top,
    topArtists,
    statsByArtist,
    libByArtist,
    earlyExits,
    primary,
    track: (uri) => describe(uri, lib, stats) ?? topTracks.get(uri) ?? null,
    bucket,
    recent,
  }
}
