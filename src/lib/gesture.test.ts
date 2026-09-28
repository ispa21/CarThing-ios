import { describe, expect, it } from 'vitest'
import { shouldDismissSheet, swipeDirection, SWIPE_COMMIT_PX } from './gesture'

describe('swipeDirection (artwork swipe to skip)', () => {
  it('swipe left past the threshold → next, right → previous', () => {
    expect(swipeDirection(-SWIPE_COMMIT_PX, 0)).toBe('next')
    expect(swipeDirection(SWIPE_COMMIT_PX + 10, 0)).toBe('previous')
  })
  it('a quick flick commits even when short', () => {
    expect(swipeDirection(-20, -900)).toBe('next')
    expect(swipeDirection(15, 700)).toBe('previous')
  })
  it('a small, slow drag springs back (no skip)', () => {
    expect(swipeDirection(-40, -100)).toBeNull()
    expect(swipeDirection(0, 0)).toBeNull()
  })
})

describe('shouldDismissSheet (drag a sheet to close it)', () => {
  it('closes past 30% of the sheet, capped at 120px', () => {
    expect(shouldDismissSheet(100, 2000, 300)).toBe(true) // 30% of 300 = 90
    expect(shouldDismissSheet(80, 2000, 300)).toBe(false)
    expect(shouldDismissSheet(121, 2000, 900)).toBe(true) // cap
  })
  it('a quick flick closes it whatever the distance', () => {
    expect(shouldDismissSheet(40, 60, 600)).toBe(true)
  })
  it('a slow nudge or a jitter never closes it', () => {
    expect(shouldDismissSheet(40, 800, 600)).toBe(false)
    expect(shouldDismissSheet(10, 5, 600)).toBe(false)
    expect(shouldDismissSheet(-50, 20, 600)).toBe(false)
  })
})
