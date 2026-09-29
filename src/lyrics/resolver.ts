// Lyrics resolver: track metadata in, lyrics out. Provider-agnostic.
// Providers: the bundled demo library, then LRCLIB (lyrics/lrclib.ts).

import { DEMO_LRC, DEMO_TRACK } from './demo'
import { LRCLIB_ENABLED, lrclibProvider } from './lrclib'
import { matchKey } from './match'
import { parseLRC, type LyricLine } from './lrc'

export { matchKey }

export interface TrackQuery {
  title: string
  artist: string
  durationMs?: number
}

export interface ResolvedLyrics {
  lines: LyricLine[]
  /** True when lines carry real timestamps. */
  synced: boolean
  /** The same lyrics laid out for reading (verse breaks kept), for untimed readers. */
  plain?: LyricLine[]
  /** Shown as attribution under the lyrics. */
  providerName: string
}

export interface LyricsProvider {
  id: string
  name: string
  find(query: TrackQuery): Promise<ResolvedLyrics | null>
}

/** Bundled, original LRC files. Holds the demo track only. */
export function createMockProvider(library: Array<{ title: string; artist: string; lrc: string }>): LyricsProvider {
  const index = new Map(library.map((e) => [`${matchKey(e.title)}|${matchKey(e.artist)}`, e.lrc]))
  const name = 'PartyDeck demo library'
  return {
    id: 'mock',
    name,
    async find({ title, artist }) {
      const firstArtist = artist.split(',')[0] ?? ''
      const lrc = index.get(`${matchKey(title)}|${matchKey(firstArtist)}`)
      if (!lrc) return null
      const lines = parseLRC(lrc)
      return lines.length ? { lines, synced: true, providerName: name } : null // malformed → unavailable
    },
  }
}

export const mockProvider = createMockProvider([{ ...DEMO_TRACK, lrc: DEMO_LRC }])

const PROVIDERS = LRCLIB_ENABLED ? [mockProvider, lrclibProvider] : [mockProvider]

export async function resolveLyrics(query: TrackQuery, providers: LyricsProvider[] = PROVIDERS) {
  for (const p of providers) {
    try {
      const found = await p.find(query)
      if (found?.lines.some((l) => l.text)) return found
    } catch (err) {
      // A failing provider shouldn't hide results from the next one. Said in the
      // console, so "Lyrics unavailable" from a network failure can be told apart.
      console.warn(`Lyrics: ${p.name} failed`, err)
    }
  }
  return null
}
