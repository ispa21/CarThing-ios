// Merging plays from different sources without counting one play twice. Pure.

import type { Play } from './types'

/** The same track from two different sources (live, recently-played, an import) within this window is one play. */
const SAME_PLAY_MS = 4 * 60_000
/**
 * From the same source, only a start within two seconds is the same row (the same export
 * dropped in twice). A song played again, even a minute later, is a new play.
 */
const SAME_SOURCE_MS = 2_000
const BUCKET = 60_000

/**
 * Adds `incoming` to `existing`, dropping any incoming play that matches an existing
 * one. A live play knows more (how much was heard, whether it was skipped) than Spotify's
 * recently-played list, so it wins. Bucketed by minute, so a favourite song played
 * thousands of times costs nothing extra.
 */
export function mergePlays(existing: Play[], incoming: Play[]): Play[] {
  const seen = new Map<string, Map<number, Array<{ ts: number; source: Play['source'] }>>>()
  const add = (p: Play) => {
    let byBucket = seen.get(p.uri)
    if (!byBucket) seen.set(p.uri, (byBucket = new Map()))
    const b = Math.floor(p.ts / BUCKET)
    const list = byBucket.get(b)
    if (list) list.push({ ts: p.ts, source: p.source })
    else byBucket.set(b, [{ ts: p.ts, source: p.source }])
  }
  const has = (p: Play) => {
    const byBucket = seen.get(p.uri)
    if (!byBucket) return false
    const b = Math.floor(p.ts / BUCKET)
    for (let k = b - 4; k <= b + 4; k++)
      for (const e of byBucket.get(k) ?? []) if (Math.abs(e.ts - p.ts) < (e.source === p.source ? SAME_SOURCE_MS : SAME_PLAY_MS)) return true
    return false
  }
  for (const p of existing) add(p)
  const fresh: Play[] = []
  for (const p of incoming) {
    if (has(p)) continue
    add(p)
    fresh.push(p)
  }
  return fresh
}

/** A play from Spotify's recently-played list. It logs when a play ended, and not how much was heard. */
export function fromRecent(r: { uri: string; title: string; artist: string; album: string | null; art: string | null; durationMs: number; playedAt: number }): Play {
  const { playedAt, ...track } = r
  return { ...track, ts: playedAt - r.durationMs, playedMs: r.durationMs, skipped: false, source: 'recent' }
}
