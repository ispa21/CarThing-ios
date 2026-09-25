import { create } from 'zustand'
import { hasSession, onSessionChange } from '../spotify/auth'
import { describeError, type FriendlyError } from '../spotify/errors'

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

// Spotify-derived playback state is dropped by playbackService.stopPlaybackSync(),
// which runs when the connected app unmounts.
onSessionChange((connected, reason) => {
  useSession.setState(
    connected
      ? { connected, notice: null }
      : { connected, displayName: null, notice: reason ? describeError(reason) : useSession.getState().notice },
  )
})
