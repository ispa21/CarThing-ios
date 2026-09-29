// Reads the streaming-history export you can request from Spotify (Account →
// Privacy → Download your data). Pure: it takes parsed JSON and returns plays.
//
// "Extended streaming history" (Streaming_History_Audio_*.json) has what Stories needs:
// the track link, when it ended, how long it played and whether it was skipped.
// The basic "Account data" export (StreamingHistory_music_*.json) has no track links,
// so it can't be played back from — it's recognised and explained, not imported.
// Only the fields below are read; everything else in the file (IP address, country,
// platform) is ignored and never stored.

import type { Play } from './types'

interface ExtendedRow {
  ts?: unknown
  ms_played?: unknown
  master_metadata_track_name?: unknown
  master_metadata_album_artist_name?: unknown
  master_metadata_album_album_name?: unknown
  spotify_track_uri?: unknown
  skipped?: unknown
  reason_end?: unknown
}

export type ImportResult =
  | { kind: 'extended'; plays: Play[]; ignored: number }
  | { kind: 'basic'; rows: number }
  | { kind: 'unknown' }

const TRACK_URI = /^spotify:track:[A-Za-z0-9]{22}$/
/** Under this, a start isn't a listen, but it still counts as a start (the skip paradox). */
const MIN_MS = 1000

const str = (v: unknown) => (typeof v === 'string' ? v : null)

export function parseStreamingHistory(json: unknown): ImportResult {
  if (!Array.isArray(json) || !json.length) return { kind: 'unknown' }
  const first = json[0] as Record<string, unknown>
  if (first && typeof first === 'object' && 'endTime' in first && 'trackName' in first) return { kind: 'basic', rows: json.length }
  if (!first || typeof first !== 'object' || !('ts' in first) || !('ms_played' in first)) return { kind: 'unknown' }

  const plays: Play[] = []
  let ignored = 0
  for (const raw of json as ExtendedRow[]) {
    const uri = str(raw?.spotify_track_uri)
    const title = str(raw?.master_metadata_track_name)
    const end = Date.parse(str(raw?.ts) ?? '')
    const ms = typeof raw?.ms_played === 'number' ? raw.ms_played : NaN
    // Podcasts and audiobooks have no track link; neither do rows Spotify couldn't attribute.
    if (!uri || !TRACK_URI.test(uri) || !title || Number.isNaN(end) || !(ms >= MIN_MS)) {
      ignored++
      continue
    }
    const reason = str(raw.reason_end)
    plays.push({
      uri,
      title,
      artist: str(raw.master_metadata_album_artist_name) ?? '',
      album: str(raw.master_metadata_album_album_name),
      art: null,
      durationMs: 0, // the export doesn't say how long the track is
      ts: end - ms,
      playedMs: ms,
      skipped: raw.skipped === true || reason === 'fwdbtn' || reason === 'backbtn',
      source: 'import',
    })
  }
  return { kind: 'extended', plays, ignored }
}
