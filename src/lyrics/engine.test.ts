import { describe, expect, it } from 'vitest'
import { getCurrentLyricIndex, lyricsEngine, PLAYING_LEAD_MS } from './engine'
import { parseLRC } from './lrc'
import { canTimeSync } from './policy'

const lyrics = parseLRC(`
[00:10.00]one
[00:20.00]two
[00:30.00]three
[00:40.00]four
[00:50.00]five
[01:00.00]six
`)

describe('getCurrentLyricIndex', () => {
  it.each([
    [0, -1],
    [9_999, -1],
    [10_000, 0],
    [19_999, 0],
    [20_000, 1],
    [45_000, 3],
    [60_000, 5],
    [999_999, 5],
  ])('%i ms → line %i', (ms, idx) => expect(getCurrentLyricIndex(lyrics, ms)).toBe(idx))

  it('handles no lyrics', () => {
    expect(getCurrentLyricIndex([], 5000)).toBe(-1)
  })

  it('picks the last of lines sharing a timestamp', () => {
    const dup = [
      { startMs: 0, text: 'a' },
      { startMs: 1000, text: 'b' },
      { startMs: 1000, text: 'c' },
    ]
    expect(getCurrentLyricIndex(dup, 1000)).toBe(2)
  })

  it('matches a linear scan for every position (property check)', () => {
    const linear = (ms: number) => lyrics.reduce((acc, l, i) => (l.startMs <= ms ? i : acc), -1)
    for (let ms = 0; ms < 70_000; ms += 250) expect(getCurrentLyricIndex(lyrics, ms)).toBe(linear(ms))
  })
})

describe('lyricsEngine', () => {
  it('returns the current line with previous/next context', () => {
    const out = lyricsEngine({ lyrics, playbackPositionMs: 41_000, isPlaying: false })
    expect(out.currentIndex).toBe(3)
    expect(out.currentLine?.text).toBe('four')
    expect(out.previousLines.map((l) => l.text)).toEqual(['two', 'three'])
    expect(out.nextLines.map((l) => l.text)).toEqual(['five', 'six'])
  })

  it('before the first line: nothing current, everything upcoming', () => {
    const out = lyricsEngine({ lyrics, playbackPositionMs: 0, isPlaying: true, after: 2 })
    expect(out.currentIndex).toBe(-1)
    expect(out.currentLine).toBeNull()
    expect(out.previousLines).toEqual([])
    expect(out.nextLines.map((l) => l.text)).toEqual(['one', 'two'])
  })

  it('leads slightly while playing, not while paused', () => {
    const justBefore = 20_000 - PLAYING_LEAD_MS / 2
    expect(lyricsEngine({ lyrics, playbackPositionMs: justBefore, isPlaying: true }).currentIndex).toBe(1)
    expect(lyricsEngine({ lyrics, playbackPositionMs: justBefore, isPlaying: false }).currentIndex).toBe(0)
  })

  it('respects custom window sizes at the edges', () => {
    const out = lyricsEngine({ lyrics, playbackPositionMs: 60_000, isPlaying: false, before: 10, after: 10 })
    expect(out.previousLines).toHaveLength(5)
    expect(out.nextLines).toHaveLength(0)
  })
})

describe('canTimeSync (Spotify policy gate)', () => {
  it('never time-syncs lyrics to Spotify playback', () => {
    expect(canTimeSync('spotify')).toBe(false)
  })
  it('allows the local demo clock', () => {
    expect(canTimeSync('demo')).toBe(true)
  })
})
