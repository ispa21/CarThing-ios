import type { Cue, FeedbackEvent } from './types'

// A small palette reused everywhere; consistency beats variety.
// Proportional: navigation is the lightest touch, confirmation the strongest.
const NONE: Cue = { haptic: null, sound: null }
const SELECT: Cue = { haptic: 'selection', sound: 'tick' }
const DISMISS: Cue = { haptic: 'light', sound: 'droplet' }
const CONFIRM: Cue = { haptic: 'success', sound: 'success' }
const LIVE: Cue = { haptic: 'success', sound: 'ready' }
const REFUSE: Cue = { haptic: 'error', sound: 'error' }
const ATTENTION: Cue = { haptic: 'warning', sound: null }
const SKIP: Cue = { haptic: 'skip', sound: 'page' } // two quick taps: moving on

export const INTERACTIONS: Record<FeedbackEvent, Cue> = {
  select: SELECT,
  focus: NONE, // keyboard focus moves constantly; never sonify it
  tick: SELECT,
  back: DISMISS,
  toggle: { haptic: 'selection', sound: 'toggle' },

  'primary-press': { haptic: 'medium', sound: 'pulse' },
  play: { haptic: 'medium', sound: 'pulse' },
  pause: { haptic: 'soft', sound: 'press' }, // same key, softer: stopping
  'next-track': SKIP,
  'previous-track': SKIP,
  seek: SELECT,
  'playback-error': REFUSE,

  'queue-add': CONFIRM,
  'queue-remove': DISMISS,
  'queue-reorder': SELECT,

  'room-joined': LIVE,
  'room-left': DISMISS,
  reaction: NONE, // reserved: rooms aren't built yet
  'listener-arrival': NONE,
  'listener-departure': NONE,

  success: CONFIRM,
  error: REFUSE,
  warning: ATTENTION,
  loading: NONE,
  ready: LIVE,
  'power-on': { haptic: 'heavy', sound: 'arrival' },

  'lyrics-open': SELECT,
  'jump-to-current': { haptic: 'light', sound: 'release' },
  'lyrics-follow': NONE,
  'lyrics-manual-scroll': NONE, // scrolling is continuous; stay out of the way

  'crate-add': { haptic: 'double', sound: 'success' },
  saved: { haptic: 'rise', sound: 'success' },
  detent: { haptic: 'selection', sound: null }, // felt, never heard: drags happen constantly
  edge: { haptic: 'bump', sound: null },

  'spotify-connected': LIVE,
  'spotify-disconnected': ATTENTION,
  'device-connected': CONFIRM,
  'device-lost': ATTENTION,
}
