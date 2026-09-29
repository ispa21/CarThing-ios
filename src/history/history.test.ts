import { describe, expect, it } from 'vitest'
import { addToCrate, CRATE_TTL_MS, EMPTY_CRATE, inCrate, pruneCrate, removeFromCrate } from './crate'
import { fromRecent, mergePlays } from './merge'
import { dayKey, SESSION_GAP_MS, sessionsFrom, stacks, streak } from './sessions'
import { isSkip, observe, type Snapshot } from './tracker'
import type { Play } from './types'

const track = (uri: string, durationMs = 200_000) => ({ uri, title: uri, artist: 'A', album: null, art: null, durationMs })
const snap = (uri: string, progressMs: number, durationMs = 200_000): Snapshot => ({ ...track(uri, durationMs), progressMs, isPlaying: true })
const play = (uri: string, ts: number, playedMs = 180_000, skipped = false, source: Play['source'] = 'live'): Play => ({
  ...track(uri),
  ts,
  playedMs,
  skipped,
  source,
})

describe('tracker', () => {
  it('opens on the first snapshot and closes when the track changes', () => {
    let r = observe(null, snap('a', 10_000), 1_000_000)
    expect(r.open?.startedAt).toBe(990_000)
    r = observe(r.open, snap('a', 190_000), 1_180_000)
    r = observe(r.open, snap('b', 1000), 1_195_000)
    expect(r.closed).toMatchObject({ uri: 'a', ts: 990_000, playedMs: 190_000, skipped: false, source: 'live' })
    expect(r.open?.uri).toBe('b')
  })

  it('marks a track left early as skipped', () => {
    let r = observe(null, snap('a', 5000), 0)
    r = observe(r.open, snap('a', 40_000), 35_000)
    r = observe(r.open, snap('b', 0), 36_000)
    expect(r.closed?.skipped).toBe(true)
  })

  it('ignores flicks shorter than three seconds', () => {
    let r = observe(null, snap('a', 500), 0)
    r = observe(r.open, snap('b', 0), 1000)
    expect(r.closed).toBeNull()
  })

  it('closes on stop, and on a restart of the same track', () => {
    let r = observe(null, snap('a', 60_000), 60_000)
    r = observe(r.open, null, 70_000)
    expect(r.closed?.playedMs).toBe(60_000)
    r = observe(null, snap('a', 90_000), 0)
    r = observe(r.open, snap('a', 1000), 100_000)
    expect(r.closed?.playedMs).toBe(90_000)
    expect(r.open?.heardMs).toBe(1000)
  })

  it('counts nearly finished as played through', () => {
    expect(isSkip(185_000, 200_000)).toBe(false)
    expect(isSkip(100_000, 200_000)).toBe(true)
  })
})

describe('sessions', () => {
  it('splits on gaps and finds the longest unskipped run', () => {
    const t0 = 1_000_000_000
    const plays = [
      play('a', t0),
      play('b', t0 + 200_000, 30_000, true),
      play('c', t0 + 240_000),
      play('d', t0 + 440_000),
      play('e', t0 + 440_000 + 180_000 + SESSION_GAP_MS + 1),
    ]
    const s = sessionsFrom(plays, 13)
    expect(s.map((x) => x.n)).toEqual([13, 14])
    expect(s[0].plays).toHaveLength(4)
    expect(s[0].longestRun).toEqual({ length: 2, start: t0 + 240_000 })
    expect(s[0].heardMs).toBe(180_000 * 3 + 30_000)
  })

  it('counts a streak back from today, or from yesterday if today is empty so far', () => {
    const day = 24 * 3600_000
    const today = new Date(2026, 8, 29, 12).getTime()
    const plays = [play('a', today - day), play('b', today - 2 * day), play('c', today - 4 * day)]
    expect(streak(plays, today)).toBe(2)
    expect(streak([...plays, play('d', today)], today)).toBe(3)
    expect(dayKey(today)).toBe('2026-09-29')
  })

  it('stacks plays into time columns', () => {
    const start = 0
    const out = stacks([play('a', 60_000), play('b', 120_000), play('c', 30 * 60_000)], start)
    expect(out.map((x) => [x.col, x.level])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
    ])
  })
})

describe('mergePlays', () => {
  it('drops plays already logged, within a few minutes', () => {
    const existing = [play('a', 1_000_000)]
    const incoming = [play('a', 1_000_000 + 90_000, 0, false, 'recent'), play('a', 1_000_000 + 30 * 60_000, 0, false, 'recent'), play('b', 1_000_000, 0, false, 'recent')]
    expect(mergePlays(existing, incoming).map((p) => [p.uri, p.ts])).toEqual([
      ['a', 1_000_000 + 30 * 60_000],
      ['b', 1_000_000],
    ])
  })

  it('dedupes within the incoming batch too', () => {
    expect(mergePlays([], [play('a', 0), play('a', 1000)])).toHaveLength(1)
  })
})

describe('crate', () => {
  it('adds to the front, once', () => {
    let c = addToCrate(EMPTY_CRATE, track('a'), 1)
    c = addToCrate(c, track('b'), 2)
    c = addToCrate(c, track('a'), 3)
    expect(c.items.map((i) => i.uri)).toEqual(['b', 'a'])
    expect(inCrate(c, 'a')).toBe(true)
    expect(removeFromCrate(c, 'a').items.map((i) => i.uri)).toEqual(['b'])
  })

  it('empties old records from an unsaved crate only', () => {
    const c = addToCrate(addToCrate(EMPTY_CRATE, track('old'), 0), track('new'), CRATE_TTL_MS)
    expect(pruneCrate(c, CRATE_TTL_MS + 1).items.map((i) => i.uri)).toEqual(['new'])
    expect(pruneCrate({ ...c, savedAt: 5 }, CRATE_TTL_MS + 1).items).toHaveLength(2)
  })
})

describe('fromRecent', () => {
  it('places the play before the time Spotify logged it', () => {
    const p = fromRecent({ ...track('a', 200_000), playedAt: 1_000_000 })
    expect(p).toMatchObject({ ts: 800_000, playedMs: 200_000, skipped: false, source: 'recent' })
  })
})
