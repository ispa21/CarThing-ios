// Per-track and per-artist listening statistics from the log. Pure.

import type { LibraryTrack } from '../history/library'
import type { Play, TrackRef } from '../history/types'

/** A play this long counts as a listen (not just a start). */
export const LISTEN_MS = 30_000
export const DAY = 86_400_000

export interface TrackStats {
  track: TrackRef
  starts: number
  listens: number
  skips: number
  /** Played through (not skipped, and long enough to be a listen). */
  through: number
  first: number
  last: number
  /** Timestamps of listens, ascending. */
  times: number[]
}

export function trackStats(plays: Play[]): Map<string, TrackStats> {
  const map = new Map<string, TrackStats>()
  for (const p of [...plays].sort((a, b) => a.ts - b.ts)) {
    let s = map.get(p.uri)
    if (!s) {
      s = { track: { uri: p.uri, title: p.title, artist: p.artist, album: p.album, art: p.art, durationMs: p.durationMs }, starts: 0, listens: 0, skips: 0, through: 0, first: p.ts, last: p.ts, times: [] }
      map.set(p.uri, s)
    }
    s.starts++
    if (p.skipped) s.skips++
    if (p.playedMs >= LISTEN_MS) {
      s.listens++
      s.times.push(p.ts)
      if (!p.skipped) s.through++
    }
    s.last = Math.max(s.last, p.ts)
    // Newer plays know more (art, duration) than imported ones.
    if (p.art) s.track.art = p.art
    if (p.durationMs) s.track.durationMs = p.durationMs
  }
  return map
}

/** Listens per artist since `since`. */
export function artistListens(stats: Map<string, TrackStats>, since = 0): Map<string, number> {
  const out = new Map<string, number>()
  for (const s of stats.values()) {
    const n = since ? s.times.filter((t) => t >= since).length : s.listens
    if (n && s.track.artist) out.set(s.track.artist, (out.get(s.track.artist) ?? 0) + n)
  }
  return out
}

export const topOf = (m: Map<string, number>, n: number) =>
  [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)

/** The best-known details of a track, from the library first (it has art and duration). */
export function describe(uri: string, library: Map<string, LibraryTrack>, stats: Map<string, TrackStats>): TrackRef | null {
  const l = library.get(uri)
  const s = stats.get(uri)?.track
  if (!l && !s) return null
  return { ...(s ?? l)!, ...(l ?? {}), art: l?.art ?? s?.art ?? null, durationMs: l?.durationMs || s?.durationMs || 0 } as TrackRef
}

/** A small seeded random generator, so a day's stories and sessions are stable. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(list: T[], rand: () => number): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
