import { create } from 'zustand'
import { EMPTY_CRATE } from '../history/crate'
import type { LibraryIndex } from '../history/library'
import type { Capsule } from '../stories/archive'
import type { Crate, Play } from '../history/types'

export interface HistoryStore {
  /** The log is read from IndexedDB once per launch. */
  loaded: boolean
  /** Every play, oldest first. */
  plays: Play[]
  crate: Crate
  /** Liked songs and playlists, as of the last scan. Null until you scan. */
  library: LibraryIndex | null
  /** Monthly snapshots of your sound. */
  capsules: Capsule[]
}

/** Written only by history/service. UI reads with selectors. */
export const useHistory = create<HistoryStore>(() => ({ loaded: false, plays: [], crate: EMPTY_CRATE, library: null, capsules: [] }))
