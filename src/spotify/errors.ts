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

/** Retry-After is delta-seconds or an HTTP date. Returns null if absent/unreadable. Never below 1s. */
export function parseRetryAfter(header: string | null, now = Date.now()): number | null {
  if (!header?.trim()) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return Math.max(1000, seconds * 1000)
  const date = Date.parse(header)
  if (Number.isFinite(date)) return Math.max(1000, date - now)
  return null
}

const BACKOFF_START_MS = 5000
const BACKOFF_MAX_MS = 5 * 60_000

/**
 * One cooldown shared by every request: after a 429 nothing is sent until it
 * elapses — no tight retry loops. Uses Retry-After when the browser can read it
 * (Spotify doesn't list it in Access-Control-Expose-Headers), otherwise backs
 * off exponentially: 5s, 10s, 20s … 5 min. A successful response resets it.
 */
export function createCooldown() {
  let until = 0
  let strikes = 0
  return {
    remaining: (now = Date.now()) => Math.max(0, until - now),
    trip: (retryAfterMs: number | null, now = Date.now()) => {
      // Parallel requests hitting the same 429 are one strike, not several.
      if (until <= now) strikes++
      const ms = retryAfterMs ?? Math.min(BACKOFF_START_MS * 2 ** (strikes - 1), BACKOFF_MAX_MS)
      until = Math.max(until, now + ms)
      return until - now
    },
    /** After a success — unless it was already in flight when the 429 hit. */
    reset: (now = Date.now()) => {
      if (until <= now) strikes = 0
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
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    return offline
      ? { title: "You're offline", detail: 'PartyDeck reconnects when you are back online.', action: 'retry' }
      : { title: "Can't reach Spotify", detail: 'Check your connection.', action: 'retry' }
  }
  if (err.reason === 'AUTH_EXPIRED' || err.status === 401) {
    return { title: 'Spotify disconnected', detail: 'Your session ended. Connect again.', action: 'connect' }
  }
  if (err.status === 429) {
    const s = Math.ceil((err.retryAfterMs ?? 5000) / 1000)
    return { title: 'Spotify asked us to slow down', detail: `PartyDeck is pausing requests for ${s}s.`, action: null }
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
