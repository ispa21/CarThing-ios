// The crate: what you're into right now, not everything you own. Pure.

import type { Crate, CrateItem, TrackRef } from './types'

/** An unsaved crate empties itself of records older than this. */
export const CRATE_TTL_MS = 14 * 24 * 60 * 60_000
export const CRATE_MAX = 50

export const EMPTY_CRATE: Crate = { name: 'Crate', items: [], savedAt: null }

export const inCrate = (crate: Crate, uri: string) => crate.items.some((i) => i.uri === uri)

/** Adds a record to the front of the crate (it's the one you just dropped in). No duplicates. */
export function addToCrate(crate: Crate, track: TrackRef, now: number): Crate {
  if (inCrate(crate, track.uri)) return crate
  const item: CrateItem = { ...track, addedAt: now }
  return { ...crate, items: [item, ...crate.items].slice(0, CRATE_MAX) }
}

export const removeFromCrate = (crate: Crate, uri: string): Crate => ({ ...crate, items: crate.items.filter((i) => i.uri !== uri) })

/** Records older than two weeks fall out of an unsaved crate. */
export function pruneCrate(crate: Crate, now: number): Crate {
  if (crate.savedAt) return crate
  const items = crate.items.filter((i) => now - i.addedAt < CRATE_TTL_MS)
  return items.length === crate.items.length ? crate : { ...crate, items }
}

export const crateDuration = (crate: Crate) => crate.items.reduce((sum, i) => sum + i.durationMs, 0)
