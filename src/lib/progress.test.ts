import { describe, expect, it } from 'vitest'
import { formatTime, interpolateProgress } from './progress'

describe('interpolateProgress', () => {
  const snap = { progressMs: 120_000, durationMs: 222_000, isPlaying: true }

  it('advances locally while playing', () => {
    expect(interpolateProgress(snap, 1000, 3500)).toBe(122_500)
  })
  it('holds still while paused', () => {
    expect(interpolateProgress({ ...snap, isPlaying: false }, 1000, 60_000)).toBe(120_000)
  })
  it('clamps at the track duration', () => {
    expect(interpolateProgress(snap, 0, 10_000_000)).toBe(222_000)
  })
  it('ignores clock going backwards', () => {
    expect(interpolateProgress(snap, 5000, 4000)).toBe(120_000)
  })
  it('does not clamp when duration is unknown', () => {
    expect(interpolateProgress({ ...snap, durationMs: 0 }, 0, 1000)).toBe(121_000)
  })
})

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [999, '0:00'],
    [134_000, '2:14'],
    [222_000, '3:42'],
    [3_723_000, '1:02:03'],
    [-100, '0:00'],
  ])('%i → %s', (ms, out) => expect(formatTime(ms)).toBe(out))
})
