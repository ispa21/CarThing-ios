// LyricsEngine: given lines and a playback position, which line is current?
// Works with any clock (Spotify, demo, future local audio). Must not import Spotify.

import type { LyricLine } from './lrc'

/**
 * While playing, highlight slightly early so the line change lands on the
 * sung word instead of trailing it (covers poll jitter + transition time).
 */
export const PLAYING_LEAD_MS = 150

/** Index of the last line whose start ≤ position, or -1 before the first line. */
export function getCurrentLyricIndex(lyrics: readonly LyricLine[], positionMs: number): number {
  let lo = 0
  let hi = lyrics.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lyrics[mid].startMs <= positionMs) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return found
}

export interface LyricsEngineInput {
  lyrics: readonly LyricLine[]
  playbackPositionMs: number
  isPlaying: boolean
  /** How many lines of context either side (for compact / TV views). */
  before?: number
  after?: number
}

export interface LyricsEngineOutput {
  currentIndex: number
  currentLine: LyricLine | null
  previousLines: LyricLine[]
  nextLines: LyricLine[]
}

export function lyricsEngine({
  lyrics,
  playbackPositionMs,
  isPlaying,
  before = 2,
  after = 3,
}: LyricsEngineInput): LyricsEngineOutput {
  const position = playbackPositionMs + (isPlaying ? PLAYING_LEAD_MS : 0)
  const currentIndex = getCurrentLyricIndex(lyrics, position)
  return {
    currentIndex,
    currentLine: currentIndex >= 0 ? lyrics[currentIndex] : null,
    previousLines: currentIndex > 0 ? lyrics.slice(Math.max(0, currentIndex - before), currentIndex) : [],
    nextLines: lyrics.slice(currentIndex + 1, currentIndex + 1 + after),
  }
}
