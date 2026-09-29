// TRANSMISSION's stations: clusters of your own library. Artists that keep turning up
// in the same playlists and the same sessions belong to one station. Behavioural, not
// genre: Spotify no longer gives new apps what genre-and-audio clustering would need. Pure.

import type { LibraryPlaylist, LibraryTrack } from '../history/library'
import { sessionsFrom } from '../history/sessions'
import type { Play } from '../history/types'
import { stories, type Inputs } from './engine'

export interface Station {
  id: string
  name: string
  /** MHz on the dial. */
  freq: number
  artists: string[]
  uris: string[]
  /** Where it came from, said plainly. */
  source: string
  /** One line about it, in a person's voice. */
  about: string
}

const LOW = 88.1
const HIGH = 107.5

export function clusterStations(library: LibraryTrack[], playlists: LibraryPlaylist[], plays: Play[], max = 6): Station[] {
  const weight = new Map<string, Map<string, number>>()
  const bump = (a: string, b: string) => {
    if (!a || !b || a === b) return
    for (const [x, y] of [
      [a, b],
      [b, a],
    ]) {
      const m = weight.get(x) ?? new Map<string, number>()
      m.set(y, (m.get(y) ?? 0) + 1)
      weight.set(x, m)
    }
  }
  const together = (artists: string[]) => {
    const list = [...new Set(artists)].slice(0, 60)
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) bump(list[i], list[j])
  }
  for (const p of playlists) together(library.filter((t) => t.playlists.includes(p.id)).map((t) => t.artist))
  for (const s of sessionsFrom(plays)) together(s.plays.map((p) => p.artist).slice(0, 40))

  const tracksBy = new Map<string, LibraryTrack[]>()
  for (const t of library) tracksBy.set(t.artist, [...(tracksBy.get(t.artist) ?? []), t])
  const degree = (a: string) => [...(weight.get(a)?.values() ?? [])].reduce((s, n) => s + n, 0)

  const taken = new Set<string>()
  const clusters: string[][] = []
  for (const seed of [...weight.keys()].sort((a, b) => degree(b) - degree(a))) {
    if (taken.has(seed) || clusters.length >= max) continue
    const neighbours = [...(weight.get(seed)?.entries() ?? [])].filter(([a]) => !taken.has(a)).sort((a, b) => b[1] - a[1])
    const top = neighbours[0]?.[1] ?? 0
    const members = [seed, ...neighbours.filter(([, n]) => n >= Math.max(1, top * 0.3)).map(([a]) => a)].slice(0, 25)
    const size = members.reduce((s, a) => s + (tracksBy.get(a)?.length ?? 0), 0)
    if (members.length < 2 || size < 8) continue
    members.forEach((a) => taken.add(a))
    clusters.push(members)
  }

  const byUri = new Map(library.map((t) => [t.uri, t]))
  const stations = clusters.map((artists, i) => {
    const uris = artists.flatMap((a) => (tracksBy.get(a) ?? []).map((t) => t.uri))
    // Named for the playlist it overlaps most, else for its central artist.
    const overlap = playlists
      .map((p) => ({ p, n: uris.filter((u) => byUri.get(u)?.playlists.includes(p.id)).length }))
      .sort((a, b) => b.n - a.n)[0]
    const name = overlap && overlap.n >= uris.length * 0.3 ? overlap.p.name : `${artists[0]} and friends`
    const named = artists.slice(0, 3).join(', ')
    return {
      id: `c${i}`,
      name: name.toLowerCase(),
      freq: 0,
      artists,
      uris,
      source: `your library · ${uris.length} tracks · ${artists.length} artists that share playlists and sessions`,
      about: artists.length > 3 ? `${named} and friends.` : `${named}.`,
    }
  })
  return tune(stations)
}

/** Spread stations evenly across the dial, at one decimal. */
export function tune(stations: Station[]): Station[] {
  const n = stations.length
  return stations.map((s, i) => ({ ...s, freq: Math.round((n === 1 ? (LOW + HIGH) / 2 : LOW + ((HIGH - LOW) * i) / (n - 1)) * 10) / 10 }))
}

/** Every station: your clusters, then the ones your stories found. */
export function broadcast(inputs: Inputs, playlists: LibraryPlaylist[], seed: number): Station[] {
  const found = stories(inputs, seed)
  const out: Station[] = clusterStations(inputs.library, playlists, inputs.plays)
  const almosts = found.find((s) => s.id === 'almosts')
  if (almosts?.id === 'almosts')
    out.push({ id: 'almosts', name: 'the almosts', freq: 0, artists: [], uris: almosts.tracks.map((t) => t.uri), source: `your plays · ${almosts.count} tracks you keep almost loving`, about: 'Played again and again, never saved.' })
  const ghosts = found.find((s) => s.id === 'ghosts')
  if (ghosts?.id === 'ghosts') {
    const month = (ts: number) => new Date(ts).toLocaleDateString('en', { month: 'long' })
    out.push({ id: 'ghosts', name: 'ghosts', freq: 0, artists: [], uris: [ghosts.track.uri, ...ghosts.tracks.map((t) => t.uri).filter((u) => u !== ghosts.track.uri)], source: `your plays · ${ghosts.listens} plays, then none`, about: `Everywhere in ${month(ghosts.from)}. Gone since ${month(ghosts.to)}.` })
  }
  const unplayed = new Set(inputs.plays.map((p) => p.uri))
  const never = inputs.library.filter((t) => t.liked && !unplayed.has(t.uri)).map((t) => t.uri)
  if (never.length >= 12) out.push({ id: 'unplayed', name: 'unplayed', freq: 0, artists: [], uris: never, source: `liked songs · ${never.length} tracks with no plays`, about: 'Saved, and never once pressed play.' })
  return tune(out)
}
