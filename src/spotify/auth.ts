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
const listeners = new Set<(connected: boolean) => void>()

export const hasSession = () => memory !== null

/** Notified when the session starts or ends (login, logout, refresh revoked). */
export function onSessionChange(cb: (connected: boolean) => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function emit() {
  for (const cb of listeners) cb(memory !== null)
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
  if (!res.ok) throw new AuthError('exchange')
  return (await res.json()) as TokenResponse
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

async function refresh(): Promise<string> {
  const current = memory
  if (!current) throw new SpotifyError(401, 'Not connected', 'AUTH_EXPIRED')
  try {
    store(
      await requestToken({ grant_type: 'refresh_token', refresh_token: current.refreshToken, client_id: SPOTIFY_CLIENT_ID }),
      current.refreshToken,
    )
    return memory!.accessToken
  } catch (e) {
    if (e instanceof AuthError && e.kind === 'network') throw new SpotifyError(0, 'Network error', 'NETWORK')
    logout() // refresh token revoked or expired
    throw new SpotifyError(401, 'Session expired', 'AUTH_EXPIRED')
  }
}

/** A valid access token, refreshing a minute before expiry. Concurrent callers share one refresh. */
export async function getAccessToken({ force = false } = {}): Promise<string> {
  if (!memory) throw new SpotifyError(401, 'Not connected', 'AUTH_EXPIRED')
  if (!force && memory.expiresAt - 60_000 > Date.now()) return memory.accessToken
  refreshInFlight ??= refresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

/** Disconnect: forget tokens and every piece of Spotify-derived local data. */
export function logout() {
  memory = null
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(PKCE_KEY)
  } catch {
    // ignore
  }
  emit()
}
