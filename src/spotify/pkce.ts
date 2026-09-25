// Authorization Code with PKCE helpers (RFC 7636), per
// https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
// Pure functions only — storage and redirects live in auth.ts.

export function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** 64 chars from [A-Za-z0-9-_] — inside Spotify's allowed charset and 43–128 length. */
export function createVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(48)))
}

export async function createChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

export function createState(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(16)))
}

/** The callback is only trusted when it carries exactly the state we generated. */
export function isValidState(expected: string | null | undefined, received: string | null | undefined): boolean {
  return typeof expected === 'string' && expected.length >= 16 && expected === received
}

export function buildAuthorizeUrl(opts: {
  clientId: string
  redirectUri: string
  scopes: readonly string[]
  challenge: string
  state: string
}): string {
  const url = new URL('https://accounts.spotify.com/authorize')
  url.search = new URLSearchParams({
    client_id: opts.clientId,
    response_type: 'code',
    redirect_uri: opts.redirectUri,
    code_challenge_method: 'S256',
    code_challenge: opts.challenge,
    state: opts.state,
    scope: opts.scopes.join(' '),
  }).toString()
  return url.toString()
}
