// A tiny History-API router. PartyDeck has a handful of flat routes, so a
// router library would be dead weight. Vercel rewrites every path to index.html.

import { useSyncExternalStore, type MouseEvent } from 'react'

export type Route = 'home' | 'search' | 'queue' | 'now' | 'lyrics' | 'lyrics-demo' | 'settings' | 'callback'

const ROUTES: Record<string, Route> = {
  '/': 'home',
  '/search': 'search',
  '/queue': 'queue',
  '/now': 'now',
  '/lyrics': 'lyrics',
  '/lyrics/demo': 'lyrics-demo',
  '/settings': 'settings',
  '/callback': 'callback',
}

export const PATHS = Object.fromEntries(Object.entries(ROUTES).map(([p, r]) => [r, p])) as Record<Route, string>

export const matchRoute = (pathname: string): Route => ROUTES[pathname.replace(/\/+$/, '') || '/'] ?? 'home'

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

/** onClick for <a href>: SPA navigation, but let modified clicks open new tabs. */
export function linkHandler(e: MouseEvent<HTMLAnchorElement>) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  navigate(e.currentTarget.getAttribute('href') ?? '/')
}
