// SpotifyPlaybackService — owns all Spotify communication for the UI.
//
//   Spotify API → playbackService → Zustand stores → UI
//
// Sync strategy: poll /me/player every 5s while playing, 15s otherwise, never while
// the tab is hidden. Between polls the UI interpolates progress locally. After a
// command we resync quickly (Spotify takes a moment to reflect changes). A 429
// pauses everything until Retry-After has elapsed.
//
// Sensory feedback belongs to the *command* functions below (user-initiated, called
// synchronously from the gesture so iOS haptics work). Polling never plays feedback.

import { interpolateProgress } from '../lib/progress'
import { feedback } from '../sensory/feedback'
import { initialPlayback, selectCanToggle, usePlayback, type PlaybackStore } from '../store/playback'
import { useSession } from '../store/session'
import { notify, openDevices, closeDevices } from '../store/ui'
import * as api from './api'
import { isSpotifyUri } from '../history/match'
import { addToIndex, type LibraryIndex, type LibraryPlaylist, type LibraryTrack } from '../history/library'
import { hasScope, logout } from './auth'
import { describeError, SpotifyError } from './errors'
import {
  normalizeDevice,
  normalizePlayback,
  normalizePlaylist,
  normalizeQueue,
  normalizePlaylistItems,
  normalizeRecent,
  normalizeSavedTracks,
  normalizeSearch,
  normalizeTopArtists,
  normalizeTopTracks,
  type MediaItem,
  type PlaybackState,
  type RepeatMode,
} from './normalize'
import type { RawPlaylist } from './types'

const FAST_MS = 900
const PLAYING_MS = 5000
const IDLE_MS = 15_000

let running = false
let timer: ReturnType<typeof setTimeout> | undefined
let inflight: Promise<void> | null = null
let fastSyncs = 0
let backoffMs = 0
/** Bumped by every command so a poll that started before it can't undo the optimistic state. */
let epoch = 0
let commandsInFlight = 0
/** Bumped on stop (disconnect). Responses from an older generation are dropped. */
let generation = 0
const stillCurrent = () => {
  const g = generation
  return () => g === generation
}

const set = usePlayback.setState
const get = usePlayback.getState

// ── Lifecycle ────────────────────────────────────────────────────────────────

const onVisibility = () => (document.hidden ? clearTimeout(timer) : void syncNow())

export function startPlaybackSync() {
  if (running) return
  running = true
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('online', syncNow)
  void syncNow()
  void loadProfile()
}

/** Stops syncing and forgets all Spotify-derived state (runs on disconnect). */
export function stopPlaybackSync() {
  running = false
  generation++
  clearTimeout(timer)
  inflight = null // its response is dropped by the generation check
  fastSyncs = 0
  backoffMs = 0
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('online', syncNow)
  set(initialPlayback, true)
}

export function syncNow(): Promise<void> {
  if (!running) return Promise.resolve()
  if (!inflight) {
    const poll: Promise<void> = pollOnce().finally(() => {
      if (inflight === poll) inflight = null // a restart may already own the slot
      schedule()
    })
    inflight = poll
  }
  return inflight
}

async function pollOnce() {
  const alive = stillCurrent()
  const startedEpoch = epoch
  const started = Date.now()
  try {
    const raw = await api.getPlayback()
    // A command started or is still in flight: this snapshot may predate it. The next poll is authoritative.
    if (!alive() || startedEpoch !== epoch || commandsInFlight > 0) return
    const before = get().playback.trackId
    const playback = normalizePlayback(raw)
    backoffMs = 0
    set({
      playback,
      syncedAt: (started + Date.now()) / 2, // halfway through the round trip
      loaded: true,
      hasPlayback: Boolean(raw?.item),
      syncError: null,
    })
    if (before !== playback.trackId && get().queue.data) void refreshQueue()
  } catch (e) {
    if (!alive()) return
    const friendly = explainError(e)
    if (friendly) set({ syncError: friendly, loaded: true })
  }
}

function schedule() {
  clearTimeout(timer)
  if (!running || document.hidden) return
  const { playback, syncedAt } = get()
  let delay = playback.isPlaying ? PLAYING_MS : IDLE_MS
  if (fastSyncs > 0) {
    fastSyncs--
    delay = FAST_MS
  }
  if (playback.isPlaying && playback.durationMs) {
    // Catch the track change right when the song ends instead of up to 5s later.
    const remaining = playback.durationMs - interpolateProgress(playback, syncedAt, Date.now())
    delay = Math.min(delay, Math.max(FAST_MS, remaining + 500))
  }
  timer = setTimeout(syncNow, Math.max(delay, backoffMs))
}

function resyncSoon() {
  fastSyncs = 2
  if (!inflight) {
    clearTimeout(timer)
    timer = setTimeout(syncNow, Math.max(500, backoffMs))
  }
}

// ── Errors ───────────────────────────────────────────────────────────────────

/** Central error policy (auth, 429 backoff). Returns the user-facing error, or null if handled silently. */
export function explainError(e: unknown) {
  if (e instanceof DOMException && e.name === 'AbortError') return null
  if (e instanceof SpotifyError) {
    if (e.status === 429) backoffMs = e.retryAfterMs ?? 5000
    if (e.reason === 'AUTH_EXPIRED' || e.reason === 'NOT_REGISTERED') {
      logout(e) // the Connect screen explains why
      return null
    }
  }
  return describeError(e)
}

function reportCommandError(e: unknown) {
  const friendly = explainError(e)
  if (!friendly) return
  feedback.play('playback-error')
  notify(friendly.detail ? `${friendly.title}. ${friendly.detail}` : friendly.title, 'error')
  if (friendly.action === 'devices') openDevices()
}

// ── Playback commands ────────────────────────────────────────────────────────

async function command(run: () => Promise<unknown>, optimistic?: Partial<PlaybackState>): Promise<boolean> {
  epoch++
  commandsInFlight++
  const alive = stillCurrent()
  const before = get()
  if (optimistic) {
    const now = Date.now()
    set({
      playback: { ...before.playback, progressMs: interpolateProgress(before.playback, before.syncedAt, now), ...optimistic },
      syncedAt: now,
    })
  }
  try {
    await run()
    return true
  } catch (e) {
    if (!alive()) return false
    if (optimistic) set({ playback: before.playback, syncedAt: before.syncedAt }) // roll back
    reportCommandError(e)
    return false
  } finally {
    commandsInFlight--
    if (alive()) resyncSoon()
  }
}

// Every entry point (buttons, keyboard) checks Spotify's `disallows` here, so
// nothing sends a command Spotify has said it will reject.
const can = (action: keyof PlaybackState['disallows']) => get().hasPlayback && !get().playback.disallows[action]

export function togglePlay() {
  if (!selectCanToggle(get())) return Promise.resolve(false)
  const playing = get().playback.isPlaying
  feedback.play(playing ? 'pause' : 'play')
  return playing ? command(api.pausePlayback, { isPlaying: false }) : command(() => api.startPlayback(), { isPlaying: true })
}

export function skipNext() {
  if (!can('skippingNext')) return Promise.resolve(false)
  feedback.play('next-track')
  // The new song starts at 0 — show that now; art and title follow the resync. Rolled back on failure.
  return command(api.skipToNext, { progressMs: 0 })
}

export function skipPrevious() {
  if (!can('skippingPrev')) return Promise.resolve(false)
  feedback.play('previous-track')
  return command(api.skipToPrevious, { progressMs: 0 }) // previous restarts or goes back: either way, 0
}

export function toggleShuffle() {
  if (!can('shuffling')) return Promise.resolve(false)
  feedback.play('toggle')
  const next = !get().playback.shuffle
  return command(() => api.setShuffle(next), { shuffle: next })
}

/** Off → repeat all (context) → repeat one (track) → off, like Spotify; skips a mode Spotify disallows. */
export function nextRepeatMode(current: RepeatMode, d: Pick<PlaybackState['disallows'], 'repeatingContext' | 'repeatingTrack'>): RepeatMode | null {
  const order: RepeatMode[] = ['off', 'context', 'track']
  for (let step = 1; step <= 2; step++) {
    const next = order[(order.indexOf(current) + step) % 3]
    if ((next === 'context' && d.repeatingContext) || (next === 'track' && d.repeatingTrack)) continue
    return next
  }
  return null
}

export function cycleRepeat() {
  const { playback, hasPlayback } = get()
  const next = hasPlayback ? nextRepeatMode(playback.repeat, playback.disallows) : null
  if (!next) return Promise.resolve(false)
  feedback.play('toggle')
  return command(() => api.setRepeat(next), { repeat: next })
}

/** `silent`: the gesture already played its cue (keyboard changes settle after a debounce). */
export function setVolume(percent: number, { silent = false }: { silent?: boolean } = {}) {
  const { playback, hasPlayback } = get()
  if (!hasPlayback || playback.volume === null) return Promise.resolve(false)
  const target = Math.max(0, Math.min(100, Math.round(percent)))
  if (!silent) feedback.play('tick')
  return command(() => api.setVolume(target), { volume: target })
}

/** `silent`: the gesture already played its cue (keyboard seeks settle after a debounce). */
export function seekTo(ms: number, { silent = false }: { silent?: boolean } = {}) {
  if (!can('seeking')) return Promise.resolve(false)
  if (!silent) feedback.play('seek')
  const { durationMs } = get().playback
  const target = Math.max(0, Math.min(ms, durationMs || ms))
  return command(() => api.seekToPosition(target), { progressMs: target })
}

export const seekBy = (deltaMs: number) => {
  const { playback, syncedAt } = get()
  return seekTo(interpolateProgress(playback, syncedAt, Date.now()) + deltaMs)
}

export async function playItem(item: MediaItem) {
  const body = item.kind === 'track' || item.kind === 'episode' ? { uris: [item.uri] } : { context_uri: item.uri }
  feedback.play('primary-press')
  const ok = await command(() => api.startPlayback(body))
  if (ok) notify(`Playing ${item.title}`)
  return ok
}

export async function queueItem(item: MediaItem) {
  feedback.play('select') // the press; confirmation follows once Spotify accepts it
  const ok = await command(() => api.addToQueue(item.uri))
  if (ok) {
    feedback.play('queue-add')
    notify(`Added ${item.title} to the queue`)
    if (get().queue.data) void refreshQueue()
  }
  return ok
}

export async function transferTo(deviceId: string, name: string) {
  feedback.play('select')
  const ok = await command(() => api.transferPlayback(deviceId))
  if (ok) {
    feedback.play('device-connected')
    closeDevices()
    notify(`Playing on ${name}`)
    void refreshDevices()
  }
  return ok
}

// ── Queue, devices, catalog ──────────────────────────────────────────────────

type Loadable = 'queue' | 'devices'

async function load<K extends Loadable>(key: K, fetch: () => Promise<PlaybackStore[K]['data']>) {
  const alive = stillCurrent()
  const patch = (value: PlaybackStore[K]) => set({ [key]: value } as Pick<PlaybackStore, K>)
  patch({ ...get()[key], loading: true })
  try {
    const data = await fetch()
    if (alive()) patch({ data, loading: false, error: null } as PlaybackStore[K])
  } catch (e) {
    if (alive()) patch({ ...get()[key], loading: false, error: explainError(e) })
  }
}

export const refreshQueue = () => load('queue', async () => normalizeQueue(await api.getQueue()))
export const refreshDevices = () => load('devices', async () => ((await api.getDevices())?.devices ?? []).map(normalizeDevice))

export async function searchCatalog(q: string, signal?: AbortSignal) {
  return normalizeSearch(await api.search(q, signal))
}

export async function fetchPlaylists() {
  const page = await api.getMyPlaylists()
  return (page?.items ?? []).filter((p): p is RawPlaylist => p != null).map((p) => normalizePlaylist(p))
}

async function loadProfile() {
  const alive = stillCurrent()
  try {
    const me = await api.getMe()
    if (alive()) useSession.setState({ displayName: me?.display_name ?? me?.id ?? null })
  } catch (e) {
    if (alive()) explainError(e) // "Connected as" is optional; NOT_REGISTERED / auth errors sign out
  }
}

// ── Lists: recently played, play a set, save a set ───────────────────────────

/** Spotify's last 50 plays (needs user-read-recently-played). Null when this session lacks the scope. */
export async function fetchRecentPlays() {
  if (!hasScope('user-read-recently-played')) return null
  return normalizeRecent(await api.getRecentlyPlayed())
}

/** Plays a list of tracks from the top (a crate, a session, a story's set). */
export async function playUris(all: string[], label: string, { silent = false }: { silent?: boolean } = {}) {
  const uris = all.filter(isSpotifyUri) // imported-by-name plays have no Spotify link and are never sent
  if (!uris.length) return false
  if (!silent) feedback.play('primary-press') // silent: the caller already played it in the gesture
  const ok = await command(() => api.startPlayback({ uris: uris.slice(0, 100) }))
  if (ok) notify(`Playing ${label}`)
  return ok
}

/**
 * Saves a list of tracks as a new playlist: private (playlist-modify-private), or public on
 * your profile when asked (playlist-modify-public).
 * Resolves to the playlist's Spotify link, or null if it failed (the error is announced).
 */
export async function saveAsPlaylist(name: string, description: string, all: string[], { isPublic = false }: { isPublic?: boolean } = {}) {
  const uris = all.filter(isSpotifyUri)
  if (!uris.length) return null
  if (isPublic && !hasScope('playlist-modify-public')) return null // the key offers a reconnect instead
  feedback.play('select') // the press; the confirmation follows once Spotify has it
  try {
    const created = await api.createPlaylist(name, description, isPublic)
    if (!created?.id) throw new SpotifyError(0, 'No playlist returned')
    for (let i = 0; i < uris.length; i += 100) await api.addPlaylistItems(created.id, uris.slice(i, i + 100))
    feedback.play('saved')
    notify(isPublic ? `Published “${name}” on your Spotify profile` : `Saved “${name}” to your Spotify playlists`)
    return { uri: created.uri, url: normalizeUrl(created.external_urls?.spotify) }
  } catch (e) {
    reportCommandError(e)
    return null
  }
}

const normalizeUrl = (url: string | undefined) => (url && url.startsWith('https://open.spotify.com/') ? url : null)

// ── Library scan (Stories, Builder, Transmission) ────────────────────────────

/**
 * The first read takes everything: every liked song, every playlist, every page. Later
 * reads are small — liked songs newest-first until one we already know, and only the
 * playlists whose snapshot changed. Requests are spaced because Development Mode apps
 * get a small rate limit, shared with the playback poll.
 */
const SCAN = { gapMs: 250, maxWaits: 12, maxPlaylists: 2000, checkpointEvery: 8, retryUnreadableDays: 7 }
const pause = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => (clearTimeout(t), resolve()), { once: true })
  })

export interface ScanProgress {
  phase: 'liked' | 'playlists' | 'waiting'
  done: number
  total: number
  /** The playlist being read, and how far into it. */
  name?: string
  page?: number
  pages?: number
  /** While waiting: seconds until the scan carries on. */
  waitS?: number
}

export interface ScanResult extends LibraryIndex {
  /** Playlists Spotify wouldn't open for this app. */
  skipped: number
  /** What went wrong along the way, in Spotify's words. The scan kept what it could. */
  problems: string[]
  /** How much this read actually had to do. */
  delta: { newLiked: number; changed: number; unchanged: number; fullLiked: boolean }
}

const said = (e: unknown) => (e instanceof SpotifyError ? `${e.status || 'network'} ${e.message}`.trim() : String(e))
const DAY_MS = 86_400_000

/**
 * Reads (or refreshes) your library into one index. Pass the last index to make it
 * incremental. `onCheckpoint` receives the index-so-far every few playlists, so a long
 * first read survives leaving the screen or losing the connection. Null when this
 * session lacks the scope (reconnect to fix) or the scan was abandoned.
 */
export async function scanLibrary(
  prev: LibraryIndex | null,
  onProgress: (p: ScanProgress) => void,
  signal?: AbortSignal,
  onCheckpoint?: (index: LibraryIndex) => void,
): Promise<ScanResult | null> {
  if (!hasScope('user-library-read')) return null
  const alive = stillCurrent()
  const stop = () => Boolean(signal?.aborted) || !alive()
  const map = new Map<string, LibraryTrack>((prev?.tracks ?? []).map((t) => [t.uri, { ...t, playlists: [...t.playlists] }]))
  const lists = new Map<string, LibraryPlaylist>()
  const problems: string[] = []
  const delta = { newLiked: 0, changed: 0, unchanged: 0, fullLiked: !prev }
  let skipped = 0

  const index = (): LibraryIndex => ({ tracks: [...map.values()], playlists: [...lists.values()], followed: prev?.followed, top: prev?.top, scannedAt: Date.now() })

  /** One request, waiting out rate limits. Other errors are the caller's. */
  async function call<T>(fn: () => Promise<T>, resume: ScanProgress): Promise<T> {
    for (let waits = 0; ; waits++) {
      try {
        const r = await fn()
        await pause(SCAN.gapMs, signal)
        return r
      } catch (e) {
        if (!(e instanceof SpotifyError) || e.status !== 429 || waits >= SCAN.maxWaits) throw e
        const ms = Math.min(Math.max(e.retryAfterMs ?? 5000, 2000), 60_000)
        onProgress({ ...resume, phase: 'waiting', waitS: Math.ceil(ms / 1000) })
        await pause(ms + 250, signal)
        if (stop()) throw new DOMException('Scan abandoned', 'AbortError')
        onProgress(resume)
      }
    }
  }
  const fatal = (e: unknown) => (e instanceof SpotifyError && e.status === 401) || e instanceof DOMException

  try {
    // ── Liked songs: newest first. Incremental reads stop at the first one we know. ──
    const readLiked = async (full: boolean) => {
      for (let page = 0, total = 1; page < total; page++) {
        if (stop()) throw new DOMException('Scan abandoned', 'AbortError')
        const raw = await call(() => api.getSavedTracks(page * 50), { phase: 'liked', done: page, total })
        total = Math.ceil((raw?.total ?? 0) / 50)
        let known = false
        for (const t of normalizeSavedTracks(raw)) {
          if (map.get(t.uri)?.liked) known = true
          else delta.newLiked++
          addToIndex(map, t, { liked: true, addedAt: t.addedAt })
        }
        onProgress({ phase: 'liked', done: page + 1, total })
        if (!full && known) return raw?.total ?? 0
      }
      return -1
    }
    try {
      const total = await readLiked(!prev)
      const liked = [...map.values()].filter((t) => t.liked).length
      if (prev && total >= 0 && liked !== total) {
        // Songs were unliked (or the count drifted): re-read liked songs from scratch.
        for (const t of map.values()) t.liked = false
        delta.fullLiked = true
        await readLiked(true)
      }
    } catch (e) {
      if (fatal(e)) throw e
      problems.push(`liked songs: ${said(e)}`)
    }

    // ── Every playlist you own or follow. ──
    const all: RawPlaylist[] = []
    try {
      for (let offset = 0, total = 1; offset < Math.min(total, SCAN.maxPlaylists); offset += 50) {
        if (stop()) throw new DOMException('Scan abandoned', 'AbortError')
        const raw = await call(() => api.getMyPlaylists(offset, 50), { phase: 'playlists', done: 0, total: 1 })
        total = raw?.total ?? 0
        all.push(...(raw?.items ?? []).filter((p): p is RawPlaylist => p != null))
      }
    } catch (e) {
      if (fatal(e)) throw e
      problems.push(`your playlists: ${said(e)}`)
      // Without the list we can't tell what changed: keep every playlist as it was.
      for (const p of prev?.playlists ?? []) lists.set(p.id, p)
    }

    const strip = (id: string) => {
      for (const t of map.values()) if (t.playlists.includes(id)) t.playlists = t.playlists.filter((x) => x !== id)
    }
    let sinceCheckpoint = 0
    for (const [i, p] of all.entries()) {
      if (stop()) throw new DOMException('Scan abandoned', 'AbortError')
      const old = prev?.playlists.find((x) => x.id === p.id)
      const snapshot = p.snapshot_id ?? null
      const same = Boolean(old && snapshot && old.snapshot === snapshot)
      if (same && old!.readable !== false) {
        lists.set(p.id, { ...old!, name: p.name })
        delta.unchanged++
        onProgress({ phase: 'playlists', done: i + 1, total: all.length, name: p.name })
        continue
      }
      if (same && old!.readable === false && Date.now() - (old!.checkedAt ?? 0) < SCAN.retryUnreadableDays * DAY_MS) {
        lists.set(p.id, { ...old!, name: p.name })
        skipped++
        continue
      }
      if (old) strip(p.id)
      let count = 0
      try {
        for (let page = 0, total = 1; page < total; page++) {
          if (stop()) throw new DOMException('Scan abandoned', 'AbortError')
          const at = { phase: 'playlists' as const, done: i, total: all.length, name: p.name, page: page + 1, pages: total }
          onProgress(at)
          const raw = await call(() => api.getPlaylistItems(p.id, page * 50), at)
          total = Math.ceil((raw?.total ?? 0) / 50)
          for (const t of normalizePlaylistItems(raw)) {
            addToIndex(map, t, { playlist: p.id, addedAt: t.addedAt })
            count++
          }
        }
        lists.set(p.id, { id: p.id, name: p.name, count, snapshot: snapshot ?? undefined, readable: true, checkedAt: Date.now() })
        delta.changed++
      } catch (e) {
        if (fatal(e)) throw e
        skipped++ // usually 403: Spotify only opens playlists you own or collaborate on to Development Mode apps
        strip(p.id)
        lists.set(p.id, { id: p.id, name: p.name, count: 0, snapshot: snapshot ?? undefined, readable: false, checkedAt: Date.now() })
        if (!(e instanceof SpotifyError && (e.status === 403 || e.status === 404))) problems.push(`${p.name}: ${said(e)}`)
      }
      onProgress({ phase: 'playlists', done: i + 1, total: all.length, name: p.name })
      if (++sinceCheckpoint >= SCAN.checkpointEvery) {
        sinceCheckpoint = 0
        onCheckpoint?.(index())
      }
    }
    // Playlists that are gone (deleted, unfollowed) take their memberships with them.
    if (all.length) for (const p of prev?.playlists ?? []) if (!lists.has(p.id)) strip(p.id)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      // Keep what was read so the next read picks up from here.
      if (map.size) onCheckpoint?.(index())
      return null
    }
    // Signed out, or out of patience with the rate limit: keep what was read.
    problems.push(said(e))
  }

  // Your past, as Spotify ranks it: top tracks and artists over three horizons.
  let top: LibraryIndex['top'] = prev?.top
  if (hasScope('user-top-read') && !stop() && (!prev?.top || Date.now() - prev.top.fetchedAt > DAY_MS)) {
    try {
      const ranges = [
        ['short', 'short_term'],
        ['medium', 'medium_term'],
        ['long', 'long_term'],
      ] as const
      const next = { fetchedAt: Date.now() } as NonNullable<LibraryIndex['top']>
      for (const [name, range] of ranges) {
        const tracks = [...normalizeTopTracks(await call(() => api.getTopTracks(range, 0), { phase: 'playlists', done: 0, total: 1, name: `your top tracks (${name})` })), ...normalizeTopTracks(await call(() => api.getTopTracks(range, 49), { phase: 'playlists', done: 0, total: 1 }))]
        const artists = [...normalizeTopArtists(await call(() => api.getTopArtists(range, 0), { phase: 'playlists', done: 0, total: 1 })), ...normalizeTopArtists(await call(() => api.getTopArtists(range, 49), { phase: 'playlists', done: 0, total: 1 }))]
        const seen = new Set<string>()
        next[name] = {
          tracks: tracks.filter((t) => !seen.has(t.uri) && seen.add(t.uri)).map(({ addedAt: _a, ...t }) => t),
          artists: [...new Set(artists)],
        }
      }
      top = next
    } catch (e) {
      if (!(e instanceof DOMException)) problems.push(`top tracks: ${said(e)}`)
    }
  }

  const followed: string[] = []
  if (hasScope('user-follow-read') && !stop()) {
    try {
      let after: string | undefined
      for (let page = 0; page < 40; page++) {
        const raw = await call(() => api.getFollowedArtists(after), { phase: 'playlists', done: 0, total: 1 })
        for (const a of raw?.artists.items ?? []) if (a?.name) followed.push(a.name)
        after = raw?.artists.cursors?.after ?? undefined
        if (!after || !raw?.artists.next) break
      }
    } catch (e) {
      if (!(e instanceof DOMException)) problems.push(`followed artists: ${said(e)}`)
    }
  }
  // A track that's neither liked nor in any playlist has left your library.
  for (const [uri, t] of map) if (!t.liked && !t.playlists.length) map.delete(uri)
  return { ...index(), followed: followed.length ? followed : prev?.followed, top, skipped, problems, delta }
}
