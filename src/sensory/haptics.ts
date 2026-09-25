// WebHaptics adapter. Android: Vibration API. iOS 18+ Safari: WebHaptics toggles
// a hidden <input switch>, which only works synchronously inside a user gesture —
// so feedback.play() must be called directly from the event handler.

import { WebHaptics } from 'web-haptics'
import type { HapticName } from './types'

let instance: WebHaptics | null = null

/** Touch devices only; desktops have nothing to vibrate. */
export function hapticsAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return WebHaptics.isSupported || (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches)
}

export function triggerHaptic(name: HapticName) {
  if (!hapticsAvailable()) return
  instance ??= new WebHaptics() // one instance for the app's lifetime
  instance.trigger(name).catch(() => {})
}
