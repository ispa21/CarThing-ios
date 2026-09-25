// A "clock" is anything with a progress snapshot + the time it was taken:
// Spotify playback, or the local lyrics demo. UI reads interpolated positions
// through these hooks so only tiny subtrees update per frame.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useDemoClock } from '../lyrics/demoClock'
import { interpolateProgress, type ClockSnapshot } from '../lib/progress'
import { usePlayback } from '../store/playback'

export interface Clock {
  read(): { snapshot: ClockSnapshot; syncedAt: number }
  subscribe(cb: () => void): () => void
}

export const spotifyClock: Clock = {
  read: () => {
    const s = usePlayback.getState()
    return { snapshot: s.playback, syncedAt: s.syncedAt }
  },
  subscribe: (cb) => usePlayback.subscribe(cb),
}

export const demoClock: Clock = {
  read: () => {
    const s = useDemoClock.getState()
    return { snapshot: s, syncedAt: s.syncedAt }
  },
  subscribe: (cb) => useDemoClock.subscribe(cb),
}

type Paint = (positionMs: number, snapshot: ClockSnapshot) => void

/**
 * Calls `paint` every animation frame while the clock is playing, and once on
 * every clock change otherwise. Paint should write to the DOM directly.
 */
export function useClockPainter(clock: Clock, paint: Paint, enabled = true) {
  const paintRef = useRef(paint)
  useLayoutEffect(() => {
    paintRef.current = paint
  })

  useEffect(() => {
    if (!enabled) return
    let raf = 0
    const frame = () => {
      const { snapshot, syncedAt } = clock.read()
      paintRef.current(interpolateProgress(snapshot, syncedAt, Date.now()), snapshot)
      if (snapshot.isPlaying) raf = requestAnimationFrame(frame)
    }
    frame()
    const unsubscribe = clock.subscribe(() => {
      cancelAnimationFrame(raf)
      frame()
    })
    return () => {
      cancelAnimationFrame(raf)
      unsubscribe()
    }
  }, [clock, enabled])
}

/** A value derived from the clock that re-renders only when it changes (e.g. the lyric index). */
export function useClockValue<T>(clock: Clock, derive: (positionMs: number, isPlaying: boolean) => T, enabled = true): T {
  const [value, setValue] = useState<T>(() => {
    const { snapshot, syncedAt } = clock.read()
    return derive(interpolateProgress(snapshot, syncedAt, Date.now()), snapshot.isPlaying)
  })
  useClockPainter(clock, (ms, s) => setValue(derive(ms, s.isPlaying)), enabled)
  return value
}
