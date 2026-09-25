// A local clock for the lyrics demo. Not Spotify audio — so timed lyrics are
// allowed here (see policy.ts). Same shape as the playback store's snapshot.

import { create } from 'zustand'
import { interpolateProgress } from '../lib/progress'
import { DEMO_TRACK } from './demo'

interface DemoClock {
  progressMs: number
  durationMs: number
  isPlaying: boolean
  syncedAt: number
}

export const useDemoClock = create<DemoClock>(() => ({
  progressMs: 0,
  durationMs: DEMO_TRACK.durationMs,
  isPlaying: false,
  syncedAt: 0,
}))

let endTimer: ReturnType<typeof setTimeout> | undefined

const now = () => {
  const s = useDemoClock.getState()
  return interpolateProgress(s, s.syncedAt, Date.now())
}

function arm() {
  clearTimeout(endTimer)
  const s = useDemoClock.getState()
  if (s.isPlaying) endTimer = setTimeout(() => useDemoClock.setState({ progressMs: s.durationMs, isPlaying: false }), s.durationMs - s.progressMs)
}

export function toggleDemo() {
  const s = useDemoClock.getState()
  const pos = now()
  const restart = !s.isPlaying && pos >= s.durationMs
  useDemoClock.setState({ progressMs: restart ? 0 : pos, isPlaying: !s.isPlaying, syncedAt: Date.now() })
  arm()
}

export function seekDemo(ms: number) {
  const s = useDemoClock.getState()
  useDemoClock.setState({ progressMs: Math.max(0, Math.min(ms, s.durationMs)), syncedAt: Date.now() })
  arm()
}

export const seekDemoBy = (delta: number) => seekDemo(now() + delta)
