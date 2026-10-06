// Stories: observations about your listening, each ending in something to play.
// Pure: log + library in, stories out. Every story needs enough data to be true;
// without it, the story is simply absent (never padded or invented).

import type { LibraryTrack } from '../history/library'
import { isSpotifyUri } from '../history/match'
import { sessionsFrom } from '../history/sessions'
import type { Play, TrackRef } from '../history/types'
import { artistListens, DAY, describe, rng, shuffle, topOf, trackStats, type TrackStats } from './stats'

export type Pick = TrackRef & { kind: 'familiar' | 'forgotten' | 'never' }

export type Story =
  | { id: 'next30'; tracks: Pick[]; minutes: number; artists: string[]; counts: Record<Pick['kind'], number> }
  | { id: 'forgotten'; count: number; tracks: TrackRef[]; minutes: number; year: number | null }
  | { id: 'deepcuts'; artist: string; listens: number; tracks: TrackRef[] }
  | { id: 'almosts'; count: number; tracks: Array<TrackRef & { listens: number }> }
  | { id: 'ghosts'; track: TrackRef; listens: number; from: number; to: number; weekly: number[]; tracks: TrackRef[] }
  | { id: 'three'; tracks: TrackRef[]; sessions: number }
  | { id: 'skip'; track: TrackRef; starts: number; skips: number; through: number }
  | { id: 'longhaul'; track: TrackRef; days: number; since: number; perYear: Array<{ year: number; listens: number }>; timeless: TrackRef[] }

export interface Inputs {
  plays: Play[]
  library: LibraryTrack[]
  now: number
}

const minutesOf = (tracks: TrackRef[]) => Math.round(tracks.reduce((s, t) => s + t.durationMs, 0) / 60_000)

export function prepare({ plays, library }: Inputs) {
  // These stories end in "play": only tracks that can be played take part.
  const stats = trackStats(plays.filter((p) => isSpotifyUri(p.uri)))
  const lib = new Map(library.map((t) => [t.uri, t]))
  return { stats, lib }
}

// ── The session builder (also Your next 30) ─────────────────────────────────

export type Mix = 'safe' | 'curious' | 'chaos'
export const MIX_SHARES: Record<Mix, Record<Pick['kind'], number>> = {
  safe: { familiar: 0.8, forgotten: 0.15, never: 0.05 },
  curious: { familiar: 0.55, forgotten: 0.25, never: 0.2 },
  chaos: { familiar: 0.25, forgotten: 0.25, never: 0.5 },
}

export interface BuildOptions {
  minutes: number
  mix: Mix
  /** Only these artists; empty = anyone. */
  artists?: string[]
  /** Only these tracks (a room: a station, the almosts…), including ones you've played but not saved. */
  uris?: string[]
  source: 'liked' | 'playlists' | 'everything'
  seed: number
}

/**
 * A session from music you already have: familiar (listened to 3+ times), forgotten
 * (1–2 listens, or nothing in 90 days) and never played — in the mix's shares, to
 * about the length asked for. "Never played" means saved and never pressed: PartyDeck
 * only ever picks from your own library.
 */
export function buildSession(inputs: Inputs, o: BuildOptions): Pick[] {
  const { stats, lib } = prepare(inputs)
  const room = o.uris?.length ? new Set(o.uris) : null
  const allowed = (t: LibraryTrack) =>
    (o.source === 'everything' || (o.source === 'liked' ? t.liked : t.playlists.length > 0)) && (!o.artists?.length || o.artists.includes(t.artist)) && (!room || room.has(t.uri))
  const pools: Record<Pick['kind'], TrackRef[]> = { familiar: [], forgotten: [], never: [] }
  const seen = new Set<string>()
  for (const t of inputs.library) {
    if (!allowed(t) || !t.durationMs) continue
    const s = stats.get(t.uri)
    const kind: Pick['kind'] = !s || !s.listens ? 'never' : s.listens >= 3 && inputs.now - s.last < 90 * DAY ? 'familiar' : 'forgotten'
    pools[kind].push(t)
    seen.add(t.uri)
  }
  // With "everything", tracks you've played that aren't in your library count too
  // (in a room, any you've listened to; elsewhere, ones you keep playing).
  if (o.source === 'everything') {
    for (const s of stats.values()) {
      if (seen.has(s.track.uri) || (room ? !room.has(s.track.uri) || !s.listens : s.listens < 3) || (o.artists?.length && !o.artists.includes(s.track.artist))) continue
      const t = describe(s.track.uri, lib, stats)
      if (t?.durationMs) pools[inputs.now - s.last < 90 * DAY ? 'familiar' : 'forgotten'].push(t)
    }
  }
  const rand = rng(o.seed)
  const shuffled = { familiar: shuffle(pools.familiar, rand), forgotten: shuffle(pools.forgotten, rand), never: shuffle(pools.never, rand) }
  const target = o.minutes * 60_000
  const out: Pick[] = []
  let total = 0
  const shares = MIX_SHARES[o.mix]
  const used: Record<Pick['kind'], number> = { familiar: 0, forgotten: 0, never: 0 }
  while (total < target - 90_000) {
    // The kind furthest below its share goes next; a dry pool gives way to the others.
    const kinds = (Object.keys(shares) as Pick['kind'][]).filter((k) => used[k] < shuffled[k].length)
    if (!kinds.length) break
    const n = out.length + 1
    const kind = kinds.sort((a, b) => used[a] / n - shares[a] - (used[b] / n - shares[b]))[0]
    const t = shuffled[kind][used[kind]++]
    out.push({ ...t, kind })
    total += t.durationMs
  }
  return out
}

// ── The stories ──────────────────────────────────────────────────────────────

function next30(inputs: Inputs, stats: Map<string, TrackStats>, seed: number): Story | null {
  const artists = topOf(artistListens(stats, inputs.now - 180 * DAY), 12)
  if (artists.length < 2 || inputs.library.length < 20) return null
  const tracks = buildSession(inputs, { minutes: 30, mix: 'curious', artists, source: 'everything', seed })
  if (tracks.length < 5) return null
  const counts = { familiar: 0, forgotten: 0, never: 0 }
  for (const t of tracks) counts[t.kind]++
  return { id: 'next30', tracks, minutes: minutesOf(tracks), artists: artists.slice(0, 3), counts }
}

function forgotten(inputs: Inputs, stats: Map<string, TrackStats>, seed: number): Story | null {
  const unplayed = inputs.library.filter((t) => t.liked && !stats.get(t.uri)?.starts)
  if (unplayed.length < 12) return null
  const years = new Map<number, number>()
  for (const t of unplayed) if (t.addedAt) years.set(new Date(t.addedAt).getFullYear(), (years.get(new Date(t.addedAt).getFullYear()) ?? 0) + 1)
  const year = [...years.entries()].sort((a, b) => b[1] - a[1])[0]
  const tracks = shuffle(unplayed, rng(seed)).slice(0, 12)
  return { id: 'forgotten', count: unplayed.length, tracks, minutes: minutesOf(tracks), year: year && year[1] / unplayed.length > 0.4 ? year[0] : null }
}

function deepCuts(inputs: Inputs, stats: Map<string, TrackStats>): Story | null {
  const byArtist = artistListens(stats)
  for (const artist of topOf(byArtist, 5)) {
    const tracks = inputs.library.filter((t) => t.artist === artist && !stats.get(t.uri)?.starts).slice(0, 6)
    if (tracks.length >= 3) return { id: 'deepcuts', artist, listens: byArtist.get(artist) ?? 0, tracks }
  }
  return null
}

function almosts(inputs: Inputs, stats: Map<string, TrackStats>): Story | null {
  const lib = new Map(inputs.library.map((t) => [t.uri, t]))
  const list = [...stats.values()]
    .filter((s) => s.listens >= 2 && s.listens <= 4 && !lib.get(s.track.uri)?.liked && !lib.get(s.track.uri)?.playlists.length && s.last - s.first > DAY)
    .sort((a, b) => b.listens - a.listens || b.last - a.last)
  if (list.length < 3) return null
  return { id: 'almosts', count: list.length, tracks: list.slice(0, 8).map((s) => ({ ...(describe(s.track.uri, lib, stats) ?? s.track), listens: s.listens })) }
}

function ghosts(inputs: Inputs, stats: Map<string, TrackStats>): Story | null {
  const lib = new Map(inputs.library.map((t) => [t.uri, t]))
  const WINDOW = 90 * DAY
  let best: { s: TrackStats; n: number; from: number } | null = null
  for (const s of stats.values()) {
    if (s.listens < 8 || inputs.now - s.last < 60 * DAY) continue
    // The densest 90 days of this track.
    for (let i = 0, j = 0; i < s.times.length; i++) {
      while (s.times[i] - s.times[j] > WINDOW) j++
      const n = i - j + 1
      if (n >= 8 && (!best || n > best.n)) best = { s, n, from: s.times[j] }
    }
  }
  if (!best) return null
  const { s, n, from } = best
  const to = s.last
  const weeks = Math.min(26, Math.ceil((inputs.now - from) / (7 * DAY)))
  const weekly = Array.from({ length: weeks }, (_, w) => s.times.filter((t) => t >= from + w * 7 * DAY && t < from + (w + 1) * 7 * DAY).length)
  // Its sound: other tracks you played in that window and haven't since.
  const tracks = [...stats.values()]
    .filter((o) => o.last <= to + 14 * DAY && inputs.now - o.last >= 60 * DAY && o.times.filter((t) => t >= from && t <= to).length >= 3)
    .sort((a, b) => b.listens - a.listens)
    .slice(0, 12)
    .map((o) => describe(o.track.uri, lib, stats) ?? o.track)
  return { id: 'ghosts', track: describe(s.track.uri, lib, stats) ?? s.track, listens: n, from, to, weekly, tracks }
}

function three(inputs: Inputs, stats: Map<string, TrackStats>): Story | null {
  const lib = new Map(inputs.library.map((t) => [t.uri, t]))
  const sessions = sessionsFrom(inputs.plays)
    .map((s) => [...new Set(s.plays.filter((p) => p.playedMs >= 30_000).map((p) => p.uri))])
    .filter((u) => u.length >= 3 && u.length <= 40)
  const pair = new Map<string, number>()
  const key = (a: string, b: string) => (a < b ? `${a} ${b}` : `${b} ${a}`)
  for (const uris of sessions) for (let i = 0; i < uris.length; i++) for (let j = i + 1; j < uris.length; j++) pair.set(key(uris[i], uris[j]), (pair.get(key(uris[i], uris[j])) ?? 0) + 1)
  const top = [...pair.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1])[0]
  if (!top) return null
  const [a, b] = top[0].split(' ')
  // The third: the track most often in the sessions that hold both.
  const third = new Map<string, number>()
  for (const uris of sessions) if (uris.includes(a) && uris.includes(b)) for (const c of uris) if (c !== a && c !== b) third.set(c, (third.get(c) ?? 0) + 1)
  const [c, n] = [...third.entries()].sort((x, y) => y[1] - x[1])[0] ?? ['', 0]
  const best = n >= 3 ? { c, n } : null
  if (!best) return null
  const tracks = [a, b, best.c].map((u) => describe(u, lib, stats)).filter((t): t is TrackRef => Boolean(t))
  return tracks.length === 3 ? { id: 'three', tracks, sessions: best.n } : null
}

function skipParadox(inputs: Inputs, stats: Map<string, TrackStats>): Story | null {
  const lib = new Map(inputs.library.map((t) => [t.uri, t]))
  const s = [...stats.values()].filter((x) => x.starts >= 8 && x.skips / x.starts >= 0.5 && x.through >= 3).sort((a, b) => b.starts - a.starts)[0]
  if (!s) return null
  return { id: 'skip', track: describe(s.track.uri, lib, stats) ?? s.track, starts: s.starts, skips: s.skips, through: s.through }
}

function longHaul(inputs: Inputs, stats: Map<string, TrackStats>): Story | null {
  const lib = new Map(inputs.library.map((t) => [t.uri, t]))
  const best = [...stats.values()]
    .filter((s) => new Set(s.times.map((t) => new Date(t).getFullYear())).size >= 3)
    .sort((a, b) => b.last - b.first - (a.last - a.first))[0]
  if (!best) return null
  const years = new Map<number, number>()
  for (const t of best.times) years.set(new Date(t).getFullYear(), (years.get(new Date(t).getFullYear()) ?? 0) + 1)
  const first = new Date(best.first).getFullYear()
  const last = new Date(inputs.now).getFullYear()
  // Your timeless 30: tracks you've listened to in two or more different years, longest-kept first.
  const timeless: TrackRef[] = []
  let ms = 0
  for (const s of [...stats.values()]
    .filter((x) => new Set(x.times.map((t) => new Date(t).getFullYear())).size >= 2)
    .sort((a, b) => b.last - b.first - (a.last - a.first))) {
    const t = describe(s.track.uri, lib, stats)
    if (!t || ms >= 30 * 60_000) break
    timeless.push(t)
    ms += t.durationMs || 210_000
  }
  return {
    id: 'longhaul',
    track: describe(best.track.uri, lib, stats) ?? best.track,
    days: Math.round((best.last - best.first) / DAY),
    since: best.first,
    perYear: Array.from({ length: last - first + 1 }, (_, i) => ({ year: first + i, listens: years.get(first + i) ?? 0 })),
    timeless,
  }
}

/** Every story there's enough data to tell, in the feed's order. */
export function stories(inputs: Inputs, seed: number): Story[] {
  const { stats } = prepare(inputs)
  return [next30(inputs, stats, seed), forgotten(inputs, stats, seed), deepCuts(inputs, stats), almosts(inputs, stats), ghosts(inputs, stats), three(inputs, stats), skipParadox(inputs, stats), longHaul(inputs, stats)].filter(
    (s): s is Story => s !== null,
  )
}

/** Today's seed: stories and sessions stay put through the day, and change tomorrow. */
export const daySeed = (now: number) => Math.floor(now / DAY)
