import { create } from 'zustand'
import { hasSession, onSessionChange } from '../spotify/auth'
import type { FriendlyError } from '../spotify/errors'
import { initialPlayback, usePlayback } from './playback'

interface SessionStore {
  connected: boolean
  displayName: string | null
  /** Why the user is looking at the Connect screen (expired, denied, not allow-listed…). */
  notice: FriendlyError | null
}

export const useSession = create<SessionStore>(() => ({
  connected: hasSession(),
  displayName: null,
  notice: null,
}))

onSessionChange((connected) => {
  useSession.setState(connected ? { connected, notice: null } : { connected, displayName: null })
  if (!connected) usePlayback.setState(initialPlayback, true) // drop all Spotify-derived state
})
