import type { Route } from './router'

/** The four hardware keys: the everyday screens. */
export const RAIL_TABS: Array<{ route: Route; label: string }> = [
  { route: 'now', label: 'deck' },
  { route: 'lyrics', label: 'lyrics' },
  { route: 'queue', label: 'queue' },
  { route: 'search', label: 'library' },
]

/** The modes: printed beside the keys, because each changes the whole machine. */
export const RAIL_MODES: Array<{ route: Route; label: string }> = []
