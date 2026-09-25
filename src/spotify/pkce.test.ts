import { describe, expect, it } from 'vitest'
import { base64url, buildAuthorizeUrl, createChallenge, createState, createVerifier, isValidState } from './pkce'

describe('PKCE', () => {
  it('creates verifiers inside the allowed charset and length', () => {
    for (let i = 0; i < 50; i++) {
      const v = createVerifier()
      expect(v.length).toBeGreaterThanOrEqual(43)
      expect(v.length).toBeLessThanOrEqual(128)
      expect(v).toMatch(/^[A-Za-z0-9\-._~]+$/)
    }
  })

  it('creates unique verifiers', () => {
    const set = new Set(Array.from({ length: 100 }, createVerifier))
    expect(set.size).toBe(100)
  })

  it('matches the RFC 7636 appendix B S256 test vector', async () => {
    expect(await createChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    )
  })

  it('base64url-encodes without padding or +/', () => {
    expect(base64url(new Uint8Array([251, 255, 191]))).toBe('-_-_')
    expect(base64url(new Uint8Array([1]))).toBe('AQ')
  })

  it('builds the authorize URL with S256 and all required params', () => {
    const url = new URL(
      buildAuthorizeUrl({
        clientId: 'abc',
        redirectUri: 'http://127.0.0.1:5173/callback',
        scopes: ['user-read-playback-state', 'user-modify-playback-state'],
        challenge: 'chal',
        state: 'st',
      }),
    )
    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'abc',
      response_type: 'code',
      redirect_uri: 'http://127.0.0.1:5173/callback',
      code_challenge_method: 'S256',
      code_challenge: 'chal',
      state: 'st',
      scope: 'user-read-playback-state user-modify-playback-state',
    })
  })
})

describe('OAuth state validation', () => {
  it('accepts only an exact match of the stored state', () => {
    const s = createState()
    expect(isValidState(s, s)).toBe(true)
    expect(isValidState(s, s + 'x')).toBe(false)
    expect(isValidState(s, null)).toBe(false)
  })

  it('rejects when nothing was stored (callback we did not start)', () => {
    expect(isValidState(null, 'anything')).toBe(false)
    expect(isValidState(undefined, undefined)).toBe(false)
    expect(isValidState('', '')).toBe(false)
  })

  it('rejects trivially short stored states', () => {
    expect(isValidState('abc', 'abc')).toBe(false)
  })
})
