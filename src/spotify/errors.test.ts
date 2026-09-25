import { describe, expect, it } from 'vitest'
import { createCooldown, describeError, parseRetryAfter, SpotifyError } from './errors'

describe('parseRetryAfter', () => {
  it('reads delta-seconds', () => {
    expect(parseRetryAfter('7')).toBe(7000)
  })
  it('reads an HTTP date', () => {
    const now = Date.parse('2026-01-01T00:00:00Z')
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:30 GMT', now)).toBe(30_000)
  })
  it('returns null when missing or garbage (e.g. not exposed via CORS)', () => {
    expect(parseRetryAfter(null)).toBeNull()
    expect(parseRetryAfter('')).toBeNull()
    expect(parseRetryAfter('soon')).toBeNull()
  })
  it('never returns less than 1s (no tight loops)', () => {
    expect(parseRetryAfter('0')).toBe(1000)
  })
})

describe('cooldown', () => {
  it('blocks until Retry-After elapses', () => {
    const c = createCooldown()
    expect(c.remaining(0)).toBe(0)
    c.trip(3000, 1000)
    expect(c.remaining(1000)).toBe(3000)
    expect(c.remaining(3999)).toBe(1)
    expect(c.remaining(4000)).toBe(0)
  })
  it('keeps the longer of two cooldowns', () => {
    const c = createCooldown()
    c.trip(10_000, 0)
    c.trip(1000, 0)
    expect(c.remaining(0)).toBe(10_000)
  })
  it('backs off exponentially when Retry-After is unreadable, capped at 5 min', () => {
    const c = createCooldown()
    const waits = Array.from({ length: 9 }, () => c.trip(null, 0))
    expect(waits).toEqual([5000, 10_000, 20_000, 40_000, 80_000, 160_000, 300_000, 300_000, 300_000])
  })
  it('resets the backoff after a successful response', () => {
    const c = createCooldown()
    c.trip(null, 0)
    c.trip(null, 0)
    c.reset()
    expect(c.trip(null, 0)).toBe(5000)
  })
  it('prefers Retry-After when readable', () => {
    const c = createCooldown()
    expect(c.trip(7000, 0)).toBe(7000)
  })
})

describe('describeError', () => {
  const cases: Array<[SpotifyError, string, string | null]> = [
    [new SpotifyError(0, 'fetch failed', 'NETWORK'), "Can't reach Spotify", 'retry'],
    [new SpotifyError(401, '', 'AUTH_EXPIRED'), 'Spotify disconnected', 'connect'],
    [new SpotifyError(429, '', 'RATE_LIMITED', 12_000), 'Spotify asked us to slow down', null],
    [new SpotifyError(403, 'Player command failed: Premium required', 'PREMIUM_REQUIRED'), 'Spotify Premium required', null],
    [new SpotifyError(404, 'Player command failed: No active device found', 'NO_ACTIVE_DEVICE'), 'No active device', 'devices'],
    [new SpotifyError(403, 'user may not be registered', 'NOT_REGISTERED'), "This account isn't on the app's user list", 'connect'],
    [new SpotifyError(403, 'Restriction violated', 'UNKNOWN'), "Spotify didn't allow that", null],
    [new SpotifyError(502, 'Bad gateway'), 'Spotify is having trouble', 'retry'],
  ]
  it.each(cases)('%s → %s', (err, title, action) => {
    const d = describeError(err)
    expect(d.title).toBe(title)
    expect(d.action).toBe(action)
  })
  it('includes the retry delay for 429', () => {
    expect(describeError(new SpotifyError(429, '', 'RATE_LIMITED', 12_000)).detail).toBe('Trying again in 12s.')
  })
  it('handles non-Spotify errors', () => {
    expect(describeError(new Error('boom')).title).toBe('Something went wrong')
  })
})
