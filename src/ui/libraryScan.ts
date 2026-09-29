// The library read, owned by the app rather than a screen: it keeps going when you
// navigate away, saves checkpoints as it goes, and refreshes itself quietly when stale.

import { create } from 'zustand'
import { saveLibrary } from '../history/service'
import { feedback } from '../sensory/feedback'
import { hasScope } from '../spotify/auth'
import { explainError, scanLibrary, type ScanProgress, type ScanResult } from '../spotify/playbackService'
import { useHistory } from '../store/history'

interface ScanState {
  running: boolean
  progress: ScanProgress | null
  /** What the last read did, in plain words. */
  status: string
}

export const useScan = create<ScanState>(() => ({ running: false, progress: null, status: '' }))

/** A library older than this refreshes itself when Stories opens. */
export const STALE_MS = 6 * 3_600_000

function describe(r: ScanResult, incremental: boolean) {
  const trouble = r.problems.length ? ` Spotify said: ${r.problems.slice(0, 3).join(' · ')}.` : ''
  const unreadable = r.skipped ? ` Spotify won't open ${r.skipped === 1 ? 'one playlist' : `${r.skipped} playlists`} for this app (only ones you own or collaborate on).` : ''
  if (incremental && !r.delta.fullLiked) {
    const parts = [r.delta.newLiked ? `${r.delta.newLiked} new liked ${r.delta.newLiked === 1 ? 'song' : 'songs'}` : null, r.delta.changed ? `${r.delta.changed} changed ${r.delta.changed === 1 ? 'playlist' : 'playlists'}` : null].filter(Boolean)
    return `${parts.length ? `Up to date: ${parts.join(', ')}` : 'Up to date: nothing changed'} (${r.delta.unchanged} playlists unchanged, ${r.tracks.length.toLocaleString()} tracks in all).${unreadable}${trouble}`
  }
  return `Read ${r.tracks.length.toLocaleString()} tracks from your liked songs and ${r.playlists.filter((p) => p.readable !== false).length} playlists${r.followed?.length ? `, and ${r.followed.length} artists you follow` : ''}.${unreadable}${trouble}`
}

/** Reads the library: everything the first time, only what changed after that. */
export async function startScan({ quiet = false }: { quiet?: boolean } = {}) {
  if (useScan.getState().running || !hasScope('user-library-read')) return
  const prev = useHistory.getState().library
  const incremental = Boolean(prev?.playlists.some((p) => p.snapshot))
  useScan.setState({ running: true, progress: { phase: 'liked', done: 0, total: 1 }, status: incremental ? 'Checking what changed…' : 'Reading your whole library — the first read takes a few minutes; later ones are quick.' })
  try {
    const r = await scanLibrary(
      prev,
      (progress) => useScan.setState({ progress }),
      undefined,
      (index) => saveLibrary(index),
    )
    if (!r) return
    const { skipped: _s, problems: _p, delta: _d, ...index } = r
    if (!index.tracks.length && prev?.tracks.length) {
      useScan.setState({ status: `Couldn't read your library.${r.problems.length ? ` Spotify said: ${r.problems.slice(0, 3).join(' · ')}.` : ''} Your last read is still here.` })
      return
    }
    saveLibrary(index)
    if (!quiet) feedback.play('success') // a confirmation after the round trip: sound only
    useScan.setState({ status: describe(r, incremental) })
  } catch (e) {
    explainError(e)
    useScan.setState({ status: `The read stopped: ${e instanceof Error ? e.message : String(e)}. What it read so far is kept; read again to carry on.` })
  } finally {
    useScan.setState({ running: false, progress: null })
  }
}
