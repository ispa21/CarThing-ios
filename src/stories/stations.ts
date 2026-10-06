// TRANSMISSION's stations: clusters of your own library. Artists that keep turning up
// in the same playlists and the same sessions belong to one station. Behavioural, not
// genre: Spotify no longer gives new apps what genre-and-audio clustering would need. Pure.

import type { LibraryPlaylist, LibraryTrack } from '../history/library'
import { isSpotifyUri } from '../history/match'
import type { Play } from '../history/types'
import { stories, type Inputs, type Story } from './engine'
import { buildModel, type Model, type Room } from './model'

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

/** A room as a station. */
export function roomStation(r: Room): Station {
  const named = r.artists.slice(0, 3).join(', ')
  return {
    id: r.id,
    name: r.name,
    freq: 0,
    artists: r.artists,
    uris: r.uris.filter(isSpotifyUri),
    source: `your library · ${r.uris.length} tracks · ${r.artists.length} artists that share playlists and sessions${r.band ? ` · mostly ${r.band}` : ''}`,
    about: r.artists.length > 3 ? `${named} and friends.` : `${named}.`,
  }
}

export function clusterStations(library: LibraryTrack[], playlists: LibraryPlaylist[], plays: Play[], max = 6, now = Date.now()): Station[] {
  return tune(buildModel({ plays, library, playlists, now }).rooms.slice(0, max).map(roomStation))
}

/** Spread stations evenly across the dial, at one decimal. */
export function tune(stations: Station[]): Station[] {
  const n = stations.length
  return stations.map((s, i) => ({ ...s, freq: Math.round((n === 1 ? (LOW + HIGH) / 2 : LOW + ((HIGH - LOW) * i) / (n - 1)) * 10) / 10 }))
}

/** Every station: your clusters, then the ones your stories found. */
/** Every station, from a model already built: your rooms, then the ones your stories found. */
export function stationsFrom(m: Model, found: Story[], max = 6): Station[] {
  const out: Station[] = m.rooms.slice(0, max).map(roomStation)
  const almosts = found.find((s) => s.id === 'almosts')
  if (almosts?.id === 'almosts')
    out.push({ id: 'almosts', name: 'the almosts', freq: 0, artists: [], uris: almosts.tracks.map((t) => t.uri), source: `your plays · ${almosts.count} tracks you keep almost loving`, about: 'Played again and again, never saved.' })
  const ghosts = found.find((s) => s.id === 'ghosts')
  if (ghosts?.id === 'ghosts') {
    const month = (ts: number) => new Date(ts).toLocaleDateString('en', { month: 'long' })
    out.push({ id: 'ghosts', name: 'ghosts', freq: 0, artists: [], uris: [ghosts.track.uri, ...ghosts.tracks.map((t) => t.uri).filter((u) => u !== ghosts.track.uri)], source: `your plays · ${ghosts.listens} plays, then none`, about: `Everywhere in ${month(ghosts.from)}. Gone since ${month(ghosts.to)}.` })
  }
  const never = m.library.filter((t) => t.liked && !m.stats.get(t.uri)?.starts).map((t) => t.uri)
  if (never.length >= 12) out.push({ id: 'unplayed', name: 'unplayed', freq: 0, artists: [], uris: never, source: `liked songs · ${never.length} tracks with no plays`, about: 'Saved, and never once pressed play.' })
  return tune(out)
}

/** Every station, from scratch (tests and small libraries). */
export function broadcast(inputs: Inputs, playlists: LibraryPlaylist[], seed: number): Station[] {
  return stationsFrom(buildModel({ ...inputs, playlists }), stories(inputs, seed))
}
