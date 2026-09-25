// The one place that sends requests to api.spotify.com.
// Handles auth (refresh + one retry on 401), 429 Retry-After, 204, and error typing.

import { getAccessToken } from './auth'
import { createCooldown, parseRetryAfter, SpotifyError } from './errors'
import type { RawDevice, RawPaging, RawPlayback, RawPlaylist, RawQueue, RawSearch, RawUser } from './types'

const BASE = 'https://api.spotify.com/v1'
const cooldown = createCooldown()

type Query = Record<string, string | number | boolean | undefined | null>

interface RequestOptions {
  method?: 'GET' | 'PUT' | 'POST' | 'DELETE'
  query?: Query
  body?: unknown
  signal?: AbortSignal
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(query ?? {})) if (v != null) url.searchParams.set(k, String(v))
  return url
}

async function send(url: URL, opts: RequestOptions, token: string) {
  try {
    return await fetch(url, {
      method: opts.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new SpotifyError(0, 'Network error', 'NETWORK')
  }
}

export async function spotify<T>(path: string, opts: RequestOptions = {}): Promise<T | null> {
  const wait = cooldown.remaining()
  if (wait > 0) throw new SpotifyError(429, 'Rate limited', 'RATE_LIMITED', wait)

  const url = buildUrl(path, opts.query)
  let res = await send(url, opts, await getAccessToken())
  if (res.status === 401) res = await send(url, opts, await getAccessToken({ force: true }))

  if (res.status === 429) {
    const ms = cooldown.trip(parseRetryAfter(res.headers.get('Retry-After')))
    throw new SpotifyError(429, 'Rate limited', 'RATE_LIMITED', ms)
  }
  cooldown.reset()
  if (res.status === 204 || res.status === 202) return null

  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null // some player endpoints answer 200 with a non-JSON body
  }

  if (!res.ok) {
    // ErrorObject is { status, message }. Player endpoints also send `reason`
    // (PREMIUM_REQUIRED, NO_ACTIVE_DEVICE…) though the schema omits it, so it is
    // only a hint — describeError() falls back to status and message.
    const err = (body as { error?: { message?: string; reason?: string } } | null)?.error
    const message = err?.message ?? res.statusText
    let reason = err?.reason ?? (res.status === 401 ? 'AUTH_EXPIRED' : undefined)
    // Development Mode: accounts missing from the app's user list get 403 with this message.
    if (res.status === 403 && /not be registered|not registered/i.test(message)) reason = 'NOT_REGISTERED'
    throw new SpotifyError(res.status, message, reason)
  }
  return body as T
}

// ── Endpoints (verified against the Spotify OpenAPI schema) ──────────────────

export const getPlayback = () => spotify<RawPlayback>('/me/player', { query: { additional_types: 'episode' } })

export const getDevices = () => spotify<{ devices: RawDevice[] }>('/me/player/devices')

export const transferPlayback = (deviceId: string) =>
  spotify('/me/player', { method: 'PUT', body: { device_ids: [deviceId], play: true } })

export const startPlayback = (body?: { context_uri?: string; uris?: string[] }, deviceId?: string) =>
  spotify('/me/player/play', { method: 'PUT', query: { device_id: deviceId }, body })

export const pausePlayback = () => spotify('/me/player/pause', { method: 'PUT' })
export const skipToNext = () => spotify('/me/player/next', { method: 'POST' })
export const skipToPrevious = () => spotify('/me/player/previous', { method: 'POST' })
export const seekToPosition = (positionMs: number) =>
  spotify('/me/player/seek', { method: 'PUT', query: { position_ms: Math.round(positionMs) } })

export const getQueue = () => spotify<RawQueue>('/me/player/queue')
export const addToQueue = (uri: string) => spotify('/me/player/queue', { method: 'POST', query: { uri } })

/** Feb 2026: `limit` max is 10. */
export const search = (q: string, signal?: AbortSignal) =>
  spotify<RawSearch>('/search', { query: { q, type: 'track,artist,album,playlist', limit: 10 }, signal })

export const getMyPlaylists = () => spotify<RawPaging<RawPlaylist | null>>('/me/playlists', { query: { limit: 30 } })

export const getMe = () => spotify<RawUser>('/me')
