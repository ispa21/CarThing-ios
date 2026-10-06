// Everything you drop in, turned into plays, with a plain account of each file.
// Written to survive real exports: years of history is hundreds of thousands of rows.

import type { ExportText } from './exportFiles'
import { newAcc, readLibraryFile, type LibraryAcc } from './exportLibrary'
import { parseStreamingHistory } from './importer'
import { knownTracks, resolveNamed } from './match'
import type { Play, TrackRef } from './types'

export interface FileReport {
  name: string
  /** What it was: extended history, the basic export, or something else. */
  kind: 'extended' | 'basic' | 'library' | 'playlists' | 'unknown' | 'failed'
  rows: number
  /** Plays that came out of it. */
  plays: number
  /** For the basic export: plays matched to a track you have. */
  matched?: number
  note?: string
}

export interface ImportOutcome {
  plays: Play[]
  files: FileReport[]
  /** Liked songs and playlists found in the export (read before the plays, so plays can be matched to them). */
  library: LibraryAcc
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0))
const short = (name: string) => name.split('/').pop() ?? name

/** Appends without spreading: `push(...big)` throws once an array is a few tens of thousands long. */
function append<T>(into: T[], from: readonly T[]) {
  for (let i = 0; i < from.length; i++) into.push(from[i])
}

export async function importAll(texts: ExportText[], library: TrackRef[], logged: Play[], onProgress?: (done: number, total: number, name: string) => void): Promise<ImportOutcome> {
  const plays: Play[] = []
  const files: FileReport[] = []
  const acc = newAcc()
  // The library files first: names in the listening history are matched to what they hold.
  const parsed = new Map<string, unknown>()
  for (const file of texts) {
    if (!/(YourLibrary|Playlist\d*)\.json$/i.test(file.name)) continue
    try {
      const json = JSON.parse(file.text)
      const kind = readLibraryFile(json, acc)
      parsed.set(file.name, kind)
    } catch (e) {
      files.push({ name: file.name, kind: 'failed', rows: 0, plays: 0, note: e instanceof Error ? e.message : String(e) })
    }
  }
  for (const [name, kind] of parsed) if (kind === 'library' || kind === 'playlists') files.push({ name, kind, rows: 0, plays: 0 })
  const known = knownTracks([...library, ...acc.map.values()], logged)
  for (const [i, file] of texts.entries()) {
    if (parsed.has(file.name) || files.some((f) => f.name === file.name && f.kind === 'failed')) continue
    onProgress?.(i, texts.length, short(file.name))
    await tick() // let the screen draw before each big file
    try {
      const r = parseStreamingHistory(JSON.parse(file.text))
      if (r.kind === 'extended') {
        append(plays, r.plays)
        files.push({ name: file.name, kind: 'extended', rows: r.plays.length + r.ignored, plays: r.plays.length })
      } else if (r.kind === 'basic') {
        const { plays: resolved, matched } = resolveNamed(r.plays, known)
        append(plays, resolved)
        files.push({ name: file.name, kind: 'basic', rows: r.rows, plays: resolved.length, matched })
      } else {
        files.push({ name: file.name, kind: 'unknown', rows: 0, plays: 0, note: 'not a music streaming history' })
      }
    } catch (e) {
      files.push({ name: file.name, kind: 'failed', rows: 0, plays: 0, note: e instanceof Error ? e.message : String(e) })
    }
  }
  onProgress?.(texts.length, texts.length, '')
  return { plays, files, library: acc }
}

/** One plain sentence about the files, for the status line. */
export function describeImport(files: FileReport[], added: number, total: number, lib?: { tracks: number; playlists: number; liked: number; covered: number }): string {
  const ext = files.filter((f) => f.kind === 'extended')
  const basic = files.filter((f) => f.kind === 'basic')
  const bad = files.filter((f) => f.kind === 'failed')
  const other = files.filter((f) => f.kind === 'unknown').length
  const parts: string[] = []
  if (lib && lib.tracks) parts.push(`Library: ${lib.tracks.toLocaleString()} tracks from ${lib.playlists.toLocaleString()} playlists${lib.liked ? ` and ${lib.liked.toLocaleString()} liked songs` : ''}${lib.covered ? ` (${lib.covered} already read from Spotify)` : ''}.`)
  if (total) parts.push(`Added ${added.toLocaleString()} plays${total > added ? ` (${(total - added).toLocaleString()} were already in the log)` : ''}.`)
  else if (!(lib && lib.tracks)) parts.push('No plays found.')
  if (ext.length) parts.push(`${ext.length} extended history ${ext.length === 1 ? 'file' : 'files'}.`)
  if (basic.length) {
    const rows = basic.reduce((s, f) => s + f.plays, 0)
    const matched = basic.reduce((s, f) => s + (f.matched ?? 0), 0)
    parts.push(`${basic.length} basic ${basic.length === 1 ? 'file' : 'files'} (the quick export: names only, last year): ${matched.toLocaleString()} of ${rows.toLocaleString()} plays matched to songs you have; the rest still count for artists and hours. Request “Extended streaming history” for all-time data with track links.`)
  }
  if (bad.length) parts.push(`${bad.length === 1 ? 'One file' : `${bad.length} files`} couldn’t be read (${bad[0].note}).`)
  if (other) parts.push(`${other} other ${other === 1 ? 'file was' : 'files were'} skipped (not music history).`)
  return parts.join(' ')
}
