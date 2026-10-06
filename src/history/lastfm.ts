// Last.fm: your full, dated listening history — if Spotify has been scrobbling to your
// Last.fm account. This is the one route to years of play-by-play history that doesn't
// wait for Spotify's export. Read-only (user.getRecentTracks needs only an API key and a
// username; no login). Plays are matched to Spotify tracks already in your library;
// unmatched ones still count for artists and patterns but are never sent to Spotify.

import { songKey } from './match'
import type { Play } from './types'

export interface Scrobble {
  artist: string
  title: string
  album: string | null
  /** When it was scrobbled (epoch ms). */
  ts: number
}

interface RawScrobble {
  artist?: { '#text'?: string; name?: string }
  name?: string
  album?: { '#text'?: string }
  date?: { uts?: string }
  '@attr'?: { nowplaying?: string }
}

export interface RawRecentTracks {
  recenttracks?: { track?: RawScrobble | RawScrobble[]; '@attr'?: { page?: string; totalPages?: string; total?: string } }
  error?: number
  message?: string
}

/** Scrobbles from one page, oldest first. The "now playing" row has no date and is skipped. */
export function readScrobbles(raw: RawRecentTracks): { scrobbles: Scrobble[]; page: number; pages: number; total: number } {
  const list = raw.recenttracks?.track
  const rows = Array.isArray(list) ? list : list ? [list] : []
  const attr = raw.recenttracks?.['@attr']
  const scrobbles = rows.flatMap((r) => {
    const ts = Number(r.date?.uts) * 1000
    const artist = (r.artist?.['#text'] ?? r.artist?.name ?? '').trim()
    const title = (r.name ?? '').trim()
    if (r['@attr']?.nowplaying || !Number.isFinite(ts) || ts <= 0 || !artist || !title) return []
    return [{ artist, title, album: r.album?.['#text']?.trim() || null, ts }]
  })
  return { scrobbles: scrobbles.reverse(), page: Number(attr?.page ?? 1), pages: Number(attr?.totalPages ?? 1), total: Number(attr?.total ?? scrobbles.length) }
}

export { songKey }

/**
 * Scrobbles to plays. `known` maps songKey → a Spotify track you have (library or log);
 * a match gets its Spotify link, art and length. A scrobble means it was heard, so it
 * counts as a listen, never a skip.
 */
export function toPlays(scrobbles: Scrobble[], known: Map<string, { uri: string; title: string; artist: string; album: string | null; art: string | null; durationMs: number }>): { plays: Play[]; matched: number } {
  let matched = 0
  const plays = scrobbles.map((s): Play => {
    const k = songKey(s.artist, s.title)
    const t = known.get(k)
    if (t) matched++
    const durationMs = t?.durationMs ?? 0
    return {
      uri: t?.uri ?? `lastfm:${k}`,
      title: t?.title ?? s.title,
      artist: t?.artist ?? s.artist,
      album: t?.album ?? s.album,
      art: t?.art ?? null,
      durationMs,
      // Last.fm stamps a scrobble when it's sent, near the end: back it up to the start.
      ts: s.ts - (durationMs || 180_000),
      playedMs: durationMs || 180_000,
      skipped: false,
      source: 'import',
    }
  })
  return { plays, matched }
}

export const LASTFM_API = 'https://ws.audioscrobbler.com/2.0/'

/**
 * Every scrobble since `fromMs` (0 = all time), page by page, 200 at a time. Spaced out
 * (Last.fm asks for no more than a few requests a second), and it retries a rate limit.
 */
export async function fetchScrobbles(
  user: string,
  apiKey: string,
  fromMs: number,
  onPage: (done: number, pages: number) => void,
  signal?: AbortSignal,
): Promise<Scrobble[]> {
  const out: Scrobble[] = []
  // Last.fm pages newest-first; walk them all, then return oldest-first.
  for (let page = 1, pages = 1; page <= pages; page++) {
    const url = new URL(LASTFM_API)
    url.search = new URLSearchParams({ method: 'user.getrecenttracks', user, api_key: apiKey, format: 'json', limit: '200', page: String(page), ...(fromMs ? { from: String(Math.floor(fromMs / 1000) + 1) } : {}) }).toString()
    let raw: RawRecentTracks | null = null
    for (let attempt = 0; attempt < 5 && !raw; attempt++) {
      const res = await fetch(url, { signal })
      const body = (await res.json().catch(() => ({}))) as RawRecentTracks
      if (body.error === 29 || res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }
      if (body.error) throw new Error(body.message ?? `Last.fm error ${body.error}`)
      if (!res.ok) throw new Error(`Last.fm answered ${res.status}`)
      raw = body
    }
    if (!raw) throw new Error('Last.fm kept saying slow down')
    const r = readScrobbles(raw)
    pages = r.pages
    out.push(...r.scrobbles)
    onPage(page, pages)
    await new Promise((r) => setTimeout(r, 220))
  }
  return out.sort((a, b) => a.ts - b.ts)
}
