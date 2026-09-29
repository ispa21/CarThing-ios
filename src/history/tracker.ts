// Turns the stream of playback snapshots into finished plays. Pure: the recorder
// feeds it snapshots and a clock; tests feed it both.

import type { Play, TrackRef } from './types'

export interface Snapshot extends TrackRef {
  progressMs: number
  isPlaying: boolean
}

export interface Open extends TrackRef {
  startedAt: number
  /** The furthest point heard. */
  heardMs: number
  /** Progress at the last observation, to spot a restart (repeat one, or "previous"). */
  lastProgressMs: number
}

/** Plays shorter than this aren't plays (a flick through the queue). */
export const MIN_PLAY_MS = 3000
/** Heard this close to the end (or this share of it) counts as played through. */
const END_SLACK_MS = 20_000
const THROUGH_SHARE = 0.85

export function isSkip(heardMs: number, durationMs: number) {
  if (!durationMs) return false
  return heardMs < durationMs - END_SLACK_MS && heardMs < durationMs * THROUGH_SHARE
}

export function close(open: Open): Play | null {
  const heard = Math.min(open.heardMs, open.durationMs || open.heardMs)
  if (heard < MIN_PLAY_MS) return null
  const { startedAt, heardMs: _heard, lastProgressMs: _last, ...track } = open
  return { ...track, ts: startedAt, playedMs: heard, skipped: isSkip(heard, open.durationMs), source: 'live' }
}

const openFrom = (s: Snapshot, now: number): Open => ({
  uri: s.uri,
  title: s.title,
  artist: s.artist,
  album: s.album,
  art: s.art,
  durationMs: s.durationMs,
  startedAt: now - s.progressMs,
  heardMs: s.progressMs,
  lastProgressMs: s.progressMs,
})

/**
 * Feed one snapshot (null = nothing playing). Returns the new open play and any play
 * that just finished: the track changed, playback stopped, or the same track restarted.
 */
export function observe(open: Open | null, snap: Snapshot | null, now: number): { open: Open | null; closed: Play | null } {
  if (!snap) return { open: null, closed: open ? close(open) : null }
  if (!open) return { open: openFrom(snap, now), closed: null }
  if (snap.uri !== open.uri) return { open: openFrom(snap, now), closed: close(open) }
  // Same track, back near the start after real listening: it restarted.
  if (snap.progressMs < 5000 && open.lastProgressMs > 30_000) return { open: openFrom(snap, now), closed: close(open) }
  return { open: { ...open, heardMs: Math.max(open.heardMs, snap.progressMs), lastProgressMs: snap.progressMs }, closed: null }
}
