// LRCLIB (https://lrclib.net): a free, open lyrics database with a public, keyless,
// CORS-enabled API. Track metadata goes out; no account, token or Spotify data does.
// Synced lyrics are parsed with their stamps, but whether they're *followed* is still
// up to lyrics/policy.ts (never for Spotify playback).

import { parseLRC, type LyricLine } from './lrc'
import { matchKey } from './match'
import type { LyricsProvider, ResolvedLyrics, TrackQuery } from './resolver'

export const LRCLIB_API = 'https://lrclib.net/api'

/** The kill switch: VITE_LYRICS_LRCLIB=off turns LRCLIB lyrics off for every user. */
export const LRCLIB_ENABLED = (import.meta.env.VITE_LYRICS_LRCLIB ?? '').trim().toLowerCase() !== 'off'

/** One record from /api/search (the fields we read). */
export interface LrclibRecord {
  trackName?: string
  artistName?: string
  duration?: number // seconds
  instrumental?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

/** LRCLIB's own matching tolerance for duration. */
const DURATION_SLACK_S = 2
const TIMEOUT_MS = 8000
const NAME = 'LRCLIB, user-contributed'

/** Plain lyrics → untimed lines. Blank lines between verses become gaps. */
export function plainLines(text: string): LyricLine[] {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((t) => ({ startMs: 0, text: t.trim() }))
    .filter((l, i, all) => l.text || (i > 0 && all[i - 1].text)) // collapse runs of blanks
  while (lines.length && !lines[0].text) lines.shift()
  while (lines.length && !lines[lines.length - 1].text) lines.pop()
  return lines
}

/** The record's lyrics, synced when it has them. Null for instrumentals and empty records. */
export function toResolved(r: LrclibRecord): ResolvedLyrics | null {
  if (r.instrumental) return null
  if (r.syncedLyrics) {
    const lines = parseLRC(r.syncedLyrics)
    if (lines.some((l) => l.text)) return { lines, synced: true, providerName: NAME }
  }
  if (r.plainLyrics) {
    const lines = plainLines(r.plainLyrics)
    if (lines.length) return { lines, synced: false, providerName: NAME }
  }
  return null
}

/**
 * The best record for a track: same title, same first artist, and — when we know it —
 * a duration within LRCLIB's ±2s. A near miss shows nothing rather than the wrong song.
 */
export function pickRecord(records: LrclibRecord[], q: TrackQuery): LrclibRecord | null {
  const title = matchKey(q.title)
  const artist = matchKey(firstArtist(q.artist))
  const fits = records.filter(
    (r) =>
      !r.instrumental &&
      (r.syncedLyrics || r.plainLyrics) &&
      matchKey(r.trackName ?? '') === title &&
      matchKey(r.artistName ?? '').includes(artist) &&
      (q.durationMs === undefined || !r.duration || Math.abs(r.duration - q.durationMs / 1000) <= DURATION_SLACK_S),
  )
  return fits.find((r) => r.syncedLyrics) ?? fits[0] ?? null
}

const firstArtist = (artist: string) => artist.split(',')[0] ?? ''

/** "Song - 2011 Remaster (feat. X)" → "Song": what LRCLIB's catalogue calls it. */
export const searchTitle = (title: string) =>
  title.replace(/\s[-–—]\s.*$/, '').replace(/\s*[([].*?[)\]]/g, '').trim() || title.trim()

export function createLrclibProvider(fetchImpl: typeof fetch = (...a) => fetch(...a)): LyricsProvider {
  // One lookup per track per session: the Lyrics screen and the TV ask for the same song.
  const cache = new Map<string, Promise<ResolvedLyrics | null>>()

  async function lookup(q: TrackQuery): Promise<ResolvedLyrics | null> {
    const params = new URLSearchParams({ track_name: searchTitle(q.title), artist_name: firstArtist(q.artist) })
    const res = await fetchImpl(`${LRCLIB_API}/search?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) throw new Error(`LRCLIB ${res.status}`)
    const body: unknown = await res.json()
    if (!Array.isArray(body)) return null
    const record = pickRecord(body as LrclibRecord[], q)
    return record ? toResolved(record) : null
  }

  return {
    id: 'lrclib',
    name: NAME,
    find(q) {
      if (!q.title.trim() || !q.artist.trim()) return Promise.resolve(null)
      const key = `${matchKey(q.title)}|${matchKey(firstArtist(q.artist))}|${Math.round((q.durationMs ?? 0) / 1000)}`
      let hit = cache.get(key)
      if (!hit) {
        hit = lookup(q)
        cache.set(key, hit)
        hit.catch(() => cache.delete(key)) // failures (offline, timeouts) may be retried
      }
      return hit
    },
  }
}

export const lrclibProvider = createLrclibProvider()
