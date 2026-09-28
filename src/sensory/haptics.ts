// Haptics adapter: a semantic level in, whatever this device can actually render out.
//
// - Android (Chrome, Samsung Internet, Edge): navigator.vibrate with plain on/off patterns.
//   Chrome only asks that the page has been tapped once (sticky activation), so a haptic
//   after an await (queue-add) still plays.
// - iPhone, iOS 18+: no Vibration API. The one haptic Safari has is the tick it plays when
//   a real finger toggles an <input type=checkbox switch>. Since iOS 26.5 a scripted
//   label.click() no longer counts (WebKit fc1ef83), so code can't play a haptic at all.
//   Controls carry <HapticSwitch>; feedback.play only decides whether that tap ticks.
// - Everything else (desktop, iPad, Firefox, iOS 17 and earlier): silent, and Settings hides
//   the Haptics switch.

import type { HapticName } from './types'

/**
 * Android patterns in ms (on, off, on…). No PWM "intensity": pulses under ~10 ms aren't
 * felt on most phone vibrators, so levels differ by length and rhythm instead.
 * ponytail: tuned by reasoning, not on a device lab. Adjust here after trying real phones.
 */
export const VIBRATION: Record<HapticName, readonly number[]> = {
  selection: [12],
  light: [18],
  medium: [26],
  heavy: [40],
  success: [18, 70, 30], // short, then firmer: done
  warning: [30, 110, 30], // two even, slow
  error: [30, 50, 30, 50, 30], // three quick
}

export type HapticMechanism = 'vibrate' | 'ios-switch' | null

/** The part of `window` detection reads (tests pass a fake). */
export interface HapticEnv {
  navigator: { userAgent: string; vibrate?: unknown }
  matchMedia(query: string): { matches: boolean }
  CSS?: { supports(property: string, value: string): boolean }
}

export function detectHaptics(env: HapticEnv | undefined): HapticMechanism {
  // Desktops, touchscreen laptops included (their primary pointer is fine), have nothing to feel.
  if (!env || !env.matchMedia('(pointer: coarse)').matches) return null
  // Chromium-based browsers. Firefox for Android keeps navigator.vibrate, but it has done
  // nothing since 79 (and desktop Firefox removed it in 129).
  if (typeof env.navigator.vibrate === 'function') return /Firefox\//.test(env.navigator.userAgent) ? null : 'vibrate'
  // iPhone only: iPads have no Taptic Engine (and report a Mac UA). content-visibility shipped
  // in Safari 18.0, the release that added the switch haptic.
  if (/iPhone/.test(env.navigator.userAgent) && env.CSS?.supports('content-visibility', 'auto')) return 'ios-switch'
  return null
}

export const mechanism = detectHaptics(typeof window === 'undefined' ? undefined : window)

/** Capability, for the Settings switch: only offer Haptics where it can be felt. */
export const hapticsAvailable = () => mechanism !== null

let tickWanted = false

export function triggerHaptic(level: HapticName, m: HapticMechanism = mechanism, nav: { vibrate(pattern: number[]): boolean } = navigator) {
  if (m === 'vibrate') nav.vibrate([...VIBRATION[level]])
  else if (m === 'ios-switch') tickWanted = true // HapticSwitch lets this tap reach its switch
}

/**
 * A finger landed on a HapticSwitch's label. Once the click has been dispatched, the label
 * forwards it to its switch, and that is the tick. The microtask runs when React's click
 * listener returns, which is after the button's onClick and before that forward. Unless
 * onClick asked for a haptic through feedback.play, it cancels the forward, so Haptics off
 * and events without a haptic stay silent. (A stopPropagation() can't skip a microtask.)
 */
export function onSwitchTap(tap: Event) {
  tickWanted = false
  queueMicrotask(() => {
    if (!tickWanted) tap.preventDefault()
  })
}
