// Logs plays while PartyDeck is open: it watches the playback store (never Spotify
// directly) and hands each finished play to the log. Silent: no feedback, ever.

import { interpolateProgress } from '../lib/progress'
import { usePlayback, type PlaybackStore } from '../store/playback'
import { addPlays, loadHistory } from './service'
import { observe, type Open, type Snapshot } from './tracker'

let open: Open | null = null
let stop: (() => void) | null = null

function snapshotOf(s: PlaybackStore, now: number): Snapshot | null {
  const p = s.playback
  if (!s.hasPlayback || !p.uri || p.kind !== 'track' || !p.title) return null
  return {
    uri: p.uri,
    title: p.title,
    artist: p.artist ?? '',
    album: p.album,
    art: p.albumArt,
    durationMs: p.durationMs,
    progressMs: interpolateProgress(p, s.syncedAt, now),
    isPlaying: p.isPlaying,
  }
}

function step(s: PlaybackStore) {
  if (!s.loaded) return
  const r = observe(open, snapshotOf(s, Date.now()), Date.now())
  open = r.open
  if (r.closed) void addPlays([r.closed])
}

export function startRecorder() {
  if (stop) return
  void loadHistory()
  step(usePlayback.getState())
  stop = usePlayback.subscribe(step)
}

export function stopRecorder() {
  stop?.()
  stop = null
  open = null
}
