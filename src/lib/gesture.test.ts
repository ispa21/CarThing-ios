import { describe, expect, it } from 'vitest'
import { swipeDirection, SWIPE_COMMIT_PX } from './gesture'

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
