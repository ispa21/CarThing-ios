// A story, as data: what PartyDeck noticed, the evidence, and what you can do about it.
// The engine writes cards; screens/Stories draws them. Pure types and helpers.

import type { TrackRef } from '../history/types'
import type { Risk } from './session'
import { lengthOf } from './session'

export type Depth = 'now' | 'signals' | 'archive'
/** The four jobs: find what you own, make it listenable, explain the pattern, go somewhere new. */
export type Job = 'discover' | 'curate' | 'understand' | 'explore'

export type Figure =
  | { kind: 'big'; value: string; say: string }
  | { kind: 'rows'; rows: Array<{ title: string; sub?: string; trail?: string }> }
  | { kind: 'columns'; bars: Array<{ label: string; value: number; hot?: boolean }>; caption?: string }
  | { kind: 'meter'; bars: Array<{ label: string; value: number; note?: string; hot?: boolean }> }
  | { kind: 'path'; steps: Array<{ label: string; note?: string }> }
  | { kind: 'covers'; tracks: TrackRef[]; arrows?: boolean }
  | { kind: 'counts'; items: Array<{ value: string; label: string }> }
  | { kind: 'formula'; parts: string[]; result: string }

export type Action =
  | { kind: 'play'; label: string; uris: string[]; name: string; primary?: boolean }
  | { kind: 'crate'; label: string; tracks: TrackRef[] }
  | { kind: 'save'; label: string; name: string; description: string; uris: string[]; public?: boolean }
  | { kind: 'build'; label: string; room?: string; risk?: Risk; minutes?: number }
  | { kind: 'share'; label: string; text: string }
  | { kind: 'dismiss'; label: string }

export interface Card {
  id: string
  depth: Depth
  job: Job
  /** The small legend above: "the loop", "playlist dna · night drive". */
  kicker: string
  headline: string
  lede?: string
  /** "Why this?" — the evidence, in a sentence. */
  why?: string
  figures?: Figure[]
  actions: Action[]
  /** How surprising, 0–1. The day's DROP is picked from the surprising ones. */
  weight: number
  /** An identity statement worth sharing, if there is one. */
  share?: string
  /** Up to four cover images of the tracks it is about (set by the feed), for the share poster. */
  art?: string[]
}

// ── Helpers for writing cards ──

export const fmt = (n: number) => n.toLocaleString('en')
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
export const word = (n: number) => WORDS[n] ?? fmt(n)
export const plural = (n: number, one: string, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`
export const pct = (x: number) => `${Math.round(x * 100)}%`
export const minutes = (tracks: TrackRef[]) => Math.max(1, Math.round(tracks.reduce((s, t) => s + lengthOf(t), 0) / 60_000))
export const monthName = (ts: number) => new Date(ts).toLocaleDateString('en', { month: 'long' })
export const shortDate = (ts: number) => new Date(ts).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
export const ago = (ts: number, now: number) => {
  const d = Math.round((now - ts) / 86_400_000)
  return d < 45 ? `${plural(d, 'day')} ago` : d < 540 ? `${plural(Math.round(d / 30), 'month')} ago` : `${plural(Math.round(d / 365), 'year')} ago`
}

/** The first `max` minutes of a list. */
export function upTo(tracks: TrackRef[], max: number) {
  const out: TrackRef[] = []
  let ms = 0
  for (const t of tracks) {
    if (ms >= max * 60_000) break
    out.push(t)
    ms += lengthOf(t)
  }
  return out
}

export const play = (label: string, tracks: TrackRef[], name: string, primary = true): Action => ({ kind: 'play', label, uris: tracks.map((t) => t.uri), name, primary })
export const playFor = (verb: string, tracks: TrackRef[], name: string, primary = true) => play(`${verb} · ${minutes(tracks)} min`, tracks, name, primary)
