// Cuelume adapter. Cuelume synthesizes cues on one lazily created AudioContext,
// won't play before the first user gesture (autoplay policy), and is a silent
// no-op without Web Audio.

import { play, setVolume } from 'cuelume'
import type { CueSound } from './types'

/** Interface cues sit under the music, not over it. */
const DEFAULT_VOLUME = 0.55

let prepared = false

/**
 * iOS Safari: an "ambient" audio session mixes with other apps (so a UI tick never
 * pauses Spotify playing on the same phone) and respects the silent switch.
 */
function prepare() {
  prepared = true
  setVolume(DEFAULT_VOLUME)
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session && session.type !== 'ambient') session.type = 'ambient'
  } catch {
    // not supported — fine
  }
}

export function playSound(name: CueSound) {
  if (typeof window === 'undefined') return
  if (!prepared) prepare()
  play(name)
}
