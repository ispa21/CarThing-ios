// Matching plays that arrive without a Spotify link (Spotify's basic export, Last.fm) to
// tracks PartyDeck knows. Pure.

import type { Play, TrackRef } from './types'

/** Only real Spotify tracks can be played, queued or saved. Everything else is statistics. */
export const isSpotifyUri = (uri: string) => uri.startsWith('spotify:track:')

/** A loose key for the same song across services: lowercase, no brackets or remaster tags. */
export const songKey = (artist: string, title: string) => {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s*[([].*?(feat|ft\.|with|remaster|version|edit|from|live).*?[)\]]/g, '')
      .replace(/\s+-\s+.*(remaster|version|edit|mix).*$/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
  return `${clean(artist.split(/,|&| feat\.? | ft\.? /i)[0] ?? artist)}|${clean(title)}`
}

/** A play known only by name (artist, title) and time. */
export interface NamedPlay {
  artist: string
  title: string
  /** When it started (epoch ms). */
  ts: number
  playedMs: number
}

/** songKey → a Spotify track you have, from the library and from plays already logged. */
export function knownTracks(library: TrackRef[], plays: Play[]) {
  const known = new Map<string, TrackRef>()
  for (const p of plays) if (isSpotifyUri(p.uri)) known.set(songKey(p.artist, p.title), p)
  for (const t of library) known.set(songKey(t.artist, t.title), t) // the library knows more (art, length)
  return known
}

/**
 * Named plays → plays. A match gets its Spotify link, art and length; the rest keep a
 * stand-in `name:` link, so they count for artists, hours and patterns but can never
 * be sent to Spotify (see isSpotifyUri).
 */
export function resolveNamed(named: NamedPlay[], known: Map<string, TrackRef>, skippedBelowMs = 30_000): { plays: Play[]; matched: number } {
  let matched = 0
  const plays: Play[] = []
  for (const n of named) {
    const k = songKey(n.artist, n.title)
    const t = known.get(k)
    if (t) matched++
    plays.push({
      uri: t?.uri ?? `name:${k}`,
      title: t?.title ?? n.title,
      artist: t?.artist ?? n.artist,
      album: t?.album ?? null,
      art: t?.art ?? null,
      durationMs: t?.durationMs ?? 0,
      ts: n.ts,
      playedMs: n.playedMs,
      // Spotify's basic export has no skip flag: a very short play is a skip.
      skipped: n.playedMs < skippedBelowMs,
      source: 'import',
    })
  }
  return { plays, matched }
}
