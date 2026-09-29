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
/** What LRCLIB titles tack on after the song's name without brackets. */
const TITLE_TAIL = /^(from|feat|ft|with|remaster|remastered|live|version|original|soundtrack|ost)\b/
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
 * The best record for a track: same title, one of the track's artists, and — when we
 * know it — a duration within LRCLIB's ±2s. A near miss shows nothing rather than the
 * wrong song. Any artist counts, because credits differ: Spotify often lists the
 * composer first ("Shashwat Sachdev, Arijit Singh"), LRCLIB the singer.
 */
export function pickRecord(records: LrclibRecord[], q: TrackQuery): LrclibRecord | null {
  const title = matchKey(q.title)
  const artists = artistKeys(q.artist)
  const known = !!q.durationMs
  const fits = records.filter((r) => {
    if (r.instrumental || !(r.syncedLyrics || r.plainLyrics)) return false
    const rTitle = matchKey(r.trackName ?? '')
    const rArtist = matchKey(r.artistName ?? '')
    const durationOk = !known || !r.duration || Math.abs(r.duration - q.durationMs! / 1000) <= DURATION_SLACK_S
    // "Gehra Hua From Dhurandhar" is the same song when the length agrees too.
    const titleOk =
      rTitle === title || (known && !!r.duration && durationOk && rTitle.startsWith(`${title} `) && TITLE_TAIL.test(rTitle.slice(title.length + 1)))
    const artistOk = artists.some((a) => rArtist.includes(a)) || (!!rArtist && artists.some((a) => a.includes(rArtist)))
    return titleOk && artistOk && durationOk
  })
  return fits.find((r) => r.syncedLyrics) ?? fits[0] ?? null
}

const splitArtists = (artist: string) =>
  artist
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
const artistKeys = (artist: string) => splitArtists(artist).map(matchKey).filter(Boolean)
const firstArtist = (artist: string) => splitArtists(artist)[0] ?? ''

/** "Song - 2011 Remaster (feat. X)" → "Song": what LRCLIB's catalogue calls it. */
export const searchTitle = (title: string) =>
  title.replace(/\s[-–—]\s.*$/, '').replace(/\s*[([].*?[)\]]/g, '').trim() || title.trim()

export function createLrclibProvider(fetchImpl: typeof fetch = (...a) => fetch(...a)): LyricsProvider {
  // One lookup per track per session: the Lyrics screen and the TV ask for the same song.
  const cache = new Map<string, Promise<ResolvedLyrics | null>>()

  async function search(params: Record<string, string>): Promise<LrclibRecord[]> {
    const res = await fetchImpl(`${LRCLIB_API}/search?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) throw new Error(`LRCLIB ${res.status}`)
    const body: unknown = await res.json()
    return Array.isArray(body) ? (body as LrclibRecord[]) : []
  }

  // Title and first artist first (precise); then the title alone, for songs LRCLIB
  // credits to a different artist on the track (pickRecord still checks every artist).
  async function lookup(q: TrackQuery): Promise<ResolvedLyrics | null> {
    const track_name = searchTitle(q.title)
    const searches: Array<Record<string, string>> = [{ track_name, artist_name: firstArtist(q.artist) }, { track_name }]
    for (const params of searches) {
      const record = pickRecord(await search(params), q)
      if (record) return toResolved(record)
    }
    return null
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
