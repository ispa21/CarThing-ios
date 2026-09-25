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
