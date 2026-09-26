// A silent practice deck for the tutorial: three original demo tracks on a local
// clock. It never touches Spotify, so learning "next" can't skip your real music.

import { create } from 'zustand'
import { DEMO_LRC, DEMO_TRACK, PRACTICE_LRC } from '../lyrics/demo'
import { interpolateProgress } from '../lib/progress'
import { feedback } from '../sensory/feedback'
import type { Clock } from '../ui/clock'

/** Original abstract artwork in the PartyDeck palette, as inline SVG (CSP allows data: images). */
function art(bg: string, disc: string, bar: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="${bg}"/><circle cx="380" cy="230" r="150" fill="${disc}"/><rect x="70" y="370" width="330" height="130" rx="65" fill="${bar}"/><circle cx="170" cy="190" r="46" fill="${bar}" opacity=".55"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export interface PracticeTrack {
  id: string
  title: string
  artist: string
  durationMs: number
  art: string
  lyrics: string
}

export const PRACTICE_TRACKS: readonly PracticeTrack[] = [
  { id: 'warm-up', title: 'Warm Up', artist: 'PartyDeck Practice', durationMs: 148_000, art: art('#2a2140', '#ffa630', '#f3efe8'), lyrics: PRACTICE_LRC.warmUp },
  { id: 'night-drive', title: DEMO_TRACK.title, artist: DEMO_TRACK.artist, durationMs: DEMO_TRACK.durationMs, art: art('#10302e', '#3fc4a3', '#e6f2d6'), lyrics: DEMO_LRC },
  { id: 'afterglow', title: 'Afterglow', artist: 'PartyDeck Practice', durationMs: 163_000, art: art('#351421', '#e0587a', '#f6d2da'), lyrics: PRACTICE_LRC.afterglow },
]

interface PracticeState {
  index: number
  progressMs: number
  durationMs: number
  isPlaying: boolean
  syncedAt: number
}

const start = (index: number, isPlaying: boolean): PracticeState => ({
  index,
  progressMs: 0,
  durationMs: PRACTICE_TRACKS[index].durationMs,
  isPlaying,
  syncedAt: Date.now(),
})

export const usePracticeDeck = create<PracticeState>(() => start(0, false))

const get = usePracticeDeck.getState
const set = usePracticeDeck.setState
const position = () => interpolateProgress(get(), get().syncedAt, Date.now())
const wrap = (i: number) => (i + PRACTICE_TRACKS.length) % PRACTICE_TRACKS.length

/**
 * The practice deck's command layer. Like playbackService for Spotify, the
 * user-facing commands play their own feedback (synchronously, in the gesture);
 * reset/stop are silent housekeeping.
 */
export const practice = {
  reset: () => set(start(0, false)),
  stop: () => set({ progressMs: position(), syncedAt: Date.now(), isPlaying: false }),
  /** Returns what the key did, so the tutorial can check the step. */
  toggle: (): 'play' | 'pause' => {
    const playing = get().isPlaying
    feedback.play(playing ? 'pause' : 'play')
    set({ progressMs: position(), syncedAt: Date.now(), isPlaying: !playing })
    return playing ? 'pause' : 'play'
  },
  /** Skipping starts the next song playing, like a real deck. */
  next: () => {
    feedback.play('next-track')
    set(start(wrap(get().index + 1), true))
  },
  /** Restart the song unless you're in its first 3 seconds. */
  previous: () => {
    feedback.play('previous-track')
    if (position() > 3000) set({ progressMs: 0, syncedAt: Date.now(), isPlaying: true })
    else set(start(wrap(get().index - 1), true))
  },
  seek: (ms: number) => {
    feedback.play('seek')
    set({ progressMs: Math.max(0, Math.min(ms, get().durationMs)), syncedAt: Date.now() })
  },
}

export const practiceClock: Clock = {
  read: () => {
    const s = get()
    return { snapshot: s, syncedAt: s.syncedAt }
  },
  subscribe: (cb) => usePracticeDeck.subscribe(cb),
}
