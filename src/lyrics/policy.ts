export type PlaybackSource = 'spotify' | 'demo'

/**
 * Spotify's Developer Policy and Compliance Tips prohibit synchronising sound
 * recordings streamed via the Spotify Platform with lyrics or other visual media
 * (https://developer.spotify.com/policy, https://developer.spotify.com/compliance-tips).
 *
 * So for Spotify playback the lyrics reader is static (manual scroll only).
 * Timed follow is only used with clocks that aren't Spotify audio — today the
 * demo clock, later local audio. Change this only with written permission from
 * Spotify that explicitly covers it.
 */
export function canTimeSync(source: PlaybackSource): boolean {
  return source !== 'spotify'
}
