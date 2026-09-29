import { describe, expect, it } from 'vitest'
import { parseStreamingHistory } from './importer'
import { addToIndex, type LibraryTrack } from './library'

const URI = 'spotify:track:4uLU6hMCjMI75M1A2tKUQC'
const row = (over: Record<string, unknown> = {}) => ({
  ts: '2025-03-01T22:00:00Z',
  ms_played: 180_000,
  master_metadata_track_name: 'Low Orbit',
  master_metadata_album_artist_name: 'Sable Arcade',
  master_metadata_album_album_name: 'Signal Flares',
  spotify_track_uri: URI,
  skipped: false,
  reason_end: 'trackdone',
  ip_addr: '203.0.113.1',
  conn_country: 'IN',
  ...over,
})

describe('parseStreamingHistory', () => {
  it('reads the extended export into plays, and nothing else from each row', () => {
    const r = parseStreamingHistory([row()])
    expect(r.kind).toBe('extended')
    if (r.kind !== 'extended') return
    expect(r.plays).toEqual([
      {
        uri: URI,
        title: 'Low Orbit',
        artist: 'Sable Arcade',
        album: 'Signal Flares',
        art: null,
        durationMs: 0,
        ts: Date.parse('2025-03-01T22:00:00Z') - 180_000,
        playedMs: 180_000,
        skipped: false,
        source: 'import',
      },
    ])
    expect(JSON.stringify(r.plays)).not.toContain('203.0.113.1')
  })

  it('marks skips from the flag or the forward button', () => {
    const r = parseStreamingHistory([row({ skipped: true }), row({ skipped: null, reason_end: 'fwdbtn' })])
    expect(r.kind === 'extended' && r.plays.map((p) => p.skipped)).toEqual([true, true])
  })

  it('ignores podcasts, unattributed rows and sub-second starts', () => {
    const r = parseStreamingHistory([row({ spotify_track_uri: null, spotify_episode_uri: 'spotify:episode:x' }), row({ ms_played: 200 }), row({ spotify_track_uri: 'spotify:track:bad' }), row()])
    expect(r.kind === 'extended' && [r.plays.length, r.ignored]).toEqual([1, 3])
  })

  it('recognises the basic export, and rejects anything else', () => {
    expect(parseStreamingHistory([{ endTime: '2024-01-01 10:00', artistName: 'A', trackName: 'T', msPlayed: 1000 }])).toEqual({ kind: 'basic', rows: 1 })
    expect(parseStreamingHistory({ nope: true })).toEqual({ kind: 'unknown' })
    expect(parseStreamingHistory([])).toEqual({ kind: 'unknown' })
  })
})

describe('addToIndex', () => {
  it('merges one track seen in several places', () => {
    const map = new Map<string, LibraryTrack>()
    const t = { uri: URI, title: 'Low Orbit', artist: 'Sable Arcade', album: null, art: null, durationMs: 241_000 }
    addToIndex(map, t, { playlist: 'p1', addedAt: 200 })
    addToIndex(map, { ...t, art: 'https://i.scdn.co/x' }, { liked: true, addedAt: 100 })
    addToIndex(map, t, { playlist: 'p1' })
    expect(map.get(URI)).toMatchObject({ liked: true, playlists: ['p1'], addedAt: 100, art: 'https://i.scdn.co/x' })
  })
})
