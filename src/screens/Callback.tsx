import { useEffect } from 'react'
import { navigate } from '../app/router'
import { AuthError, completeLogin, type AuthFailure } from '../spotify/auth'
import type { FriendlyError } from '../spotify/errors'
import { useSession } from '../store/session'

const NOTICES: Record<AuthFailure, FriendlyError> = {
  denied: {
    title: 'Spotify access was declined',
    detail: 'PartyDeck needs permission to see and control your playback.',
    action: 'connect',
  },
  state: {
    title: "That sign-in didn't match this device",
    detail: 'Start connecting again from here.',
    action: 'connect',
  },
  exchange: { title: "Spotify sign-in didn't finish", detail: 'Try connecting again.', action: 'connect' },
  network: { title: "Can't reach Spotify", detail: 'Check your connection and try again.', action: 'connect' },
}

/** /callback — Spotify redirects here with ?code&state (or ?error). */
export function Callback() {
  useEffect(() => {
    completeLogin(new URLSearchParams(window.location.search))
      .then((to) => {
        useSession.setState({ justConnected: true }) // → "Spotify connected · Power on"
        navigate(to, { replace: true })
      })
      .catch((e: unknown) => {
        useSession.setState({ notice: NOTICES[e instanceof AuthError ? e.kind : 'exchange'] })
        navigate('/', { replace: true })
      })
  }, [])

  return (
    <main className="standby">
      <p className="standby-line label" role="status">
        <span className="led led-pulse" aria-hidden="true" />
        Connecting to Spotify…
      </p>
    </main>
  )
}
