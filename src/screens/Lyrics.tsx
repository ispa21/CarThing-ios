import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { back, linkHandler } from '../app/router'
import { PlayKey } from '../app/Transport'
import { DEMO_TRACK } from '../lyrics/demo'
import { seekDemo, toggleDemo, useDemoClock } from '../lyrics/demoClock'
import { lyricsEngine } from '../lyrics/engine'
import { followReducer, isScrollKey, shouldAutoScroll, showJumpButton } from '../lyrics/follow'
import { canTimeSync, type PlaybackSource } from '../lyrics/policy'
import { resolveLyrics, type ResolvedLyrics } from '../lyrics/resolver'
import { seekTo, togglePlay } from '../spotify/playbackService'
import { usePlayback } from '../store/playback'
import { LYRIC_SIZES, useSettings } from '../store/settings'
import { demoClock, spotifyClock, useClockValue } from '../ui/clock'
import { EmptyState } from '../ui/Feedback'
import { Icon } from '../ui/Icon'
import { Scrubber } from '../ui/Scrubber'

type LyricsState = { status: 'loading' } | { status: 'none' } | { status: 'ready'; lyrics: ResolvedLyrics }

const HIDE_CONTROLS_MS = 3200
const NO_LINES: never[] = []
/** Where the current line rests, as a fraction of the reader's height. */
const FOCUS_LINE = 0.36

export function LyricsScreen({ source }: { source: PlaybackSource }) {
  const demo = source === 'demo'
  const clock = demo ? demoClock : spotifyClock

  const spotify = usePlayback(
    useShallow((s) => ({
      has: s.hasPlayback,
      trackId: s.playback.trackId,
      title: s.playback.title,
      artist: s.playback.artist,
      durationMs: s.playback.durationMs,
      isPlaying: s.playback.isPlaying,
      cantToggle: s.playback.isPlaying ? s.playback.disallows.pausing : s.playback.disallows.resuming,
      cantSeek: s.playback.disallows.seeking,
    })),
  )
  const demoPlaying = useDemoClock((s) => s.isPlaying)
  const track = demo
    ? { id: 'demo', title: DEMO_TRACK.title, artist: DEMO_TRACK.artist, durationMs: DEMO_TRACK.durationMs, isPlaying: demoPlaying }
    : { id: spotify.trackId, title: spotify.title, artist: spotify.artist, durationMs: spotify.durationMs, isPlaying: spotify.isPlaying }

  // ── Resolve lyrics for the current track ──
  // `resolved` remembers which track it belongs to, so "loading" is derived, not stored.
  const trackKey = track.title ? `${track.title}\u0000${track.artist ?? ''}` : null
  const [resolved, setResolved] = useState<{ key: string; lyrics: ResolvedLyrics | null } | null>(null)
  useEffect(() => {
    if (!trackKey || !track.title) return
    let cancelled = false
    resolveLyrics({ title: track.title, artist: track.artist ?? '', durationMs: track.durationMs }).then((lyrics) => {
      if (!cancelled) setResolved({ key: trackKey, lyrics })
    })
    return () => {
      cancelled = true
    }
  }, [trackKey, track.title, track.artist, track.durationMs])

  const state: LyricsState = !trackKey
    ? { status: 'none' }
    : resolved?.key !== trackKey
      ? { status: 'loading' }
      : resolved.lyrics
        ? { status: 'ready', lyrics: resolved.lyrics }
        : { status: 'none' }

  const lines = state.status === 'ready' ? state.lyrics.lines : NO_LINES
  // Timed follow only when the lyrics have stamps AND the clock isn't Spotify audio (policy.ts).
  const timed = state.status === 'ready' && state.lyrics.synced && canTimeSync(source)

  const deriveIndex = useCallback(
    (ms: number, isPlaying: boolean) => (timed ? lyricsEngine({ lyrics: lines, playbackPositionMs: ms, isPlaying }).currentIndex : -1),
    [timed, lines],
  )
  const current = useClockValue(clock, deriveIndex, timed)

  // ── Follow / manual scroll ──
  const autoScroll = useSettings((s) => s.autoScroll)
  const [mode, dispatch] = useReducer(followReducer, 'following')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => dispatch({ type: 'trackChange' }), [track.id])

  const scrollToCurrent = useCallback(
    (smooth: boolean) => {
      const scroller = scrollerRef.current
      const line = scroller?.querySelector<HTMLElement>(`[data-index="${Math.max(0, current)}"]`)
      if (!scroller || !line) return
      scroller.scrollTo({
        top: line.offsetTop - scroller.clientHeight * FOCUS_LINE,
        behavior: smooth && !reduceMotion ? 'smooth' : 'auto',
      })
    },
    [current, reduceMotion],
  )

  useEffect(() => {
    if (shouldAutoScroll(mode, { timed, autoScroll })) scrollToCurrent(true)
  }, [mode, timed, autoScroll, scrollToCurrent])

  const userScrolled = () => dispatch({ type: 'userScroll' })
  const jump = () => {
    dispatch({ type: 'jump' })
    scrollToCurrent(true)
  }

  // ── Controls fade away while reading ──
  // Any interaction reveals the controls; they only auto-hide while playing.
  const [idle, setIdle] = useState(false)
  const [activity, setActivity] = useState(0)
  const lastPoke = useRef(0)
  const poke = useCallback(() => {
    const now = performance.now()
    if (now - lastPoke.current < 400) return // pointermove fires constantly; don't re-render on each
    lastPoke.current = now
    setIdle(false)
    setActivity((a) => a + 1)
  }, [])
  useEffect(() => {
    if (!track.isPlaying) return
    const t = setTimeout(() => setIdle(true), HIDE_CONTROLS_MS)
    return () => clearTimeout(t)
  }, [track.isPlaying, activity])
  const controls = !track.isPlaying || !idle

  // The demo clock runs by itself; start it when the demo opens, pause on leave.
  useEffect(() => {
    if (!demo) return
    if (!useDemoClock.getState().isPlaying) toggleDemo()
    return () => {
      if (useDemoClock.getState().isPlaying) toggleDemo()
    }
  }, [demo])

  const sizeIndex = useSettings((s) => s.lyricSize)
  const size = LYRIC_SIZES[sizeIndex]
  const cycleSize = () => useSettings.setState({ lyricSize: (sizeIndex + 1) % LYRIC_SIZES.length })

  const showJump = showJumpButton(mode, { timed, autoScroll, hasCurrent: current >= 0 })
  const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }

  return (
    <div className="lyrics" onPointerMove={poke} onPointerDown={poke} onKeyDown={poke} data-controls={controls || undefined}>
      <AnimatePresence>
        {controls && (
          <motion.header key="top" className="lyrics-top" {...fade}>
            <button className="icon-btn" onClick={() => back(demo ? '/' : '/now')} aria-label="Back">
              <Icon name="back" />
            </button>
            <div className="lyrics-track">
              <span className="lyrics-track-title">{track.title ?? 'Lyrics'}</span>
              {track.artist && <span className="lyrics-track-artist">{track.artist}</span>}
            </div>
            <button className="icon-btn" onClick={cycleSize} aria-label={`Text size: ${size.label}. Change`}>
              <Icon name="textSize" />
            </button>
          </motion.header>
        )}
      </AnimatePresence>

      <h1 className="sr-only">Lyrics{track.title ? `: ${track.title}` : ''}</h1>

      {!demo && !spotify.has ? (
        <div className="lyrics-empty">
          <EmptyState title="Nothing playing" detail="Lyrics show up here for the song that's playing.">
            <a className="btn" href="/lyrics/demo" onClick={linkHandler}>
              See the demo
            </a>
          </EmptyState>
        </div>
      ) : state.status === 'none' ? (
        <div className="lyrics-empty">
          <EmptyState
            title="Lyrics unavailable"
            detail="PartyDeck doesn't have a licensed lyrics source for this song yet. The demo shows how the reader works."
          >
            <a className="btn" href="/lyrics/demo" onClick={linkHandler}>
              See the demo
            </a>
          </EmptyState>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="lyrics-scroll"
          tabIndex={0}
          aria-label="Lyrics"
          aria-busy={state.status === 'loading'}
          onWheel={userScrolled}
          onTouchMove={userScrolled}
          onKeyDown={(e) => isScrollKey(e.key) && userScrolled()}
        >
          <ol className="lyrics-lines" data-timed={timed || undefined} style={{ '--lyrics-scale': size.scale } as CSSProperties}>
            {lines.map((l, i) => (
              <li
                key={i}
                data-index={i}
                data-state={timed ? (i === current ? 'current' : i < current ? 'past' : 'next') : undefined}
                aria-current={i === current || undefined}
                className={l.text ? undefined : 'gap'}
                aria-hidden={l.text ? undefined : true}
              >
                {l.text}
              </li>
            ))}
          </ol>
          {state.status === 'ready' && <p className="lyrics-credit">Lyrics: {state.lyrics.providerName}</p>}
        </div>
      )}

      <AnimatePresence>
        {showJump && (
          <motion.button
            key="jump"
            className="jump"
            onClick={jump}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <Icon name="target" size={18} />
            Jump to current
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {controls && (demo || spotify.has) && (
          <motion.footer key="bottom" className="lyrics-bottom" {...fade}>
            <PlayKey
              small
              isPlaying={track.isPlaying}
              onPress={demo ? toggleDemo : togglePlay}
              disabled={!demo && spotify.cantToggle}
            />
            <div className="lyrics-scrub">
              <Scrubber
                clock={clock}
                durationMs={track.durationMs}
                onSeek={demo ? seekDemo : seekTo}
                disabled={!demo && spotify.cantSeek}
                label="Song position"
              />
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  )
}
