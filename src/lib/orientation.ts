import { useSyncExternalStore } from 'react'

/** Phones held upright get the compact deck; everything else gets the landscape deck. */
export const PHONE_PORTRAIT_QUERY = '(orientation: portrait) and (max-width: 599px)'

export function isPhonePortrait(width: number, height: number): boolean {
  return height >= width && width <= 599
}

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(PHONE_PORTRAIT_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export const usePhonePortrait = () => useSyncExternalStore(subscribe, () => window.matchMedia(PHONE_PORTRAIT_QUERY).matches)
