import { describe, expect, it } from 'vitest'
import { followReducer, isScrollKey, shouldAutoScroll, showJumpButton, type FollowEvent, type FollowMode } from './follow'

const run = (events: FollowEvent['type'][], start: FollowMode = 'following') =>
  events.reduce<FollowMode>((m, type) => followReducer(m, { type } as FollowEvent), start)

describe('manual scrolling', () => {
  const on = { timed: true, autoScroll: true }

  it('starts following and auto-scrolls', () => {
    expect(shouldAutoScroll('following', on)).toBe(true)
    expect(showJumpButton('following', { ...on, hasCurrent: true })).toBe(false)
  })

  it('1–3: a user scroll disables auto-follow and shows "Jump to current"', () => {
    const m = run(['userScroll'])
    expect(m).toBe('free')
    expect(shouldAutoScroll(m, on)).toBe(false)
    expect(showJumpButton(m, { ...on, hasCurrent: true })).toBe(true)
  })

  it('does not fight the user: repeated scrolls stay free', () => {
    expect(run(['userScroll', 'userScroll', 'userScroll'])).toBe('free')
  })

  it('4–5: jump returns to the current line and re-enables follow', () => {
    const m = run(['userScroll', 'jump'])
    expect(m).toBe('following')
    expect(shouldAutoScroll(m, on)).toBe(true)
    expect(showJumpButton(m, { ...on, hasCurrent: true })).toBe(false)
  })

  it('a new track resets to following', () => {
    expect(run(['userScroll', 'trackChange'])).toBe('following')
  })

  it('with auto-scroll off in Settings, never scrolls by itself but offers Jump', () => {
    const off = { timed: true, autoScroll: false }
    expect(shouldAutoScroll('following', off)).toBe(false)
    expect(showJumpButton('following', { ...off, hasCurrent: true })).toBe(true)
  })

  it('static (untimed) lyrics never auto-scroll or show Jump', () => {
    const untimed = { timed: false, autoScroll: true }
    expect(shouldAutoScroll('following', untimed)).toBe(false)
    expect(showJumpButton('free', { ...untimed, hasCurrent: false })).toBe(false)
  })

  it('no Jump button before the first line starts', () => {
    expect(showJumpButton('free', { ...on, hasCurrent: false })).toBe(false)
  })

  it('recognises scroll keys', () => {
    expect(['ArrowDown', 'PageUp', 'End'].every(isScrollKey)).toBe(true)
    // Space toggles playback in the reader, so it must not drop auto-follow
    expect(['a', 'Enter', 'Tab', ' '].some(isScrollKey)).toBe(false)
  })
})
