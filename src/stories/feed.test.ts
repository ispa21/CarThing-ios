import { describe, expect, it } from 'vitest'
import type { LibraryPlaylist, LibraryTrack } from '../history/library'
import type { Play } from '../history/types'
import { buildFeed, capsuleDue, nextSession } from './feed'
import { buildModel } from './model'
import { arc, buildRiskSession, bucketCounts, type SessionTrack } from './session'
import { DAY, rng } from './stats'

const NOW = Date.parse('2026-09-29T21:00:00Z')

/** A listener with two sounds (rap at night, electronic in the evening), a drift toward electronic, a loop, a fling, a dead playlist. */
function world() {
  const rand = rng(11)
  const RAP = ['Seedhe Maut', 'KR$NA', 'Prabh Deep', 'Yashraj', 'Hanumankind']
  const ELEC = ['Four Tet', 'Floating Points', 'Jon Hopkins', 'Burial', 'Bonobo']
  const library: LibraryTrack[] = []
  const add = (artist: string, i: number, playlists: string[], liked = true, addedAt = Date.parse('2023-01-01')) =>
    library.push({ uri: `spotify:track:${artist.replace(/\W/g, '').slice(0, 8)}${String(i).padStart(3, '0')}`.padEnd(36, 'x'), title: `${artist} ${i}`, artist, album: `${artist} LP`, art: null, durationMs: 200_000 + i * 1000, addedAt, liked, playlists })
  RAP.forEach((a) => Array.from({ length: 12 }, (_, i) => add(a, i, ['rap', i < 6 ? 'night' : 'rap2'])))
  ELEC.forEach((a) => Array.from({ length: 12 }, (_, i) => add(a, i, ['elec', 'elec2'])))
  Array.from({ length: 8 }, (_, i) => add('Fling Artist', i, ['misc']))
  Array.from({ length: 8 }, (_, i) => add('Old Flame', i, ['dead']))
  // An unplayed, never-heard corner of the library, linked to rap by a playlist.
  Array.from({ length: 10 }, (_, i) => add('Unknown Neighbour', i, ['rap']))
  const playlists: LibraryPlaylist[] = [
    { id: 'rap', name: 'Rap', count: 70 },
    { id: 'rap2', name: 'Rap 2', count: 30 },
    { id: 'night', name: 'Morning Coffee', count: 30 },
    { id: 'elec', name: 'Electronic', count: 60 },
    { id: 'elec2', name: 'Electronic too', count: 60 },
    { id: 'misc', name: 'Misc', count: 8 },
    { id: 'dead', name: 'Old Days', count: 8 },
  ]
  const by = (a: string) => library.filter((t) => t.artist === a)
  const plays: Play[] = []
  const listen = (t: LibraryTrack, ts: number, skipped = false) => plays.push({ uri: t.uri, title: t.title, artist: t.artist, album: t.album, art: null, durationMs: t.durationMs, ts, playedMs: skipped ? 8000 : t.durationMs, skipped, source: 'import' })
  // 300 days of evenings. Early on mostly rap at 23:00; later mostly electronic at 19:00.
  for (let d = 300; d >= 1; d--) {
    const late = d < 120
    const artists = late ? (rand() < 0.75 ? ELEC : RAP) : rand() < 0.8 ? RAP : ELEC
    const hour = artists === RAP ? 23 : 19
    let ts = NOW - d * DAY + (hour - 21) * 3600_000
    for (let k = 0; k < 6; k++) {
      const pool = by(artists[Math.floor(rand() * 3)]).slice(0, 5) // the core: 3 artists × 5 tracks each
      const t = pool[Math.floor(rand() * pool.length)]
      listen(t, ts)
      ts += t.durationMs + 1000
    }
  }
  // The fling: one week, a year ago.
  for (let k = 0; k < 8; k++) listen(by('Fling Artist')[k % 3], NOW - 250 * DAY + k * 3600_000)
  // The dead playlist: loved long ago.
  for (let k = 0; k < 30; k++) listen(by('Old Flame')[k % 4], NOW - 400 * DAY + k * DAY)
  return { library, playlists, plays: plays.sort((a, b) => a.ts - b.ts) }
}

describe('the taste model', () => {
  const w = world()
  const m = buildModel({ ...w, now: NOW })

  it('finds rooms from shared playlists and sessions, not one blob', () => {
    const rap = m.rooms.find((r) => r.artists.includes('Seedhe Maut'))
    const elec = m.rooms.find((r) => r.artists.includes('Four Tet'))
    expect(rap && elec).toBeTruthy()
    expect(rap!.id).not.toBe(elec!.id)
    expect(rap!.band).toBe('late night')
  })

  it('knows the core, and how risky every track is', () => {
    expect(m.core.size).toBeGreaterThan(10)
    const unknown = w.library.find((t) => t.artist === 'Unknown Neighbour')!
    expect(m.bucket(unknown.uri)).toBe('adjacent')
    const core = [...m.core][0]
    expect(m.bucket(core)).toBe('core')
  })
})

describe('the session engine', () => {
  const m = buildModel({ ...world(), now: NOW })

  it('keeps safe sessions safe and chaos sessions uncertain', () => {
    const safe = bucketCounts(buildRiskSession(m, { minutes: 60, risk: 'safe', seed: 1 }))
    const chaos = bucketCounts(buildRiskSession(m, { minutes: 60, risk: 'chaos', seed: 1 }))
    expect(safe.core + safe.familiar).toBeGreaterThan(chaos.core + chaos.familiar)
    expect(chaos.adjacent + chaos.experiment + chaos.wild).toBeGreaterThan(safe.adjacent + safe.experiment + safe.wild)
  })

  it('fills about the length, is stable for a seed, and never repeats a track', () => {
    const a = buildRiskSession(m, { minutes: 45, risk: 'curious', seed: 5 })
    expect(a).toEqual(buildRiskSession(m, { minutes: 45, risk: 'curious', seed: 5 }))
    expect(new Set(a.map((t) => t.uri)).size).toBe(a.length)
    const ms = a.reduce((s, t) => s + t.durationMs, 0)
    expect(ms).toBeGreaterThan(45 * 60_000 - 200_000)
  })

  it('opens familiar and lands on the surest track', () => {
    const t = (bucket: SessionTrack['bucket'], i: number): SessionTrack => ({ uri: `u${i}`, title: '', artist: '', album: null, art: null, durationMs: 1, bucket })
    const out = arc([t('wild', 1), t('core', 2), t('experiment', 3), t('familiar', 4), t('adjacent', 5)])
    expect(out[out.length - 1].bucket).toBe('core')
    expect(['core', 'familiar']).toContain(out[0].bucket)
    expect(out).toHaveLength(5)
  })
})

describe('the feed', () => {
  const w = world()
  const feed = buildFeed({ ...w, now: NOW }, 3)
  const ids = feed.cards.map((c) => c.id)

  it('tells the stories the evidence supports', () => {
    for (const id of ['core', 'secret-genre', 'drift', 'one-night', 'disappearing', 'wrong-label', 'loop', 'dna', 'eras', 'duplicates', 'thread']) expect(ids).toContain(id)
  })

  it('ends every story in an action, and picks a drop from the surprising ones', () => {
    expect(feed.cards.every((c) => c.actions.length > 0)).toBe(true)
    expect(feed.drop && feed.drop.weight >= 0.65).toBe(true)
  })

  it('tells nothing without data, and hides what you set aside', () => {
    expect(buildFeed({ plays: [], library: [], now: NOW }, 1).cards).toEqual([])
    const hidden = buildFeed({ ...w, now: NOW, dismissed: { core: NOW + DAY } }, 3)
    expect(hidden.cards.map((c) => c.id)).not.toContain('core')
  })

  it('builds your next N minutes to length', () => {
    const next = nextSession(feed.model, 15, 1)
    expect(next.tracks.length).toBeGreaterThan(2)
    expect(next.artists.length).toBeGreaterThan(0)
  })

  it('seals one capsule a month', () => {
    expect(capsuleDue([], NOW)).toBe(true)
    expect(capsuleDue([{ at: NOW - DAY, artists: [], rooms: [], emerging: [], uris: [] }], NOW)).toBe(true === (new Date(NOW - DAY).getMonth() !== new Date(NOW).getMonth()))
  })
})
