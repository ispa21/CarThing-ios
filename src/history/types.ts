// The listening log's shapes. Kept on this device (IndexedDB), never uploaded.

export interface TrackRef {
  uri: string
  title: string
  artist: string
  album: string | null
  art: string | null
  durationMs: number
}

/** One play of one track. */
export interface Play extends TrackRef {
  /** When it started (epoch ms). */
  ts: number
  /** How much of it was heard. */
  playedMs: number
  /** Left well before the end. */
  skipped: boolean
  /** live: logged while PartyDeck was open. recent: Spotify's last-50 list. import: your streaming-history export. */
  source: 'live' | 'recent' | 'import'
}

/** Plays with no gap longer than SESSION_GAP_MS between them. */
export interface Session {
  /** Stable within a day: 1-based count of sessions since the log began. */
  n: number
  start: number
  end: number
  plays: Play[]
  heardMs: number
  /** The most tracks in a row played through without a skip, and where that run began. */
  longestRun: { length: number; start: number }
}

export interface CrateItem extends TrackRef {
  addedAt: number
}

export interface Crate {
  name: string
  items: CrateItem[]
  /** Saved as a Spotify playlist: it no longer empties itself. */
  savedAt: number | null
}
