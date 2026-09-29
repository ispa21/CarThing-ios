// The session engine: a length, a risk level and a place to draw from in; a short,
// ordered listening session out. Precision before novelty — a bad pick costs the user
// their next 30 minutes, so the risk dial decides how much uncertainty goes in. Pure.

import type { TrackRef } from '../history/types'
import { BUCKETS, type Bucket, type Model } from './model'
import { rng, shuffle } from './stats'

export type Risk = 'safe' | 'curious' | 'risky' | 'chaos'
export const RISKS: Risk[] = ['safe', 'curious', 'risky', 'chaos']

/** Share of each bucket at each risk level. */
export const RISK_SHARES: Record<Risk, Record<Bucket, number>> = {
  safe: { core: 0.45, familiar: 0.35, rediscovery: 0.15, adjacent: 0.05, experiment: 0, wild: 0 },
  curious: { core: 0.25, familiar: 0.25, rediscovery: 0.2, adjacent: 0.2, experiment: 0.1, wild: 0 },
  risky: { core: 0.1, familiar: 0.15, rediscovery: 0.2, adjacent: 0.25, experiment: 0.2, wild: 0.1 },
  chaos: { core: 0.05, familiar: 0.05, rediscovery: 0.15, adjacent: 0.2, experiment: 0.25, wild: 0.3 },
}

export type SessionTrack = TrackRef & { bucket: Bucket }

export interface SessionOptions {
  minutes: number
  risk: Risk
  seed: number
  /** Draw only from these tracks (a room, a story's set). */
  uris?: string[]
  /** Draw only from these artists' tracks. */
  artists?: string[]
  source?: 'liked' | 'playlists' | 'everything'
  /** Leave these out (skipped-too-often, already heard today…). */
  exclude?: Set<string>
}

/** Without a known length, a track counts as three and a half minutes. */
export const lengthOf = (t: TrackRef) => t.durationMs || 210_000

/**
 * Picks to about the length asked for, each bucket kept near its share (a dry bucket
 * gives way to the next surest one), then shapes it into an arc: something familiar to
 * open, discoveries through the middle, and something proven to land on.
 */
export function buildRiskSession(m: Model, o: SessionOptions): SessionTrack[] {
  const room = o.uris?.length ? new Set(o.uris) : null
  const artists = o.artists?.length ? new Set(o.artists) : null
  const source = o.source ?? 'everything'
  const pools: Record<Bucket, TrackRef[]> = { core: [], familiar: [], rediscovery: [], adjacent: [], experiment: [], wild: [] }
  const candidates = new Set<string>([...m.lib.keys()])
  if (source === 'everything') for (const s of m.stats.values()) if (s.listens) candidates.add(s.track.uri)
  for (const uri of candidates) {
    if (room && !room.has(uri)) continue
    if (artists && !artists.has(m.primary(uri))) continue
    if (o.exclude?.has(uri)) continue
    const l = m.lib.get(uri)
    if (source === 'liked' && !l?.liked) continue
    if (source === 'playlists' && !l?.playlists.length) continue
    const t = m.track(uri)
    if (!t) continue
    pools[m.bucket(uri)].push(t)
  }
  const rand = rng(o.seed)
  for (const b of BUCKETS) pools[b] = shuffle(pools[b], rand)

  const shares = RISK_SHARES[o.risk]
  const used: Record<Bucket, number> = { core: 0, familiar: 0, rediscovery: 0, adjacent: 0, experiment: 0, wild: 0 }
  const target = o.minutes * 60_000
  const picked: SessionTrack[] = []
  let total = 0
  const seenArtist = new Map<string, number>()
  while (total < target - 90_000) {
    const n = picked.length + 1
    const open = BUCKETS.filter((b) => used[b] < pools[b].length && shares[b] > 0)
    // A dry bucket gives way to the surest bucket that still has music.
    const kind = open.length ? open.sort((a, b) => used[a] / n - shares[a] - (used[b] / n - shares[b]))[0] : BUCKETS.find((b) => used[b] < pools[b].length)
    if (!kind) break
    const t = pools[kind][used[kind]++]
    // No more than two by one artist in a session: variety is part of the point.
    const a = m.primary(t.uri)
    if ((seenArtist.get(a) ?? 0) >= 2) continue
    seenArtist.set(a, (seenArtist.get(a) ?? 0) + 1)
    picked.push({ ...t, bucket: kind })
    total += lengthOf(t)
  }
  return arc(picked)
}

/** Open familiar, put the unknowns in the middle, land on the surest track. */
export function arc(tracks: SessionTrack[]): SessionTrack[] {
  if (tracks.length < 4) return tracks
  const sure = (t: SessionTrack) => BUCKETS.indexOf(t.bucket)
  const bySure = [...tracks].sort((a, b) => sure(a) - sure(b))
  const landing = bySure[0]
  const opener = bySure.find((t) => t !== landing && sure(t) <= 1) ?? bySure[1]
  const middle = tracks.filter((t) => t !== landing && t !== opener)
  // Alternate: an unknown, then something known, so no stretch is all risk.
  const known = middle.filter((t) => sure(t) <= 2)
  const unknown = middle.filter((t) => sure(t) > 2)
  const woven: SessionTrack[] = []
  while (known.length || unknown.length) {
    if (unknown.length) woven.push(unknown.shift()!)
    if (known.length) woven.push(known.shift()!)
  }
  return [opener, ...woven, landing]
}

export const sessionMinutes = (tracks: TrackRef[]) => Math.max(1, Math.round(tracks.reduce((s, t) => s + lengthOf(t), 0) / 60_000))

export function bucketCounts(tracks: SessionTrack[]) {
  const c: Record<Bucket, number> = { core: 0, familiar: 0, rediscovery: 0, adjacent: 0, experiment: 0, wild: 0 }
  for (const t of tracks) c[t.bucket]++
  return c
}
