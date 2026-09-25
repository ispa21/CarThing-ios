// Typed Spotify errors and the user-facing copy for each failure mode.
// Pure module: no fetch, no storage — so it can be unit-tested.

export type ErrorReason =
  | 'NETWORK'
  | 'AUTH_EXPIRED'
  | 'RATE_LIMITED'
  | 'PREMIUM_REQUIRED'
  | 'NO_ACTIVE_DEVICE'
  | 'NOT_REGISTERED'
  | (string & {})

export class SpotifyError extends Error {
  readonly status: number
  readonly reason?: ErrorReason
  readonly retryAfterMs?: number

  constructor(status: number, message: string, reason?: ErrorReason, retryAfterMs?: number) {
    super(message)
    this.name = 'SpotifyError'
    this.status = status
    this.reason = reason
    this.retryAfterMs = retryAfterMs
  }
}

/** Retry-After is delta-seconds or an HTTP date. Unknown → 5s. Never below 1s. */
export function parseRetryAfter(header: string | null, now = Date.now()): number {
  const fallback = 5000
  if (!header) return fallback
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return Math.max(1000, seconds * 1000)
  const date = Date.parse(header)
  if (Number.isFinite(date)) return Math.max(1000, date - now)
  return fallback
}

/**
 * One cooldown shared by every request: after a 429 nothing is sent until
 * Retry-After elapses. This is what prevents tight retry loops.
 */
export function createCooldown() {
  let until = 0
  return {
    remaining: (now = Date.now()) => Math.max(0, until - now),
    trip: (ms: number, now = Date.now()) => {
      until = Math.max(until, now + ms)
    },
  }
}

export type ErrorAction = 'connect' | 'devices' | 'retry' | null

export interface FriendlyError {
  title: string
  detail?: string
  action: ErrorAction
}

export function describeError(err: unknown): FriendlyError {
  if (!(err instanceof SpotifyError)) {
    return { title: 'Something went wrong', detail: 'Try that again.', action: 'retry' }
  }
  if (err.reason === 'NETWORK' || err.status === 0) {
    return { title: "Can't reach Spotify", detail: 'Check your connection.', action: 'retry' }
  }
  if (err.reason === 'AUTH_EXPIRED' || err.status === 401) {
    return { title: 'Spotify disconnected', detail: 'Your session ended. Connect again.', action: 'connect' }
  }
  if (err.status === 429) {
    const s = Math.ceil((err.retryAfterMs ?? 5000) / 1000)
    return { title: 'Spotify asked us to slow down', detail: `Trying again in ${s}s.`, action: null }
  }
  if (err.reason === 'PREMIUM_REQUIRED' || /premium/i.test(err.message)) {
    return { title: 'Spotify Premium required', detail: 'Playback control needs a Premium account.', action: null }
  }
  if (err.reason === 'NOT_REGISTERED') {
    return {
      title: "This account isn't on the app's user list",
      detail: 'In Development Mode, the app owner must add you in the Spotify Developer Dashboard.',
      action: 'connect',
    }
  }
  if (err.reason === 'NO_ACTIVE_DEVICE' || err.status === 404) {
    return { title: 'No active device', detail: 'Pick a device to play on.', action: 'devices' }
  }
  if (err.status === 403) {
    return { title: "Spotify didn't allow that", detail: err.message || undefined, action: null }
  }
  if (err.status >= 500) {
    return { title: 'Spotify is having trouble', detail: 'Try again in a moment.', action: 'retry' }
  }
  return { title: 'Spotify returned an error', detail: err.message || undefined, action: 'retry' }
}
