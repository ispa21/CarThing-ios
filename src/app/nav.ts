import type { Route } from './router'

/** The four hardware keys: the everyday screens. */
export const RAIL_TABS: Array<{ route: Route; label: string }> = [
  { route: 'now', label: 'deck' },
  { route: 'lyrics', label: 'lyrics' },
  { route: 'queue', label: 'queue' },
  { route: 'search', label: 'library' },
]

/** The modes: printed beside the keys, because each changes the whole machine. On phones they live behind the MODES key. */
export const RAIL_MODES: Array<{ route: Route; label: string; about: string; short?: string }> = [
  { route: 'mix', label: 'mix', about: 'Two decks and a crossfader.' },
  { route: 'visual', label: 'visual', about: 'The cover becomes the room.' },
  { route: 'crate', label: 'crate', about: 'What you’re into right now.' },
  { route: 'transmission', label: 'transmission', short: 'radio', about: 'Radio stations from your library.' },
  { route: 'archive', label: 'archive', about: 'Your days, as stacks of records.' },
  { route: 'stories', label: 'stories', about: 'What your listening says.' },
  { route: 'screen', label: 'screen', about: 'Put the deck on a TV.' },
]
