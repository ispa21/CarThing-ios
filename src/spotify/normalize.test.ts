import { describe, expect, it } from 'vitest'
import {
  EMPTY_PLAYBACK,
  isSearchEmpty,
  normalizePlayback,
  normalizePlaylist,
  normalizePlaylistItems,
  normalizeSavedTracks,
  normalizeQueue,
  normalizeSearch,
  pickImage,
  safeSpotifyUri,
  safeSpotifyUrl,
} from './normalize'
import type { RawEpisode, RawPlayback, RawTrack } from './types'

const track = (over: Partial<RawTrack> = {}): RawTrack => ({
  type: 'track',
  id: 't1',
  name: 'Night Drive',
  uri: 'spotify:track:t1',
  duration_ms: 222_000,
  artists: [
    { id: 'a1', name: 'Lumen', uri: 'spotify:artist:a1' },
    { id: 'a2', name: 'Harbor', uri: 'spotify:artist:a2' },
  ],
  album: {
    id: 'al1',
    name: 'After Hours Radio',
    uri: 'spotify:album:al1',
    artists: [],
    images: [
      { url: 'https://i.scdn.co/640', width: 640, height: 640 },
      { url: 'https://i.scdn.co/300', width: 300, height: 300 },
      { url: 'https://i.scdn.co/64', width: 64, height: 64 },
    ],
  },
  external_urls: { spotify: 'https://open.spotify.com/track/t1' },
  ...over,
})

const episode: RawEpisode = {
  type: 'episode',
  id: 'e1',
  name: 'Episode 12',
  uri: 'spotify:episode:e1',
  duration_ms: 3_600_000,
  images: [],
  show: { name: 'The Show', images: [{ url: 'https://i.scdn.co/show', width: 640, height: 640 }] },
  external_urls: { spotify: 'https://open.spotify.com/episode/e1' },
}

const playback = (over: Partial<RawPlayback> = {}): RawPlayback => ({
  device: { id: 'd1', name: 'Kitchen', type: 'Speaker', is_active: true, is_restricted: false, volume_percent: 40 },
  progress_ms: 134_000,
  is_playing: true,
  item: track(),
  actions: { disallows: { skipping_prev: true } },
  ...over,
})

describe('normalizePlayback', () => {
  it('maps a playing track', () => {
    expect(normalizePlayback(playback())).toEqual({
      trackId: 't1',
      title: 'Night Drive',
      artist: 'Lumen, Harbor',
      album: 'After Hours Radio',
      albumArt: 'https://i.scdn.co/640',
      durationMs: 222_000,
      progressMs: 134_000,
      isPlaying: true,
      deviceId: 'd1',
      deviceName: 'Kitchen',
      uri: 'spotify:track:t1',
      url: 'https://open.spotify.com/track/t1',
      kind: 'track',
      shuffle: false,
      repeat: 'off',
      volume: 40,
      disallows: {
        pausing: false,
        resuming: false,
        seeking: false,
        skippingNext: false,
        skippingPrev: true,
        shuffling: false,
        repeatingContext: false,
        repeatingTrack: false,
      },
    })
  })

  it('returns the empty state for 204 / null', () => {
    expect(normalizePlayback(null)).toBe(EMPTY_PLAYBACK)
  })

  it('keeps the device but not "playing" when there is no item', () => {
    const s = normalizePlayback(playback({ item: null, is_playing: true }))
    expect(s.isPlaying).toBe(false)
    expect(s.trackId).toBeNull()
    expect(s.deviceName).toBe('Kitchen')
  })

  it('maps podcast episodes, falling back to show art', () => {
    const s = normalizePlayback(playback({ item: episode }))
    expect(s.kind).toBe('episode')
    expect(s.artist).toBe('The Show')
    expect(s.album).toBeNull()
    expect(s.albumArt).toBe('https://i.scdn.co/show')
  })

  it('uses the uri as id for local files and clamps negative progress', () => {
    const s = normalizePlayback(playback({ item: track({ id: null, uri: 'spotify:local:x' }), progress_ms: -5 }))
    expect(s.trackId).toBe('spotify:local:x')
    expect(s.progressMs).toBe(0)
  })

  it('drops non-https artwork', () => {
    const t = track()
    t.album.images = [{ url: 'http://insecure/640', width: 640 }]
    expect(normalizePlayback(playback({ item: t })).albumArt).toBeNull()
  })
})

describe('pickImage', () => {
  const imgs = track().album.images
  it('picks the smallest image at least minWidth wide', () => {
    expect(pickImage(imgs, 64)).toBe('https://i.scdn.co/64')
    expect(pickImage(imgs, 200)).toBe('https://i.scdn.co/300')
  })
  it('falls back to the largest', () => {
    expect(pickImage(imgs, 2000)).toBe('https://i.scdn.co/640')
  })
  it('takes the first when widths are missing', () => {
    expect(pickImage([{ url: 'https://mosaic.scdn.co/a' }, { url: 'https://mosaic.scdn.co/b' }])).toBe(
      'https://mosaic.scdn.co/a',
    )
  })
  it('handles empty', () => {
    expect(pickImage(null)).toBeNull()
    expect(pickImage([])).toBeNull()
  })
})

describe('normalizeQueue', () => {
  it('splits current and up next, numbering order preserved, nulls dropped', () => {
    const q = normalizeQueue({
      currently_playing: track(),
      queue: [track({ id: 'q1', uri: 'spotify:track:q1', name: 'One' }), null, episode, track({ id: 'q2', uri: 'spotify:track:q2', name: 'Two' })],
    })
    expect(q.current?.title).toBe('Night Drive')
    expect(q.upNext.map((i) => i.title)).toEqual(['One', 'Episode 12', 'Two'])
    expect(q.upNext[1]).toMatchObject({ kind: 'episode', subtitle: 'The Show' })
    expect(q.upNext[0].art).toBe('https://i.scdn.co/300') // next up is shown at scale
    expect(q.upNext[2].art).toBe('https://i.scdn.co/64') // the rest are rows
  })
  it('handles no queue', () => {
    expect(normalizeQueue(null)).toEqual({ current: null, upNext: [] })
    expect(normalizeQueue({ currently_playing: null, queue: [] })).toEqual({ current: null, upNext: [] })
  })
})

describe('normalizeSearch / playlists', () => {
  it('drops null entries Spotify returns in playlist results', () => {
    const s = normalizeSearch({
      tracks: { items: [track()], total: 1, next: null },
      playlists: {
        items: [null, { id: 'p1', name: 'Mix', uri: 'spotify:playlist:p1', images: null, owner: { display_name: 'Ana' }, items: { total: 3 } }],
        total: 2,
        next: null,
      },
    })
    expect(s.tracks).toHaveLength(1)
    expect(s.playlists).toEqual([
      { id: 'p1', uri: 'spotify:playlist:p1', kind: 'playlist', title: 'Mix', subtitle: 'By Ana, 3 songs', art: null, url: null, count: 3 },
    ])
    expect(isSearchEmpty(s)).toBe(false)
    expect(isSearchEmpty(normalizeSearch(null))).toBe(true)
  })

  it('reads the legacy `tracks.total` if `items` is absent', () => {
    expect(
      normalizePlaylist({ id: 'p', name: 'P', uri: 'spotify:playlist:p', images: [], tracks: { total: 1 } }).subtitle,
    ).toBe('1 song')
  })
})

describe('safeSpotifyUri (opens the Spotify app)', () => {
  it('allows well-formed URIs of kinds the app can open', () => {
    expect(safeSpotifyUri('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M')).toBe('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M')
    expect(safeSpotifyUri('spotify:track:4uLU6hMCjMI75M1A2tKUQC')).toBe('spotify:track:4uLU6hMCjMI75M1A2tKUQC')
    expect(safeSpotifyUri('spotify:episode:512ojhOuo1ktJprKbVcKyQ')).not.toBeNull()
  })
  it('rejects anything else', () => {
    expect(safeSpotifyUri('spotify:local:Artist:Album:Song:180')).toBeNull()
    expect(safeSpotifyUri('spotify:user:bob:playlist:37i9dQZF1DXcBWIGoYBM5M')).toBeNull()
    expect(safeSpotifyUri('spotify:track:short')).toBeNull()
    expect(safeSpotifyUri('javascript:alert(1)//spotify:track:4uLU6hMCjMI75M1A2tKUQC')).toBeNull()
    expect(safeSpotifyUri('spotify:track:4uLU6hMCjMI75M1A2tKUQC\nx')).toBeNull()
    expect(safeSpotifyUri(null)).toBeNull()
  })
})

describe('safeSpotifyUrl', () => {
  it('allows https spotify.com links only', () => {
    expect(safeSpotifyUrl('https://open.spotify.com/track/1')).toBe('https://open.spotify.com/track/1')
    expect(safeSpotifyUrl('javascript:alert(1)')).toBeNull()
    expect(safeSpotifyUrl('http://open.spotify.com/track/1')).toBeNull()
    expect(safeSpotifyUrl('https://open.spotify.com.evil.io/x')).toBeNull()
    expect(safeSpotifyUrl('not a url')).toBeNull()
    expect(safeSpotifyUrl(undefined)).toBeNull()
  })
})

describe('normalizePlayback: modes and volume', () => {
  const base = { device: null, progress_ms: 0, is_playing: true, item: null }
  it('reads shuffle and repeat, defaulting to off', () => {
    expect(normalizePlayback({ ...base, shuffle_state: true, repeat_state: 'track' })).toMatchObject({ shuffle: true, repeat: 'track' })
    expect(normalizePlayback({ ...base, repeat_state: 'context' }).repeat).toBe('context')
    expect(normalizePlayback({ ...base, repeat_state: 'bogus' }).repeat).toBe('off')
    expect(normalizePlayback(base)).toMatchObject({ shuffle: false, repeat: 'off' })
  })
  it('only offers volume the device lets us set', () => {
    const device = { id: 'd', name: 'D', type: 'Speaker', is_active: true, is_restricted: false }
    expect(normalizePlayback({ ...base, device: { ...device, volume_percent: 64, supports_volume: true } }).volume).toBe(64)
    expect(normalizePlayback({ ...base, device: { ...device, volume_percent: 100, supports_volume: false } }).volume).toBeNull()
    expect(normalizePlayback({ ...base, device: { ...device, volume_percent: null } }).volume).toBeNull()
    expect(normalizePlayback({ ...base, device: { ...device, volume_percent: 140 } }).volume).toBe(100)
  })
  it('maps the mode disallows', () => {
    const p = normalizePlayback({ ...base, actions: { disallows: { toggling_shuffle: true, toggling_repeat_track: true } } })
    expect(p.disallows).toMatchObject({ shuffling: true, repeatingTrack: true, repeatingContext: false })
  })
})

describe('library pages', () => {
  it('reads saved tracks and playlist items (Feb 2026 `item`), dropping episodes and local files', () => {
    const saved = normalizeSavedTracks({ items: [{ added_at: '2024-02-01T00:00:00Z', track: track() }, { added_at: 'x', track: null }], total: 2, next: null })
    expect(saved).toEqual([
      { uri: 'spotify:track:t1', title: 'Night Drive', artist: 'Lumen, Harbor', album: 'After Hours Radio', art: 'https://i.scdn.co/300', durationMs: 222_000, addedAt: Date.parse('2024-02-01T00:00:00Z') },
    ])
    const items = normalizePlaylistItems({
      items: [
        { added_at: '1970-01-01T00:00:00Z', item: track() },
        { added_at: null, item: episode },
        { added_at: null, item: track({ is_local: true, uri: 'spotify:local:x' }) },
      ],
      total: 3,
      next: null,
    })
    expect(items.map((t) => [t.uri, t.addedAt])).toEqual([['spotify:track:t1', null]])
  })
})
