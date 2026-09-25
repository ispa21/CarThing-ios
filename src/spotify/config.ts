// Public, non-secret Spotify app configuration. PKCE needs no client secret —
// never add one here or in any VITE_ variable (those ship to the browser).

export const SPOTIFY_CLIENT_ID = (import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? '').trim()

export const SPOTIFY_REDIRECT_URI =
  (import.meta.env.VITE_SPOTIFY_REDIRECT_URI ?? '').trim() || `${window.location.origin}/callback`

/** Minimum scopes — see PLAN.md §4 for what each one unlocks. */
export const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
] as const

export const isSpotifyConfigured = SPOTIFY_CLIENT_ID.length > 0

/**
 * PKCE state lives in this origin's storage, so login must start on the same
 * origin the redirect URI returns to.
 */
export const redirectOrigin = (() => {
  try {
    return new URL(SPOTIFY_REDIRECT_URI).origin
  } catch {
    return window.location.origin
  }
})()
