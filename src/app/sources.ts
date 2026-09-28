// One table for "what drives playback here": Spotify, or the silent lyrics demo.
// Screens and shortcuts look the source up instead of branching on it.

import { seekDemo, seekDemoBy, toggleDemo, useDemoClock } from '../lyrics/demoClock'
import type { PlaybackSource } from '../lyrics/policy'
import { feedback } from '../sensory/feedback'
import { seekBy, seekTo, togglePlay } from '../spotify/playbackService'
import { demoClock, spotifyClock, type Clock } from '../ui/clock'

export interface SourceControls {
  clock: Clock
  toggle: () => void
  seek: (ms: number, opts?: { silent?: boolean }) => void
  seekBy: (deltaMs: number) => void
  /** Where Back / Esc go when there's no history to return to. */
  backTo: string
}

export const SOURCES: Record<PlaybackSource, SourceControls> = {
  spotify: {
    clock: spotifyClock,
    toggle: () => void togglePlay(),
    seek: (ms, opts) => void seekTo(ms, opts),
    seekBy: (d) => void seekBy(d),
    backTo: '/',
  },
  // Spotify's commands play their own feedback (playbackService); the demo does it here.
  demo: {
    clock: demoClock,
    toggle: () => {
      feedback.play(useDemoClock.getState().isPlaying ? 'pause' : 'play')
      toggleDemo()
    },
    seek: (ms, opts) => {
      if (!opts?.silent) feedback.play('seek')
      seekDemo(ms)
    },
    seekBy: (d) => {
      feedback.play('seek')
      seekDemoBy(d)
    },
    backTo: '/',
  },
}
