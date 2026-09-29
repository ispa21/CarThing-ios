// A tiny History-API router. PartyDeck has a handful of flat routes, so a
// router library would be dead weight. Vercel rewrites every path to index.html.

import { useSyncExternalStore, type MouseEvent } from 'react'
import { feedback } from '../sensory/feedback'

export type Route =
  | 'now'
  | 'search'
  | 'queue'
  | 'lyrics'
  | 'lyrics-demo'
  | 'settings'
  | 'callback'
  | 'tutorial'
  | 'mix'
  | 'visual'
  | 'screen'

/** The deck (Now Playing) is home. */
export const PATHS: Record<Route, string> = {
  now: '/',
  search: '/search',
  queue: '/queue',
  lyrics: '/lyrics',
  'lyrics-demo': '/lyrics/demo',
  settings: '/settings',
  callback: '/callback',
  tutorial: '/tutorial',
  mix: '/mix',
  visual: '/visual',
  screen: '/screen',
}

const ROUTES: Record<string, Route> = {
  ...Object.fromEntries(Object.entries(PATHS).map(([r, p]) => [p, r as Route])),
  '/now': 'now', // Phase 1 links
}

export const matchRoute = (pathname: string): Route => ROUTES[pathname.replace(/\/+$/, '') || '/'] ?? 'now'

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
window.addEventListener('popstate', notify)

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export const usePathname = () => useSyncExternalStore(subscribe, () => window.location.pathname)

/** history.state.idx lets `back()` know whether there's an in-app page to return to. */
const currentIdx = () => (window.history.state as { idx?: number } | null)?.idx ?? 0

export function navigate(to: string, { replace = false } = {}) {
  if (to === window.location.pathname + window.location.search) return
  if (replace) window.history.replaceState({ idx: currentIdx() }, '', to)
  else window.history.pushState({ idx: currentIdx() + 1 }, '', to)
  notify()
}

export function back(fallback = '/') {
  if (currentIdx() > 0) window.history.back()
  else navigate(fallback, { replace: true })
}

/** linkHandler plus the navigation tick — for in-app links the user taps. */
export function tickLink(e: MouseEvent<HTMLAnchorElement>) {
  feedback.play('select')
  linkHandler(e)
}

/** onClick for <a href>: SPA navigation, but let modified clicks open new tabs. */
export function linkHandler(e: MouseEvent<HTMLAnchorElement>) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  navigate(e.currentTarget.getAttribute('href') ?? '/')
}
