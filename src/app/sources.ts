// One table for "what drives playback here": Spotify, or the silent lyrics demo.
// Screens and shortcuts look the source up instead of branching on it.

import { seekDemo, seekDemoBy, toggleDemo } from '../lyrics/demoClock'
import type { PlaybackSource } from '../lyrics/policy'
import { seekBy, seekTo, togglePlay } from '../spotify/playbackService'
import { demoClock, spotifyClock, type Clock } from '../ui/clock'

export interface SourceControls {
  clock: Clock
  toggle: () => void
  seek: (ms: number) => void
  seekBy: (deltaMs: number) => void
  /** Where Back / Esc go when there's no history to return to. */
  backTo: string
}

export const SOURCES: Record<PlaybackSource, SourceControls> = {
  spotify: {
    clock: spotifyClock,
    toggle: () => void togglePlay(),
    seek: (ms) => void seekTo(ms),
    seekBy: (d) => void seekBy(d),
    backTo: '/now',
  },
  demo: { clock: demoClock, toggle: toggleDemo, seek: seekDemo, seekBy: seekDemoBy, backTo: '/' },
}
