// Merging plays from different sources without counting one play twice. Pure.

import type { Play } from './types'

/** The same track within this window, from two sources, is one play. */
const SAME_PLAY_MS = 4 * 60_000

/**
 * Adds `incoming` to `existing`, dropping any incoming play that matches an existing
 * one (same track, start times within a few minutes). A live play knows more (how much
 * was heard, whether it was skipped) than Spotify's recently-played list, so it wins.
 */
export function mergePlays(existing: Play[], incoming: Play[]): Play[] {
  const byUri = new Map<string, number[]>()
  for (const p of existing) byUri.set(p.uri, [...(byUri.get(p.uri) ?? []), p.ts])
  const fresh: Play[] = []
  for (const p of incoming) {
    const times = byUri.get(p.uri) ?? []
    if (times.some((t) => Math.abs(t - p.ts) < SAME_PLAY_MS)) continue
    times.push(p.ts)
    byUri.set(p.uri, times)
    fresh.push(p)
  }
  return fresh
}

/** A play from Spotify's recently-played list. It logs when a play ended, and not how much was heard. */
export function fromRecent(r: { uri: string; title: string; artist: string; album: string | null; art: string | null; durationMs: number; playedAt: number }): Play {
  const { playedAt, ...track } = r
  return { ...track, ts: playedAt - r.durationMs, playedMs: r.durationMs, skipped: false, source: 'recent' }
}
