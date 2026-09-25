// Lyrics resolver: track metadata in, lyrics out. Provider-agnostic.
// Phase 2 adds a licensed provider here — only after its terms are verified.

import { DEMO_LRC, DEMO_TRACK } from './demo'
import { parseLRC, type LyricLine } from './lrc'

export interface TrackQuery {
  title: string
  artist: string
  durationMs?: number
}

export interface ResolvedLyrics {
  lines: LyricLine[]
  /** True when lines carry real timestamps. */
  synced: boolean
  /** Shown as attribution under the lyrics. */
  providerName: string
}

export interface LyricsProvider {
  id: string
  name: string
  find(query: TrackQuery): Promise<ResolvedLyrics | null>
}

/** "Blinding Lights - 2020 Remaster (feat. X)" and "blinding lights" → "blinding lights". */
export function matchKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s[-–—]\s.*$/, '')
    .replace(/[([].*?[)\]]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
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

export async function resolveLyrics(query: TrackQuery, providers: LyricsProvider[] = [mockProvider]) {
  for (const p of providers) {
    try {
      const found = await p.find(query)
      if (found?.lines.some((l) => l.text)) return found
    } catch {
      // A failing provider shouldn't hide results from the next one.
    }
  }
  return null
}
