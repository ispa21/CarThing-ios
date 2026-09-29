import { create } from 'zustand'
import { EMPTY_CRATE } from '../history/crate'
import type { Crate, Play } from '../history/types'

export interface HistoryStore {
  /** The log is read from IndexedDB once per launch. */
  loaded: boolean
  /** Every play, oldest first. */
  plays: Play[]
  crate: Crate
}

/** Written only by history/service. UI reads with selectors. */
export const useHistory = create<HistoryStore>(() => ({ loaded: false, plays: [], crate: EMPTY_CRATE }))
