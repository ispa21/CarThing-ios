import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { unzipHistory } from './exportFiles'
import { describeImport, importAll } from './importAll'
import { parseStreamingHistory } from './importer'
import { isSpotifyUri, songKey } from './match'
import type { TrackRef } from './types'

const URI = (i: number) => `spotify:track:${String(i).padStart(22, '0')}`
const ext = (i: number, over: Record<string, unknown> = {}) => ({
  ts: new Date(Date.UTC(2023, 0, 1) + i * 240_000).toISOString(),
  platform: 'iOS 17',
  ms_played: 200_000,
  conn_country: 'IN',
  ip_addr: '203.0.113.5',
  master_metadata_track_name: `Song ${i % 500}`,
  master_metadata_album_artist_name: `Artist ${i % 40}`,
  master_metadata_album_album_name: `Album ${i % 90}`,
  spotify_track_uri: URI(i % 500),
  reason_start: 'trackdone',
  reason_end: 'trackdone',
  shuffle: false,
  skipped: false,
  ...over,
})
const basic = (i: number) => ({ endTime: `2024-03-01 ${String(10 + (i % 10)).padStart(2, '0')}:15`, artistName: `Artist ${i % 5}`, trackName: `Song ${i % 7}`, msPlayed: 180_000 })

describe('the basic export (names only)', () => {
  it('reads artist, title and time, UTC to the minute', () => {
    const r = parseStreamingHistory([basic(0), { ...basic(1), endTime: '2024-03-01 11:15:30' }, { ...basic(2), msPlayed: 100 }])
    expect(r.kind).toBe('basic')
    if (r.kind !== 'basic') return
    expect(r.rows).toBe(3)
    expect(r.plays).toHaveLength(2)
    expect(r.plays[0]).toEqual({ artist: 'Artist 0', title: 'Song 0', ts: Date.UTC(2024, 2, 1, 10, 15) - 180_000, playedMs: 180_000 })
    expect(r.plays[1].ts).toBe(Date.UTC(2024, 2, 1, 11, 15, 30) - 180_000)
  })
})

describe('importing a whole export', () => {
  it('survives a file with 200,000 rows (the spread-push crash)', async () => {
    const rows = Array.from({ length: 200_000 }, (_, i) => ext(i))
    const out = await importAll([{ name: 'Streaming_History_Audio_2023_0.json', text: JSON.stringify(rows) }], [], [])
    expect(out.plays).toHaveLength(200_000)
    expect(out.files[0]).toMatchObject({ kind: 'extended', plays: 200_000 })
  }, 60_000)

  it('matches basic-export plays to songs you have; the rest keep a name-only link', async () => {
    const lib: TrackRef[] = [{ uri: URI(3), title: 'Song 3', artist: 'Artist 3', album: 'LP', art: 'https://i.scdn.co/x', durationMs: 200_000 }]
    const out = await importAll([{ name: 'MyData/StreamingHistory_music_0.json', text: JSON.stringify(Array.from({ length: 70 }, (_, i) => basic(i))) }], lib, [])
    const matched = out.plays.filter((p) => isSpotifyUri(p.uri))
    expect(matched.length).toBeGreaterThan(0)
    expect(matched.every((p) => p.uri === URI(3) && p.art === 'https://i.scdn.co/x')).toBe(true)
    expect(out.plays.filter((p) => !isSpotifyUri(p.uri)).every((p) => p.uri.startsWith('name:'))).toBe(true)
    expect(out.files[0]).toMatchObject({ kind: 'basic', plays: 70, matched: matched.length })
  })

  it('reads Spotify’s real ZIP layout and ignores everything else in it', async () => {
    const zip = zipSync({
      'Spotify Extended Streaming History/Streaming_History_Audio_2022-2023_0.json': strToU8(JSON.stringify(Array.from({ length: 50 }, (_, i) => ext(i)))),
      'Spotify Extended Streaming History/Streaming_History_Audio_2023-2024_1.json': strToU8(JSON.stringify(Array.from({ length: 50 }, (_, i) => ext(i + 50)))),
      'Spotify Extended Streaming History/Streaming_History_Video_2023_0.json': strToU8('[]'),
      'Spotify Extended Streaming History/ReadMeFirst_ExtendedStreamingHistory.pdf': strToU8('pdf'),
      'Spotify Account Data/Userdata.json': strToU8('{"email":"nope@example.com"}'),
      'Spotify Account Data/Playlist1.json': strToU8('{"playlists":[]}'),
    })
    const texts = unzipHistory(zip)
    expect(texts.map((t) => t.name).sort()).toEqual([
      'Spotify Extended Streaming History/Streaming_History_Audio_2022-2023_0.json',
      'Spotify Extended Streaming History/Streaming_History_Audio_2023-2024_1.json',
      'Spotify Extended Streaming History/Streaming_History_Video_2023_0.json',
      'Spotify Account Data/Playlist1.json',
    ].sort())
    const out = await importAll(texts, [], [])
    expect(out.plays).toHaveLength(100)
    expect(JSON.stringify(out.plays)).not.toContain('203.0.113.5') // nothing but listening is kept
    expect(JSON.stringify(out)).not.toContain('nope@example.com') // Userdata.json is never even opened
  })

  it('matches the quick export’s plays to the library inside the same ZIP', async () => {
    const uri = (c: string) => `spotify:track:${c.repeat(22)}`
    const lib = { playlists: [{ name: 'Night Drive', lastModifiedDate: '2025-02-01', items: [{ track: { trackName: 'Song 3', artistName: 'Artist 3', albumName: 'LP', trackUri: uri('q') }, addedDate: '2024-04-04' }] }] }
    const yourLibrary = { tracks: [{ artist: 'Artist 4', album: 'LP', track: 'Song 4', uri: uri('r') }], artists: [{ name: 'Artist 4', uri: 'spotify:artist:1' }] }
    const out = await importAll(
      [
        { name: 'Spotify Account Data/StreamingHistory_music_0.json', text: JSON.stringify([basic(3), basic(4), basic(6)].map((r, i) => ({ ...r, artistName: ['Artist 3', 'Artist 4', 'Nobody'][i], trackName: ['Song 3', 'Song 4', 'Song 9'][i] }))) },
        { name: 'Spotify Account Data/Playlist1.json', text: JSON.stringify(lib) },
        { name: 'Spotify Account Data/YourLibrary.json', text: JSON.stringify(yourLibrary) },
      ],
      [],
      [],
    )
    expect(out.library.map.size).toBe(2)
    expect(out.library.liked).toBe(1)
    expect(out.library.followed).toEqual(['Artist 4'])
    expect(out.plays.map((p) => p.uri)).toEqual([uri('q'), uri('r'), expect.stringMatching(/^name:/)])
    expect(out.files.filter((f) => f.kind === 'playlists' || f.kind === 'library')).toHaveLength(2)
    expect(describeImport(out.files, 3, 3, { tracks: 2, playlists: 1, liked: 1, covered: 0 })).toContain('Library: 2 tracks from 1 playlists and 1 liked songs.')
  })

  it('says what happened to each kind of file', () => {
    const text = describeImport(
      [
        { name: 'a', kind: 'extended', rows: 10, plays: 10 },
        { name: 'b', kind: 'basic', rows: 20, plays: 20, matched: 5 },
        { name: 'c', kind: 'failed', rows: 0, plays: 0, note: 'Unexpected token' },
      ],
      25,
      30,
    )
    expect(text).toContain('Added 25 plays (5 were already in the log).')
    expect(text).toContain('5 of 20 plays matched')
    expect(text).toContain('Unexpected token')
  })

  it('matches the same song across services', () => {
    expect(songKey('Seedhe Maut', 'Nanchaku (feat. MC STAN)')).toBe(songKey('Seedhe Maut', 'Nanchaku'))
  })
})
