import { describe, expect, it } from 'vitest'
import type { LibraryPlaylist, LibraryTrack } from '../history/library'
import type { Play } from '../history/types'
import { buildSession, daySeed, stories, type Inputs } from './engine'
import { clusterStations, tune } from './stations'
import { DAY, rng, shuffle, trackStats } from './stats'

const NOW = Date.parse('2026-09-01T12:00:00Z')

const lib = (i: number, over: Partial<LibraryTrack> = {}): LibraryTrack => ({
  uri: `spotify:track:t${i}`,
  title: `Track ${i}`,
  artist: `Artist ${i % 5}`,
  album: null,
  art: null,
  durationMs: 200_000,
  addedAt: null,
  liked: true,
  playlists: [],
  ...over,
})

const play = (t: { uri: string; artist: string; title?: string }, ts: number, over: Partial<Play> = {}): Play => ({
  uri: t.uri,
  title: t.title ?? t.uri,
  artist: t.artist,
  album: null,
  art: null,
  durationMs: 200_000,
  ts,
  playedMs: 200_000,
  skipped: false,
  source: 'import',
  ...over,
})

describe('stats', () => {
  it('counts starts, listens, skips and plays-through', () => {
    const t = { uri: 'spotify:track:a', artist: 'A' }
    const s = trackStats([play(t, 3), play(t, 1, { skipped: true, playedMs: 5_000 }), play(t, 2, { skipped: true, playedMs: 60_000 })]).get(t.uri)!
    expect([s.starts, s.listens, s.skips, s.through, s.first, s.last, s.times]).toEqual([3, 2, 2, 1, 1, 3, [2, 3]])
  })

  it('shuffles deterministically for a seed', () => {
    const list = Array.from({ length: 20 }, (_, i) => i)
    expect(shuffle(list, rng(7))).toEqual(shuffle(list, rng(7)))
    expect(shuffle(list, rng(7))).not.toEqual(list)
    expect([...shuffle(list, rng(7))].sort((a, b) => a - b)).toEqual(list)
  })
})

describe('buildSession', () => {
  const library = Array.from({ length: 60 }, (_, i) => lib(i))
  // 0–19 familiar (4 recent listens), 20–39 forgotten (one listen), 40–59 never played.
  const plays = [
    ...library.slice(0, 20).flatMap((t) => [1, 2, 3, 4].map((d) => play(t, NOW - d * DAY))),
    ...library.slice(20, 40).map((t) => play(t, NOW - 200 * DAY)),
  ]
  const inputs: Inputs = { plays, library, now: NOW }

  it('fills about the length asked for, in the mix’s shares', () => {
    const out = buildSession(inputs, { minutes: 60, mix: 'safe', source: 'liked', seed: 1 })
    const total = out.reduce((s, t) => s + t.durationMs, 0)
    expect(total).toBeGreaterThanOrEqual(60 * 60_000 - 90_000)
    expect(total).toBeLessThan(60 * 60_000 + 200_000)
    const familiar = out.filter((t) => t.kind === 'familiar').length
    expect(familiar / out.length).toBeGreaterThan(0.7)
    const chaos = buildSession(inputs, { minutes: 60, mix: 'chaos', source: 'liked', seed: 1 })
    expect(chaos.filter((t) => t.kind === 'never').length / chaos.length).toBeGreaterThanOrEqual(0.45)
  })

  it('is stable for a seed and never repeats a track', () => {
    const a = buildSession(inputs, { minutes: 90, mix: 'curious', source: 'liked', seed: 3 })
    expect(a).toEqual(buildSession(inputs, { minutes: 90, mix: 'curious', source: 'liked', seed: 3 }))
    expect(new Set(a.map((t) => t.uri)).size).toBe(a.length)
  })

  it('keeps to the station’s artists and the chosen source', () => {
    const out = buildSession(inputs, { minutes: 30, mix: 'curious', artists: ['Artist 1'], source: 'liked', seed: 1 })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((t) => t.artist === 'Artist 1')).toBe(true)
    expect(buildSession(inputs, { minutes: 30, mix: 'safe', source: 'playlists', seed: 1 })).toEqual([])
  })

  it('stops when the library runs dry', () => {
    const out = buildSession({ plays: [], library: library.slice(0, 3), now: NOW }, { minutes: 120, mix: 'safe', source: 'liked', seed: 1 })
    expect(out).toHaveLength(3)
  })
})

describe('stories', () => {
  it('tells nothing without data', () => {
    expect(stories({ plays: [], library: [], now: NOW }, 1)).toEqual([])
  })

  it('finds the forgotten shelf and deep cuts', () => {
    const library = Array.from({ length: 30 }, (_, i) => lib(i, { artist: i < 10 ? 'Core' : 'Other', addedAt: Date.parse('2021-05-01') }))
    const plays = library.slice(0, 3).flatMap((t) => [1, 2, 3].map((d) => play(t, NOW - d * DAY)))
    const ids = stories({ plays, library, now: NOW }, 1)
    const shelf = ids.find((s) => s.id === 'forgotten')
    expect(shelf).toMatchObject({ count: 27, year: 2021 })
    expect(ids.find((s) => s.id === 'deepcuts')).toMatchObject({ artist: 'Core' })
  })

  it('finds almosts: played a few times on different days, never saved', () => {
    const plays = [1, 2, 3].flatMap((i) => [play({ uri: `spotify:track:x${i}`, artist: 'X' }, NOW - 10 * DAY), play({ uri: `spotify:track:x${i}`, artist: 'X' }, NOW - 2 * DAY)])
    expect(stories({ plays, library: [], now: NOW }, 1).find((s) => s.id === 'almosts')).toMatchObject({ count: 3 })
  })

  it('finds a ghost: a track played hard for a season, then never again', () => {
    const t = { uri: 'spotify:track:g', artist: 'G' }
    const plays = Array.from({ length: 10 }, (_, i) => play(t, NOW - 300 * DAY + i * 5 * DAY))
    expect(stories({ plays, library: [], now: NOW }, 1).find((s) => s.id === 'ghosts')).toMatchObject({ listens: 10 })
  })

  it('finds a three-song universe and a skip paradox', () => {
    const [a, b, c] = ['a', 'b', 'c'].map((x) => ({ uri: `spotify:track:${x}`, artist: x }))
    const plays = [0, 1, 2].flatMap((d) => [a, b, c].map((t, i) => play(t, NOW - d * DAY + i * 240_000)))
    const s = { uri: 'spotify:track:s', artist: 's' }
    for (let i = 0; i < 10; i++) plays.push(play(s, NOW - (i + 5) * DAY, i < 6 ? { skipped: true, playedMs: 10_000 } : {}))
    const out = stories({ plays, library: [], now: NOW }, 1)
    expect(out.find((x) => x.id === 'three')).toMatchObject({ sessions: 3 })
    expect(out.find((x) => x.id === 'skip')).toMatchObject({ starts: 10, skips: 6, through: 4 })
  })

  it('finds the long haul across three years', () => {
    const t = { uri: 'spotify:track:l', artist: 'L' }
    const plays = [2022, 2024, 2026].map((y) => play(t, Date.parse(`${y}-03-01`)))
    const story = stories({ plays, library: [], now: NOW }, 1).find((s) => s.id === 'longhaul')
    expect(story && story.id === 'longhaul' && story.perYear.map((p) => p.listens)).toEqual([1, 0, 1, 0, 1])
  })

  it('keeps the day’s seed through the day', () => {
    expect(daySeed(NOW)).toBe(daySeed(NOW + 3_600_000))
  })
})

describe('stations', () => {
  it('clusters artists that share playlists, and names them for the playlist', () => {
    const playlists: LibraryPlaylist[] = [
      { id: 'p1', name: 'Night Drive', count: 12 },
      { id: 'p2', name: 'Morning', count: 12 },
    ]
    const library = [
      ...Array.from({ length: 12 }, (_, i) => lib(i, { artist: ['A', 'B', 'C'][i % 3], playlists: ['p1'] })),
      ...Array.from({ length: 12 }, (_, i) => lib(100 + i, { artist: ['D', 'E', 'F'][i % 3], playlists: ['p2'] })),
    ]
    // A second shared playlist makes the pairs strong enough (≥ 2).
    for (const t of library) t.playlists.push(t.playlists[0] === 'p1' ? 'p1b' : 'p2b')
    playlists.push({ id: 'p1b', name: 'x', count: 12 }, { id: 'p2b', name: 'y', count: 12 })
    const stations = clusterStations(library, playlists, [])
    expect(stations).toHaveLength(2)
    expect(stations.map((s) => [...s.artists].sort().join(''))).toEqual(expect.arrayContaining(['ABC', 'DEF']))
    expect(stations.map((s) => s.name)).toEqual(expect.arrayContaining(['night drive', 'morning']))
  })

  it('spreads stations across the dial', () => {
    const s = { id: '', name: '', freq: 0, artists: [], uris: [], source: '', about: '' }
    expect(tune([s, s, s]).map((x) => x.freq)).toEqual([88.1, 97.8, 107.5])
    expect(tune([s])[0].freq).toBe(97.8)
  })
})
