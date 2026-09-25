import { create } from 'zustand'
import type { FriendlyError } from '../spotify/errors'
import { EMPTY_PLAYBACK, type Device, type PlaybackState, type QueueView } from '../spotify/normalize'

type Loadable<T> = { data: T | null; loading: boolean; error: FriendlyError | null }

export interface PlaybackStore {
  playback: PlaybackState
  /** Local time the snapshot above was true; used to interpolate progress. */
  syncedAt: number
  /** First sync finished (successfully or not). */
  loaded: boolean
  /** Something is loaded on a device (false on 204 / no item). */
  hasPlayback: boolean
  syncError: FriendlyError | null
  queue: Loadable<QueueView>
  devices: Loadable<Device[]>
}

export const initialPlayback: PlaybackStore = {
  playback: EMPTY_PLAYBACK,
  syncedAt: 0,
  loaded: false,
  hasPlayback: false,
  syncError: null,
  queue: { data: null, loading: false, error: null },
  devices: { data: null, loading: false, error: null },
}

/** Written only by spotify/playbackService. UI reads with selectors. */
export const usePlayback = create<PlaybackStore>(() => initialPlayback)

/** Play/pause is possible right now (something is loaded and Spotify allows the toggle). */
export const selectCanToggle = (s: PlaybackStore) =>
  s.hasPlayback && !(s.playback.isPlaying ? s.playback.disallows.pausing : s.playback.disallows.resuming)
