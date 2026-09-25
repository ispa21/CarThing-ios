// Auto-follow for the lyrics reader: the reader follows the current line until
// the user scrolls; then it stays out of the way until they tap "Jump to current".

export type FollowMode = 'following' | 'free'

export type FollowEvent =
  | { type: 'userScroll' } // wheel, touch drag, or scroll keys
  | { type: 'jump' } // "Jump to current"
  | { type: 'trackChange' } // a new song starts at the top, following

export function followReducer(_mode: FollowMode, event: FollowEvent): FollowMode {
  switch (event.type) {
    case 'userScroll':
      return 'free'
    case 'jump':
    case 'trackChange':
      return 'following'
  }
}

/** Should the reader scroll itself to the current line? */
export function shouldAutoScroll(mode: FollowMode, opts: { timed: boolean; autoScroll: boolean }): boolean {
  return opts.timed && opts.autoScroll && mode === 'following'
}

/** Show "Jump to current" whenever the reader isn't following on its own. */
export function showJumpButton(mode: FollowMode, opts: { timed: boolean; autoScroll: boolean; hasCurrent: boolean }): boolean {
  return opts.timed && opts.hasCurrent && (mode === 'free' || !opts.autoScroll)
}

// Not Space: in the reader Space is play/pause (see app/shortcuts.ts).
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'])

/** Keys that mean "I'm scrolling by myself" when focus is in the reader. */
export const isScrollKey = (key: string) => SCROLL_KEYS.has(key)
