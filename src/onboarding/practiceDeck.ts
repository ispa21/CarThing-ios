// A silent practice deck for the tutorial: three original demo tracks on a local
// clock. It never touches Spotify, so learning "next" can't skip your real music.

import { create } from 'zustand'
import { DEMO_LRC, DEMO_TRACK, PRACTICE_LRC } from '../lyrics/demo'
import { interpolateProgress } from '../lib/progress'
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

export const practice = {
  reset: () => set(start(0, false)),
  toggle: () => set({ progressMs: position(), syncedAt: Date.now(), isPlaying: !get().isPlaying }),
  pause: () => set({ progressMs: position(), syncedAt: Date.now(), isPlaying: false }),
  next: () => set(start(wrap(get().index + 1), get().isPlaying)),
  /** Like a real deck: restart the song unless you're in its first 3 seconds. */
  previous: () => (position() > 3000 ? set({ progressMs: 0, syncedAt: Date.now() }) : set(start(wrap(get().index - 1), get().isPlaying))),
  seek: (ms: number) => set({ progressMs: Math.max(0, Math.min(ms, get().durationMs)), syncedAt: Date.now() }),
}

export const practiceClock: Clock = {
  read: () => {
    const s = get()
    return { snapshot: s, syncedAt: s.syncedAt }
  },
  subscribe: (cb) => usePracticeDeck.subscribe(cb),
}
