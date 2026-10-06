// PartyDeck's interaction vocabulary. UI speaks in these semantic events;
// only src/sensory knows which haptic pattern or sound each one maps to.

export type FeedbackEvent =
  // navigation
  | 'select'
  | 'focus'
  | 'tick'
  | 'back'
  | 'toggle'
  // playback
  | 'primary-press'
  | 'play'
  | 'pause'
  | 'next-track'
  | 'previous-track'
  | 'seek'
  | 'playback-error'
  // queue
  | 'queue-add'
  | 'queue-remove'
  | 'queue-reorder'
  // social (future rooms)
  | 'room-joined'
  | 'room-left'
  | 'reaction'
  | 'listener-arrival'
  | 'listener-departure'
  // system
  | 'success'
  | 'error'
  | 'warning'
  | 'loading'
  | 'ready'
  | 'power-on'
  // lyrics
  | 'lyrics-open'
  | 'jump-to-current'
  | 'lyrics-follow'
  | 'lyrics-manual-scroll'
  // collecting
  | 'crate-add'
  | 'saved'
  // drags and scrolls (Android: a detent as you pass a mark; iPhone can't tick mid-drag)
  | 'detent'
  | 'edge'
  // connection
  | 'spotify-connected'
  | 'spotify-disconnected'
  | 'device-connected'
  | 'device-lost'

/** Semantic haptic levels. haptics.ts renders each one with whatever the device has. */
export type HapticName =
  | 'selection'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  // Rhythms that tell actions apart by feel (Android; iPhone plays one tick for all).
  | 'soft'
  | 'skip'
  | 'double'
  | 'rise'
  | 'bump'

/** Cuelume cues PartyDeck uses — a deliberately small subset of its palette. */
export type CueSound = 'tick' | 'toggle' | 'droplet' | 'pulse' | 'press' | 'page' | 'release' | 'success' | 'ready' | 'arrival' | 'error'

export interface Cue {
  haptic: HapticName | null
  sound: CueSound | null
}

export interface FeedbackPrefs {
  sound: boolean
  haptics: boolean
}
