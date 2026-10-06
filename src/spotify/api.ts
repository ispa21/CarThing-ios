// The one place that sends requests to api.spotify.com.
// Handles auth (refresh + one retry on 401), 429 Retry-After, 204, and error typing.

import { getAccessToken } from './auth'
import { createCooldown, parseRetryAfter, SpotifyError } from './errors'
import type {
  RawCreatedPlaylist,
  RawDevice,
  RawFollowedArtists,
  RawTopArtists,
  RawTopTracks,
  RawPaging,
  RawPlayback,
  RawPlaylist,
  RawPlaylistItem,
  RawQueue,
  RawRecent,
  RawSavedTrack,
  RawSearch,
  RawUser,
} from './types'

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

export const setShuffle = (state: boolean) => spotify('/me/player/shuffle', { method: 'PUT', query: { state: String(state) } })
/** `state`: track, context or off. */
export const setRepeat = (state: 'off' | 'context' | 'track') => spotify('/me/player/repeat', { method: 'PUT', query: { state } })
/** 0–100 inclusive. */
export const setVolume = (volumePercent: number) =>
  spotify('/me/player/volume', { method: 'PUT', query: { volume_percent: Math.max(0, Math.min(100, Math.round(volumePercent))) } })

export const getQueue = () => spotify<RawQueue>('/me/player/queue')
export const addToQueue = (uri: string) => spotify('/me/player/queue', { method: 'POST', query: { uri } })

/** Feb 2026: `limit` max is 10. */
export const search = (q: string, signal?: AbortSignal) =>
  spotify<RawSearch>('/search', { query: { q, type: 'track,artist,album,playlist', limit: 10 }, signal })

export const getMyPlaylists = (offset = 0, limit = 30) => spotify<RawPaging<RawPlaylist | null>>('/me/playlists', { query: { limit, offset } })

export const getMe = () => spotify<RawUser>('/me')

/** Scope user-read-recently-played. Up to 50, newest first. */
export const getRecentlyPlayed = () => spotify<RawRecent>('/me/player/recently-played', { query: { limit: 50 } })

/** Scope user-library-read. Paged 50 at a time. */
export const getSavedTracks = (offset = 0) => spotify<RawPaging<RawSavedTrack>>('/me/tracks', { query: { limit: 50, offset } })

/** Scope playlist-read-private. Feb 2026: `/tracks` became `/items`, and each entry's `track` became `item`. */
export const getPlaylistItems = (id: string, offset = 0) =>
  spotify<RawPaging<RawPlaylistItem>>(`/playlists/${encodeURIComponent(id)}/items`, { query: { limit: 50, offset } })

/** Scope user-top-read. short_term ≈ 4 weeks, medium_term ≈ 6 months, long_term ≈ a year and more. */
export type TopRange = 'short_term' | 'medium_term' | 'long_term'
export const getTopTracks = (range: TopRange, offset = 0) => spotify<RawTopTracks>('/me/top/tracks', { query: { time_range: range, limit: 50, offset } })
export const getTopArtists = (range: TopRange, offset = 0) => spotify<RawTopArtists>('/me/top/artists', { query: { time_range: range, limit: 50, offset } })

/** Scope user-follow-read. Artists you follow, 50 at a time, by cursor. */
export const getFollowedArtists = (after?: string) => spotify<RawFollowedArtists>('/me/following', { query: { type: 'artist', limit: 50, after } })

/** Scope playlist-modify-private (or -public to publish). Feb 2026: replaces POST /users/{id}/playlists. Private unless asked. */
export const createPlaylist = (name: string, description: string, isPublic = false) =>
  spotify<RawCreatedPlaylist>('/me/playlists', { method: 'POST', body: { name, description, public: isPublic } })

/** Scope playlist-modify-private. Feb 2026: replaces POST /playlists/{id}/tracks. At most 100 URIs per request. */
export const addPlaylistItems = (id: string, uris: string[]) =>
  spotify(`/playlists/${encodeURIComponent(id)}/items`, { method: 'POST', body: { uris: uris.slice(0, 100) } })
