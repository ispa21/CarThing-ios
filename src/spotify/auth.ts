// Spotify login, token storage and refresh (Authorization Code with PKCE).
//
// Storage:
//  - PKCE verifier + state: sessionStorage, deleted as soon as the callback is handled.
//  - Tokens: localStorage (a pure SPA has nowhere safer). Mitigated by a strict CSP
//    and rendering all Spotify/lyrics text as text. Tokens are never logged.

import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI, SPOTIFY_SCOPES } from './config'
import { SpotifyError } from './errors'
import { buildAuthorizeUrl, createChallenge, createState, createVerifier, isValidState } from './pkce'

const TOKEN_KEY = 'partydeck.auth'
const PKCE_KEY = 'partydeck.pkce'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'

interface Tokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

/**
 * denied   — the user declined on Spotify's page
 * state    — callback didn't match a login we started
 * exchange — Spotify rejected the code / refresh token (HTTP 400/401: revoked, expired, invalid)
 * network  — couldn't complete: offline, or Spotify accounts unavailable (5xx, 429, garbage)
 */
export type AuthFailure = 'denied' | 'state' | 'exchange' | 'network'

export class AuthError extends Error {
  readonly kind: AuthFailure
  constructor(kind: AuthFailure) {
    super(kind)
    this.kind = kind
  }
}

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function readTokens(): Tokens | null {
  const t = readJson<Tokens>(localStorage, TOKEN_KEY)
  return t?.accessToken && t.refreshToken ? t : null
}

function writeTokens(t: Tokens) {
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(t))
  } catch {
    // Storage full/blocked: we still hold the token in memory for this session.
  }
  memory = t
}

let memory: Tokens | null = readTokens()
type SessionListener = (connected: boolean, reason?: SpotifyError) => void
const listeners = new Set<SessionListener>()

// Another tab (or the installed PWA) refreshed or disconnected: follow it.
window.addEventListener('storage', (e) => {
  if (e.key !== TOKEN_KEY && e.key !== null) return
  const wasConnected = memory !== null
  memory = readTokens()
  if (wasConnected !== (memory !== null)) emit()
})

export const hasSession = () => memory !== null

/** Notified when the session starts or ends. `reason` says why it ended (unless the user chose to). */
export function onSessionChange(cb: SessionListener) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function emit(reason?: SpotifyError) {
  for (const cb of listeners) cb(memory !== null, reason)
}

export async function beginLogin(returnTo = '/') {
  const verifier = createVerifier()
  const state = createState()
  sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state, returnTo }))
  window.location.assign(
    buildAuthorizeUrl({
      clientId: SPOTIFY_CLIENT_ID,
      redirectUri: SPOTIFY_REDIRECT_URI,
      scopes: SPOTIFY_SCOPES,
      challenge: await createChallenge(verifier),
      state,
    }),
  )
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
}

async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  let res: Response
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    })
  } catch {
    throw new AuthError('network')
  }
  // Only a definite OAuth rejection is fatal. A 5xx/429 or a captive-portal page is transient.
  if (res.status === 400 || res.status === 401) throw new AuthError('exchange')
  if (!res.ok) throw new AuthError('network')
  try {
    const json = (await res.json()) as TokenResponse
    if (typeof json.access_token !== 'string' || typeof json.expires_in !== 'number') throw new Error('bad token response')
    return json
  } catch {
    throw new AuthError('network')
  }
}

function store(r: TokenResponse, previousRefresh?: string) {
  writeTokens({
    accessToken: r.access_token,
    // Spotify may omit a new refresh token; keep using the old one.
    refreshToken: r.refresh_token ?? previousRefresh ?? '',
    expiresAt: Date.now() + r.expires_in * 1000,
  })
}

let callbackInFlight: Promise<string> | null = null

/** Handles /callback. Resolves to the path to return to. Safe to call twice (StrictMode). */
export function completeLogin(params: URLSearchParams): Promise<string> {
  callbackInFlight ??= (async () => {
    const pending = readJson<{ verifier: string; state: string; returnTo: string }>(sessionStorage, PKCE_KEY)
    sessionStorage.removeItem(PKCE_KEY)

    if (params.get('error')) throw new AuthError(params.get('error') === 'access_denied' ? 'denied' : 'exchange')
    if (!pending || !isValidState(pending.state, params.get('state'))) throw new AuthError('state')
    const code = params.get('code')
    if (!code) throw new AuthError('exchange')

    store(
      await requestToken({
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: pending.verifier,
      }),
    )
    emit()
    // Only allow same-app relative paths as the return target.
    return pending.returnTo.startsWith('/') && !pending.returnTo.startsWith('//') ? pending.returnTo : '/'
  })()
  return callbackInFlight
}

let refreshInFlight: Promise<string> | null = null

const isFresh = (t: Tokens) => t.expiresAt - 60_000 > Date.now()

async function refresh(force: boolean): Promise<string> {
  // Another tab may already have refreshed (and rotated the refresh token).
  const stored = readTokens()
  if (stored && stored.accessToken !== memory?.accessToken && isFresh(stored)) {
    memory = stored
    return stored.accessToken
  }
  const current = stored ?? memory
  if (!current) throw new SpotifyError(401, 'Not connected', 'AUTH_EXPIRED')
  if (!force && isFresh(current)) return current.accessToken

  try {
    store(
      await requestToken({ grant_type: 'refresh_token', refresh_token: current.refreshToken, client_id: SPOTIFY_CLIENT_ID }),
      current.refreshToken,
    )
    return memory!.accessToken
  } catch (e) {
    if (e instanceof AuthError && e.kind === 'network') throw new SpotifyError(0, 'Network error', 'NETWORK') // keep tokens
    // Rejected. If another tab rotated the refresh token meanwhile, use theirs instead of signing out.
    const latest = readTokens()
    if (latest && latest.refreshToken !== current.refreshToken) {
      memory = latest
      return latest.accessToken
    }
    const expired = new SpotifyError(401, 'Session expired', 'AUTH_EXPIRED')
    logout(expired) // refresh token revoked or expired
    throw expired
  }
}

/** A valid access token, refreshing a minute before expiry. Concurrent callers share one refresh. */
export async function getAccessToken({ force = false } = {}): Promise<string> {
  if (!memory) throw new SpotifyError(401, 'Not connected', 'AUTH_EXPIRED')
  if (!force && isFresh(memory)) return memory.accessToken
  refreshInFlight ??= refresh(force).finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

/** Disconnect: forget tokens and every piece of Spotify-derived local data. */
export function logout(reason?: SpotifyError) {
  memory = null
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(PKCE_KEY)
  } catch {
    // ignore
  }
  emit(reason)
}
