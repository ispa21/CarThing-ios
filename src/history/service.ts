// The listening log's actions: load, record, merge, crate edits, wipe.
// Nothing here talks to Spotify; spotify/playbackService fetches, this keeps.

import { useHistory } from '../store/history'
import { addToCrate, pruneCrate, removeFromCrate } from './crate'
import * as db from './db'
import { mergePlays } from './merge'
import type { Crate, Play, TrackRef } from './types'

const set = useHistory.setState
const get = useHistory.getState

let loading: Promise<void> | null = null

export function loadHistory(): Promise<void> {
  loading ??= (async () => {
    const [plays, crate] = await Promise.all([db.allPlays().catch(() => [] as Play[]), db.getCrate().catch(() => null)])
    const pruned = crate ? pruneCrate(crate, Date.now()) : get().crate
    set({ loaded: true, plays: [...plays, ...get().plays].sort((a, b) => a.ts - b.ts), crate: pruned })
    if (crate && pruned !== crate) void db.putCrate(pruned)
  })()
  return loading
}

/** Adds plays from any source, skipping ones already in the log. Returns how many were new. */
export async function addPlays(incoming: Play[]) {
  await loadHistory()
  const fresh = mergePlays(get().plays, incoming)
  if (!fresh.length) return 0
  set({ plays: [...get().plays, ...fresh].sort((a, b) => a.ts - b.ts) })
  await db.addPlays(fresh).catch(() => {})
  return fresh.length
}

function saveCrate(crate: Crate) {
  set({ crate })
  void db.putCrate(crate).catch(() => {})
}

export function crateAdd(track: TrackRef) {
  saveCrate(addToCrate(get().crate, track, Date.now()))
}

export function crateRemove(uri: string) {
  saveCrate(removeFromCrate(get().crate, uri))
}

export function crateRename(name: string) {
  saveCrate({ ...get().crate, name: name.trim().slice(0, 60) || 'Crate' })
}

export function crateSaved() {
  saveCrate({ ...get().crate, savedAt: Date.now() })
}

export function crateEmpty() {
  saveCrate({ ...get().crate, items: [], savedAt: null })
}

/** Disconnect: the log and the crate are Spotify-derived, so they go too. */
export async function wipeHistory() {
  loading = null
  set({ loaded: false, plays: [], crate: { name: 'Crate', items: [], savedAt: null } })
  await db.wipe().catch(() => {})
}
