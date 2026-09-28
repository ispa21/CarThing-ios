import { describe, expect, it, vi } from 'vitest'
import { detectHaptics, onSwitchTap, triggerHaptic, VIBRATION, type HapticEnv } from './haptics'
import type { HapticName } from './types'

const pulses = (p: readonly number[]) => p.filter((_, i) => i % 2 === 0)
const gaps = (p: readonly number[]) => p.filter((_, i) => i % 2 === 1)

describe('Android vibration patterns', () => {
  const levels = Object.keys(VIBRATION) as HapticName[]

  it('every level is plain on/off milliseconds, each pulse long enough to feel', () => {
    for (const level of levels) {
      const p = VIBRATION[level]
      expect(p.length % 2, `${level} ends on a pulse`).toBe(1)
      for (const on of pulses(p)) expect(on, `${level} pulse`).toBeGreaterThanOrEqual(12)
      for (const off of gaps(p)) expect(off, `${level} gap`).toBeGreaterThanOrEqual(40) // a gap shorter than this blurs pulses into one buzz
      expect(p.reduce((a, b) => a + b, 0), `${level} total`).toBeLessThanOrEqual(250)
    }
  })

  it('single taps get firmer from selection to heavy', () => {
    const taps = (['selection', 'light', 'medium', 'heavy'] as const).map((l) => VIBRATION[l])
    for (const t of taps) expect(t).toHaveLength(1)
    const ms = taps.map((t) => t[0])
    expect(ms).toEqual([...ms].sort((a, b) => a - b))
    expect(new Set(ms).size).toBe(4)
  })

  it('success, warning and error are distinct rhythms, not just lengths', () => {
    const { success, warning, error } = VIBRATION
    expect(pulses(success)).toHaveLength(2)
    expect(pulses(warning)).toHaveLength(2)
    expect(pulses(error)).toHaveLength(3)
    expect(success[0]).toBeLessThan(success[2]) // rising: done
    expect(warning[0]).toBe(warning[2]) // even
    expect(warning[1]).toBeGreaterThan(success[1]) // and slower
  })
})

function env({ coarse = true, vibrate = false, ua = '', contentVisibility = true } = {}): HapticEnv {
  return {
    navigator: { userAgent: ua, ...(vibrate && { vibrate: () => true }) },
    matchMedia: (q) => ({ matches: q === '(pointer: coarse)' && coarse }),
    CSS: { supports: (prop) => prop === 'content-visibility' && contentVisibility },
  }
}
const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
const IPHONE_HOME_SCREEN = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15'
const FIREFOX_ANDROID = 'Mozilla/5.0 (Android 15; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0'

describe('detectHaptics', () => {
  it('Android Chromium browsers vibrate', () => {
    expect(detectHaptics(env({ vibrate: true, ua: 'Android' }))).toBe('vibrate')
  })
  it('iPhone on iOS 18+ uses the switch, in Safari and from the Home Screen', () => {
    expect(detectHaptics(env({ ua: IPHONE_SAFARI }))).toBe('ios-switch')
    expect(detectHaptics(env({ ua: IPHONE_HOME_SCREEN }))).toBe('ios-switch')
  })
  it('nothing to feel: desktop (even with navigator.vibrate), iPad, iOS 17, Firefox, no window', () => {
    expect(detectHaptics(env({ coarse: false, vibrate: true }))).toBeNull()
    expect(detectHaptics(env({ coarse: false, ua: IPHONE_SAFARI }))).toBeNull()
    expect(detectHaptics(env({ ua: IPAD }))).toBeNull()
    expect(detectHaptics(env({ ua: IPHONE_SAFARI, contentVisibility: false }))).toBeNull()
    expect(detectHaptics(env({ ua: FIREFOX_ANDROID, vibrate: true }))).toBeNull() // exposed, but a no-op
    expect(detectHaptics(undefined)).toBeNull()
  })
})

describe('triggerHaptic', () => {
  it('vibrate: one call with the level’s pattern', () => {
    const nav = { vibrate: vi.fn(() => true) }
    triggerHaptic('success', 'vibrate', nav)
    expect(nav.vibrate).toHaveBeenCalledTimes(1)
    expect(nav.vibrate).toHaveBeenCalledWith([...VIBRATION.success])
  })
  it('unsupported and iPhone never call vibrate', () => {
    const nav = { vibrate: vi.fn(() => true) }
    triggerHaptic('error', null, nav)
    triggerHaptic('error', 'ios-switch', nav)
    expect(nav.vibrate).not.toHaveBeenCalled()
  })
})

describe('iPhone switch tap', () => {
  // The label's onClick, then the button's onClick, then (microtask) the forward to the switch.
  async function ticks(onClick: () => void) {
    const click = new Event('click', { cancelable: true })
    onSwitchTap(click)
    onClick()
    await Promise.resolve()
    return !click.defaultPrevented // not cancelled: the label forwards to the switch and iOS ticks
  }

  it('ticks when the tap’s handler asks for a haptic', async () => {
    expect(await ticks(() => triggerHaptic('selection', 'ios-switch'))).toBe(true)
  })
  it('stays silent when it doesn’t (Haptics off, event without a haptic)', async () => {
    expect(await ticks(() => {})).toBe(false)
  })
  it('each tap decides afresh', async () => {
    await ticks(() => triggerHaptic('heavy', 'ios-switch'))
    expect(await ticks(() => {})).toBe(false)
  })
})
