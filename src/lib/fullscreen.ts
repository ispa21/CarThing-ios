// Fullscreen / standalone. Never required: iPhone Safari has no element fullscreen,
// so there the answer is "Add to Home Screen".

import { useSyncExternalStore } from 'react'

export const fullscreenSupported = () => typeof document !== 'undefined' && document.fullscreenEnabled === true

/** Installed app. (Not `display-mode: fullscreen` — that also matches element fullscreen, which must stay exitable.) */
export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)

/** Offer our own full-screen key only where it can work and isn't already an installed app. */
export const canOfferFullscreen = () => fullscreenSupported() && !isStandalone()

export async function toggleFullscreen(): Promise<boolean> {
  if (!fullscreenSupported()) return false
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return false
    }
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    // Where allowed (Android), keep the deck sideways while fullscreen.
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
    orientation.lock?.('landscape').catch(() => {})
    return true
  } catch {
    return false
  }
}

const subscribe = (cb: () => void) => {
  document.addEventListener('fullscreenchange', cb)
  return () => document.removeEventListener('fullscreenchange', cb)
}

export const useIsFullscreen = () => useSyncExternalStore(subscribe, () => document.fullscreenElement !== null)
