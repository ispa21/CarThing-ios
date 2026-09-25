import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RawPlayback, RawTrack } from './types'

// The real playbackService, with the network, auth and sensory output stubbed.
vi.mock('./api', () => ({
  getPlayback: vi.fn(),
  getMe: vi.fn(async () => ({ id: 'u', display_name: 'U' })),
  getQueue: vi.fn(async () => ({ currently_playing: null, queue: [] })),
  getDevices: vi.fn(async () => ({ devices: [] })),
  pausePlayback: vi.fn(async () => null),
  startPlayback: vi.fn(async () => null),
  skipToNext: vi.fn(async () => null),
  skipToPrevious: vi.fn(async () => null),
  seekToPosition: vi.fn(async () => null),
  addToQueue: vi.fn(async () => null),
  transferPlayback: vi.fn(async () => null),
}))
vi.mock('./auth', () => ({ logout: vi.fn(), hasSession: () => true, onSessionChange: () => () => {} }))
vi.mock('../sensory/feedback', () => ({ feedback: { play: vi.fn(), configure: vi.fn() } }))

const api = await import('./api')
const { feedback } = await import('../sensory/feedback')
const service = await import('./playbackService')
const { SpotifyError } = await import('./errors')

const track = (id: string): RawTrack => ({
  type: 'track',
  id,
  name: `Song ${id}`,
  uri: `spotify:track:${id}`,
  duration_ms: 30_000,
  artists: [{ id: 'a', name: 'A', uri: 'spotify:artist:a' }],
  album: { id: 'al', name: 'Al', uri: 'spotify:album:al', images: [], artists: [] },
})

let poll = 0
const playback = (): RawPlayback => {
  poll++
  // Track changes every other poll; play state flips — lots of "events" arriving from Spotify.
  return {
    device: { id: 'd', name: 'D', type: 'Speaker', is_active: true, is_restricted: false, volume_percent: 50 },
    progress_ms: 1000,
    is_playing: poll % 3 !== 0,
    item: track(String(Math.floor(poll / 2))),
  }
}

describe('playbackService and sensory feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('document', { hidden: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() })
    vi.mocked(api.getPlayback).mockImplementation(async () => playback())
    vi.mocked(feedback.play).mockClear()
    poll = 0
  })
  afterEach(() => {
    service.stopPlaybackSync()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('polling never triggers feedback — not on track changes, not on play/pause changes', async () => {
    service.startPlaybackSync()
    await vi.advanceTimersByTimeAsync(60_000) // a minute of polls
    expect(poll).toBeGreaterThan(5)
    expect(feedback.play).not.toHaveBeenCalled()
  })

  it('a poll that fails (network, 429) is silent too', async () => {
    vi.mocked(api.getPlayback).mockRejectedValue(new SpotifyError(0, 'offline', 'NETWORK'))
    service.startPlaybackSync()
    await vi.advanceTimersByTimeAsync(40_000)
    expect(feedback.play).not.toHaveBeenCalled()
  })

  it('user commands play their cue once, synchronously (inside the gesture)', async () => {
    service.startPlaybackSync()
    await vi.advanceTimersByTimeAsync(10)
    void service.skipNext()
    expect(feedback.play).toHaveBeenLastCalledWith('next-track') // before any await
    void service.skipPrevious()
    expect(feedback.play).toHaveBeenLastCalledWith('previous-track')
    void service.togglePlay()
    expect(feedback.play).toHaveBeenLastCalledWith('pause') // poll 1 was playing
    expect(feedback.play).toHaveBeenCalledTimes(3)
  })

  it('queue add: press now, confirmation after Spotify accepts', async () => {
    service.startPlaybackSync()
    await vi.advanceTimersByTimeAsync(10)
    const item = { id: 'x', uri: 'spotify:track:x', kind: 'track' as const, title: 'X', subtitle: '', art: null, url: null }
    const done = service.queueItem(item)
    expect(vi.mocked(feedback.play).mock.calls.map((c) => c[0])).toEqual(['select'])
    await done
    expect(vi.mocked(feedback.play).mock.calls.map((c) => c[0])).toEqual(['select', 'queue-add'])
  })

  it('a rejected command plays the error cue (and no success cue)', async () => {
    service.startPlaybackSync()
    await vi.advanceTimersByTimeAsync(10)
    vi.mocked(api.addToQueue).mockRejectedValueOnce(new SpotifyError(403, 'Premium required', 'PREMIUM_REQUIRED'))
    await service.queueItem({ id: 'y', uri: 'spotify:track:y', kind: 'track', title: 'Y', subtitle: '', art: null, url: null })
    const events = vi.mocked(feedback.play).mock.calls.map((c) => c[0])
    expect(events).toEqual(['select', 'playback-error'])
  })

  it('a disallowed command is a silent no-op', async () => {
    vi.mocked(api.getPlayback).mockImplementation(async () => ({ ...playback(), actions: { disallows: { skipping_next: true } } }))
    service.startPlaybackSync()
    await vi.advanceTimersByTimeAsync(10)
    expect(await service.skipNext()).toBe(false)
    expect(feedback.play).not.toHaveBeenCalled()
    expect(api.skipToNext).not.toHaveBeenCalled()
  })
})
