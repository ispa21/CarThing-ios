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

/**
 * MIX's crossfade move. Spotify plays one track at a time, so this is a real move, not
 * a blend: dip the level, skip to the next track, seek it to its in-cue, bring the level
 * back. Four requests, spaced so Spotify has applied each before the next. `silent` for
 * the automatic move at the out-cue (a timer, not a gesture: no feedback from timers).
 */
export async function crossfadeToNext({ inMs = 0, silent = false }: { inMs?: number; silent?: boolean } = {}) {
  if (!can('skippingNext')) return false
  if (!silent) feedback.play('next-track')
  const level = get().playback.volume
  const dip = level === null ? null : Math.round(level * 0.3)
  if (dip !== null) await command(() => api.setVolume(dip), { volume: dip })
  await wait(350)
  const skipped = await command(api.skipToNext, { progressMs: 0 })
  if (skipped && inMs > 0) {
    await wait(450) // let Spotify switch tracks, or the seek lands on the old one
    await command(() => api.seekToPosition(inMs), { progressMs: inMs })
  }
  if (level !== null) {
    await wait(250)
    await command(() => api.setVolume(level), { volume: level })
  }
  return skipped
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

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
export async function playUris(uris: string[], label: string) {
  if (!uris.length) return false
  feedback.play('primary-press')
  const ok = await command(() => api.startPlayback({ uris: uris.slice(0, 100) }))
  if (ok) notify(`Playing ${label}`)
  return ok
}

/**
 * Saves a list of tracks as a new private playlist (needs playlist-modify-private).
 * Resolves to the playlist's Spotify link, or null if it failed (the error is announced).
 */
export async function saveAsPlaylist(name: string, description: string, uris: string[]) {
  if (!uris.length) return null
  feedback.play('select') // the press; the confirmation follows once Spotify has it
  try {
    const created = await api.createPlaylist(name, description)
    if (!created?.id) throw new SpotifyError(0, 'No playlist returned')
    for (let i = 0; i < uris.length; i += 100) await api.addPlaylistItems(created.id, uris.slice(i, i + 100))
    feedback.play('queue-add')
    notify(`Saved “${name}” to your Spotify playlists`)
    return { uri: created.uri, url: normalizeUrl(created.external_urls?.spotify) }
  } catch (e) {
    reportCommandError(e)
    return null
  }
}

const normalizeUrl = (url: string | undefined) => (url && url.startsWith('https://open.spotify.com/') ? url : null)

// ── Library scan (Stories, Builder, Transmission) ────────────────────────────

/** Caps keep a scan to a few hundred requests, well inside Spotify's rate limits. */
const SCAN = { likedPages: 60, playlists: 150, pagesPerPlaylist: 20, gapMs: 120 }
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

export interface ScanProgress {
  phase: 'liked' | 'playlists'
  done: number
  total: number
}

/**
 * Reads your liked songs and your playlists' contents into one index. Slow on purpose
 * (a short gap between requests). Playlists Spotify won't open for this app are skipped
 * and counted. Null when this session lacks the scope (reconnect to fix).
 */
export async function scanLibrary(onProgress: (p: ScanProgress) => void, signal?: AbortSignal): Promise<(LibraryIndex & { skipped: number }) | null> {
  if (!hasScope('user-library-read')) return null
  const alive = stillCurrent()
  const map = new Map<string, LibraryTrack>()
  const playlists: LibraryPlaylist[] = []
  let skipped = 0
  const stop = () => signal?.aborted || !alive()

  for (let page = 0, total = 1; page < Math.min(total, SCAN.likedPages); page++) {
    if (stop()) return null
    const raw = await api.getSavedTracks(page * 50)
    total = Math.ceil((raw?.total ?? 0) / 50)
    for (const t of normalizeSavedTracks(raw)) addToIndex(map, t, { liked: true, addedAt: t.addedAt })
    onProgress({ phase: 'liked', done: page + 1, total: Math.min(total, SCAN.likedPages) })
    await pause(SCAN.gapMs)
  }

  const lists: RawPlaylist[] = []
  for (let offset = 0, total = 1; offset < Math.min(total, SCAN.playlists); offset += 50) {
    if (stop()) return null
    const raw = await api.getMyPlaylists(offset, 50)
    total = raw?.total ?? 0
    lists.push(...(raw?.items ?? []).filter((p): p is RawPlaylist => p != null))
    await pause(SCAN.gapMs)
  }
  const picked = lists.slice(0, SCAN.playlists)
  for (const [i, p] of picked.entries()) {
    let count = 0
    try {
      for (let page = 0, total = 1; page < Math.min(total, SCAN.pagesPerPlaylist); page++) {
        if (stop()) return null
        const raw = await api.getPlaylistItems(p.id, page * 50)
        total = Math.ceil((raw?.total ?? 0) / 50)
        for (const t of normalizePlaylistItems(raw)) {
          addToIndex(map, t, { playlist: p.id, addedAt: t.addedAt })
          count++
        }
        await pause(SCAN.gapMs)
      }
      playlists.push({ id: p.id, name: p.name, count })
    } catch (e) {
      if (e instanceof SpotifyError && (e.status === 401 || e.status === 429)) throw e
      skipped++ // 403/404: Spotify won't share this playlist's contents with this app
    }
    onProgress({ phase: 'playlists', done: i + 1, total: picked.length })
  }
  return { tracks: [...map.values()], playlists, scannedAt: Date.now(), skipped }
}
