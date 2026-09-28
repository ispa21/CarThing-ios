import { useSyncExternalStore } from 'react'

/** Phones held upright get the compact deck; everything else gets the landscape deck. */
export const PHONE_PORTRAIT_QUERY = '(orientation: portrait) and (max-width: 599px)'

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(PHONE_PORTRAIT_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export const usePhonePortrait = () => useSyncExternalStore(subscribe, () => window.matchMedia(PHONE_PORTRAIT_QUERY).matches)

/** The landscape deck (art beside the console) — the same breakpoint the CSS uses. */
export const LANDSCAPE_DECK_QUERY = '(orientation: landscape) and (min-width: 480px)'

const subscribeLandscape = (cb: () => void) => {
  const mq = window.matchMedia(LANDSCAPE_DECK_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export const useLandscapeDeck = () => useSyncExternalStore(subscribeLandscape, () => window.matchMedia(LANDSCAPE_DECK_QUERY).matches)
