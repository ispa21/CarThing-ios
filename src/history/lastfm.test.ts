import { describe, expect, it } from 'vitest'
import { readScrobbles, songKey, toPlays } from './lastfm'

const page = {
  recenttracks: {
    track: [
      { artist: { '#text': 'Seedhe Maut' }, name: 'Now Playing', '@attr': { nowplaying: 'true' } },
      { artist: { '#text': 'Seedhe Maut' }, name: 'Nanchaku (feat. MC STAN)', album: { '#text': 'Nayaab' }, date: { uts: '1700000300' } },
      { artist: { '#text': 'Four Tet' }, name: 'Baby', album: { '#text': '' }, date: { uts: '1700000000' } },
    ],
    '@attr': { page: '1', totalPages: '3', total: '600' },
  },
}

describe('Last.fm history', () => {
  it('reads a page: skips now-playing, oldest first', () => {
    const r = readScrobbles(page)
    expect(r.pages).toBe(3)
    expect(r.scrobbles.map((s) => s.title)).toEqual(['Baby', 'Nanchaku (feat. MC STAN)'])
    expect(r.scrobbles[1]).toMatchObject({ ts: 1700000300_000, album: 'Nayaab' })
  })

  it('matches the same song across services', () => {
    expect(songKey('Seedhe Maut', 'Nanchaku (feat. MC STAN)')).toBe(songKey('Seedhe Maut, MC STAN', 'Nanchaku'))
    expect(songKey('Four Tet', 'Baby - 2020 Remaster')).toBe(songKey('Four Tet', 'Baby'))
  })

  it('links matches to Spotify, keeps the rest for patterns only', () => {
    const known = new Map([[songKey('Four Tet', 'Baby'), { uri: 'spotify:track:baby', title: 'Baby', artist: 'Four Tet', album: 'Sixteen Oceans', art: null, durationMs: 240_000 }]])
    const { plays, matched } = toPlays(readScrobbles(page).scrobbles, known)
    expect(matched).toBe(1)
    expect(plays[0]).toMatchObject({ uri: 'spotify:track:baby', ts: 1700000000_000 - 240_000, skipped: false })
    expect(plays[1].uri.startsWith('lastfm:')).toBe(true)
  })
})
