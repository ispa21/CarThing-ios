// The feed: every story there's evidence for, your rooms, and the day's DROP — the one
// thing worth interrupting you with. Stories is the presentation layer; this decides
// what's worth showing today. Pure.

import type { LibraryPlaylist } from '../history/library'
import { capsuleOf, eras, monthSoundtrack, thenVsNow, timeCapsule, type Capsule } from './archive'
import type { Card } from './cards'
import { albumNeglect, almostFans, compression, discoveryDebt, duplicateTaste, followTheThread, forgottenPlaylist, graveyard, outsideTheCore, theBridge } from './discover'
import { stories, type Inputs, type Story } from './engine'
import { buildModel, type Band, type Bucket, type Model } from './model'
import { buildRiskSession, bucketCounts, type Risk, type SessionTrack } from './session'
import {
  antiTaste,
  artistHour,
  bridgeTrack,
  closers,
  comebacks,
  disappearingArtist,
  discoveryFunnel,
  discoveryWindow,
  drift,
  introTest,
  libraryFraud,
  oneNightStands,
  playlistDna,
  repeatThreshold,
  secretGenre,
  tasteCliff,
  tasteWeather,
  theLoop,
  whatPartyDeckKnows,
  wrongLabel,
  yourCore,
  yourDay,
} from './signals'

export interface FeedInputs extends Inputs {
  playlists?: LibraryPlaylist[]
  followed?: string[]
  capsules?: Capsule[]
  /** Story ids you've set aside, until when. */
  dismissed?: Record<string, number>
}

export interface RoomView {
  id: string
  name: string
  artists: string[]
  band: Band | null
  tracks: number
  listens: number
  /** How much of your recent listening happens here. */
  share: number
  counts: Record<Bucket, number>
}

export interface Feed {
  model: Model
  /** The original eight, drawn as the artboards drew them. */
  legacy: Story[]
  cards: Card[]
  rooms: RoomView[]
  drop: Card | null
  capsule: Capsule | null
}

function safely<T>(f: () => T): T | null {
  try {
    return f()
  } catch {
    return null // one story's bad day never takes the feed down
  }
}

export function buildFeed(input: FeedInputs, seed: number): Feed {
  const m = buildModel({ plays: input.plays, library: input.library, playlists: input.playlists, now: input.now })
  const legacy = stories(input, seed)
  const makers: Array<() => Card | null> = [
    // now
    () => forgottenPlaylist(m, seed),
    () => graveyard(m),
    () => outsideTheCore(m, seed),
    () => followTheThread(m),
    () => theBridge(m),
    () => discoveryDebt(m, input.followed ?? [], seed),
    () => almostFans(m),
    () => duplicateTaste(m),
    () => compression(m, m.rooms),
    () => albumNeglect(m),
    // signals
    () => yourCore(m),
    () => secretGenre(m, seed),
    () => drift(m),
    () => tasteCliff(m),
    () => theLoop(m),
    () => discoveryFunnel(m),
    () => discoveryWindow(m, seed),
    () => repeatThreshold(m),
    () => antiTaste(m, seed),
    () => bridgeTrack(m),
    () => oneNightStands(m),
    () => disappearingArtist(m),
    () => introTest(m),
    () => libraryFraud(m, seed),
    () => playlistDna(m, seed),
    () => wrongLabel(m),
    () => tasteWeather(m, seed),
    () => yourDay(m, seed),
    () => artistHour(m, seed),
    () => comebacks(m),
    () => closers(m),
    () => whatPartyDeckKnows(m, seed),
    // archive
    () => eras(m),
    () => thenVsNow(m),
    () => monthSoundtrack(m),
    () => timeCapsule(m, input.capsules ?? []),
  ]
  const hidden = input.dismissed ?? {}
  const cards = makers
    .map((f) => safely(f))
    .filter((c): c is Card => c !== null && !(hidden[c.id] && hidden[c.id] > input.now))
    // A story that can't end in something to do isn't told.
    .filter((c) => c.actions.length > 0)

  const recentTotal = [...m.stats.values()].reduce((s, x) => s + m.recent(x, 90), 0)
  const rooms: RoomView[] = m.rooms.map((r) => {
    const counts: Record<Bucket, number> = { core: 0, familiar: 0, rediscovery: 0, adjacent: 0, experiment: 0, wild: 0 }
    for (const u of r.uris) counts[m.bucket(u)]++
    const recent = r.uris.reduce((s, u) => s + (m.stats.has(u) ? m.recent(m.stats.get(u)!, 90) : 0), 0)
    return { id: r.id, name: r.name, artists: r.artists, band: r.band, tracks: r.uris.length, listens: r.listens, share: recentTotal ? recent / recentTotal : 0, counts }
  })

  // The DROP: rotate daily among the most surprising stories.
  const surprising = [...cards].filter((c) => c.weight >= 0.65).sort((a, b) => b.weight - a.weight).slice(0, 5)
  const drop = surprising.length ? surprising[seed % surprising.length] : null

  return { model: m, legacy, cards, rooms, drop, capsule: safely(() => capsuleOf(m)) }
}

/** Your next N minutes: curious by default — mostly proven, a little new. */
export function nextSession(m: Model, minutes: number, seed: number, risk: Risk = 'curious'): { tracks: SessionTrack[]; counts: Record<Bucket, number>; artists: string[] } {
  const tracks = buildRiskSession(m, { minutes, risk, seed })
  const recent = new Map<string, number>()
  for (const s of m.stats.values()) {
    const n = m.recent(s, 30)
    if (n) recent.set(m.primary(s.track.uri), (recent.get(m.primary(s.track.uri)) ?? 0) + n)
  }
  const artists = [...recent.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a]) => a)
  return { tracks, counts: bucketCounts(tracks), artists }
}

/** A capsule is due when none was sealed this calendar month. */
export const capsuleDue = (capsules: Capsule[], now: number) => {
  const d = new Date(now)
  return !capsules.some((c) => {
    const x = new Date(c.at)
    return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth()
  })
}

