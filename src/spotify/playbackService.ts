// SpotifyPlaybackService — owns all Spotify communication for the UI.
//
//   Spotify API → playbackService → Zustand stores → UI
//
// Sync strategy: poll /me/player every 5s while playing, 15s otherwise, never while
// the tab is hidden. Between polls the UI interpolates progress locally. After a
// command we resync quickly (Spotify takes a moment to reflect changes). A 429
// pauses everything until Retry-After has elapsed.

import { interpolateProgress } from '../lib/progress'
import { usePlayback } from '../store/playback'
import { useSession } from '../store/session'
import { notify, openDevices, closeDevices } from '../store/ui'
import * as api from './api'
import { logout } from './auth'
import { describeError, SpotifyError } from './errors'
import {
  normalizeDevice,
  normalizePlayback,
  normalizePlaylist,
  normalizeQueue,
  normalizeSearch,
  type MediaItem,
  type PlaybackState,
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

export function stopPlaybackSync() {
  running = false
  clearTimeout(timer)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('online', syncNow)
}

export function syncNow(): Promise<void> {
  if (!running) return Promise.resolve()
  inflight ??= pollOnce().finally(() => {
    inflight = null
    schedule()
  })
  return inflight
}

async function pollOnce() {
  const startedEpoch = epoch
  const started = Date.now()
  try {
    const raw = await api.getPlayback()
    if (startedEpoch !== epoch) return // a command landed mid-flight; the next poll is authoritative
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
    const friendly = handleError(e)
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

/** Central error policy. Returns the user-facing error, or null if handled silently. */
function handleError(e: unknown) {
  if (e instanceof DOMException && e.name === 'AbortError') return null
  if (e instanceof SpotifyError) {
    if (e.status === 429) backoffMs = e.retryAfterMs ?? 5000
    if (e.reason === 'AUTH_EXPIRED') {
      useSession.setState({ notice: describeError(e) })
      logout()
      return null
    }
  }
  return describeError(e)
}

function reportCommandError(e: unknown) {
  const friendly = handleError(e)
  if (!friendly) return
  notify(friendly.detail ? `${friendly.title}. ${friendly.detail}` : friendly.title, 'error')
  if (friendly.action === 'devices') openDevices()
}

// ── Playback commands ────────────────────────────────────────────────────────

async function command(run: () => Promise<unknown>, optimistic?: Partial<PlaybackState>): Promise<boolean> {
  epoch++
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
    if (optimistic) set({ playback: before.playback, syncedAt: before.syncedAt }) // roll back
    reportCommandError(e)
    return false
  } finally {
    resyncSoon()
  }
}

export function togglePlay() {
  const { playback } = get()
  return playback.isPlaying
    ? command(api.pausePlayback, { isPlaying: false })
    : command(() => api.startPlayback(), { isPlaying: true })
}

export const skipNext = () => command(api.skipToNext)
export const skipPrevious = () => command(api.skipToPrevious)

export function seekTo(ms: number) {
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
  const ok = await command(() => api.startPlayback(body))
  if (ok) notify(`Playing ${item.title}`)
  return ok
}

export async function queueItem(item: MediaItem) {
  const ok = await command(() => api.addToQueue(item.uri))
  if (ok) {
    notify(`Added ${item.title} to the queue`)
    if (get().queue.data) void refreshQueue()
  }
  return ok
}

export async function transferTo(deviceId: string, name: string) {
  const ok = await command(() => api.transferPlayback(deviceId))
  if (ok) {
    closeDevices()
    notify(`Playing on ${name}`)
    void refreshDevices()
  }
  return ok
}

// ── Queue, devices, catalog ──────────────────────────────────────────────────

export async function refreshQueue() {
  set({ queue: { ...get().queue, loading: true } })
  try {
    set({ queue: { data: normalizeQueue(await api.getQueue()), loading: false, error: null } })
  } catch (e) {
    set({ queue: { ...get().queue, loading: false, error: handleError(e) } })
  }
}

export async function refreshDevices() {
  set({ devices: { ...get().devices, loading: true } })
  try {
    const res = await api.getDevices()
    set({ devices: { data: (res?.devices ?? []).map(normalizeDevice), loading: false, error: null } })
  } catch (e) {
    set({ devices: { ...get().devices, loading: false, error: handleError(e) } })
  }
}

export async function searchCatalog(q: string, signal?: AbortSignal) {
  return normalizeSearch(await api.search(q, signal))
}

export async function fetchPlaylists() {
  const page = await api.getMyPlaylists()
  return (page?.items ?? []).filter((p): p is RawPlaylist => p != null).map((p) => normalizePlaylist(p))
}

/** Surface a caught catalog error the same way everywhere (and handle auth/429). */
export const explainError = (e: unknown) => handleError(e)

async function loadProfile() {
  try {
    const me = await api.getMe()
    useSession.setState({ displayName: me?.display_name ?? me?.id ?? null })
  } catch (e) {
    // Development Mode: accounts not on the app's user list get 403 everywhere.
    if (e instanceof SpotifyError && e.status === 403) {
      useSession.setState({ notice: describeError(new SpotifyError(403, e.message, 'NOT_REGISTERED')) })
      logout()
      return
    }
    handleError(e)
  }
}
