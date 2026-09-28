export interface ClockSnapshot {
  progressMs: number
  durationMs: number
  isPlaying: boolean
}

/**
 * Position "now", given the last synchronised snapshot.
 * Spotify is polled every few seconds; between polls we advance locally.
 */
export function interpolateProgress(s: ClockSnapshot, syncedAt: number, now: number): number {
  const elapsed = s.isPlaying ? Math.max(0, now - syncedAt) : 0
  const ms = s.progressMs + elapsed
  return s.durationMs > 0 ? Math.min(ms, s.durationMs) : ms
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/**
 * Where the dial's taller ticks go, as percentages of the song. One per minute;
 * long episodes step by 5 or 10 minutes so the dial never turns into a comb.
 */
export function minuteMarks(durationMs: number): number[] {
  const minutes = durationMs / 60_000
  const step = minutes <= 20 ? 1 : minutes <= 100 ? 5 : 10
  const marks: number[] = []
  for (let m = step; m < minutes; m += step) marks.push((m / minutes) * 100)
  return marks
}
